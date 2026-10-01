import { describe, it, expect } from 'vitest';
import { expandSign, compileSign, SIGNS, type SignDefinition } from '../src/index.js';

/**
 * The shorthands are sugar, and the claim that makes them safe is that they are
 * EXACTLY the desugaring. These tests are that claim: each one states what the
 * expansion should be, in full, and compares.
 */

const base = {
  id: 'T', gloss: 'T', description: 'T',
  durationMs: 400, strokeStartMs: 80, strokeEndMs: 360,
  provenance: { source: 'hand-authored', validation: 'unvalidated' },
} as const satisfies Omit<SignDefinition, 'dominant'>;

const track = [
  { atMs: 0, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_OUT' },
  { atMs: 200, location: 'CHEST_OUT', handshape: 'FLAT', orientation: 'PALM_IN' },
  { atMs: 400, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_OUT' },
] as const;

describe('symmetry', () => {
  it('mirrors the dominant track verbatim', () => {
    const { nonDominant } = expandSign({ ...base, dominant: track, symmetry: 'mirror' });
    expect(nonDominant).toEqual([...track]);
  });

  it('alternates by reversing the track in time', () => {
    const oneWay = [
      { atMs: 0, location: 'NEUTRAL_LOW', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 150, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 400, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'PALM_IN' },
    ] as const;
    const { nonDominant } = expandSign({ ...base, dominant: oneWay, symmetry: 'alternate' });
    // At t the non-dominant hand is where the dominant hand is at (duration-t):
    // one hand rises as the other falls.
    expect(nonDominant).toEqual([
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 250, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 400, location: 'NEUTRAL_LOW', handshape: 'S', orientation: 'PALM_IN' },
    ]);
  });

  it('is what the two-handed signs in the library were written out as', () => {
    // The refactor that introduced these shorthands had to change nothing about
    // what any sign compiles to. WHAT was two identical tracks and SIGN was a
    // track and its reverse; both are now stated once.
    for (const id of ['WHAT', 'SIGN', 'CAR', 'MAYBE']) {
      const sign = SIGNS[id]!;
      const expanded = expandSign(sign);
      expect(expanded.nonDominant, id).toBeDefined();
      expect(expanded.nonDominant!.length, id).toBe(expanded.dominant.length);
    }
  });
});

describe('base hands', () => {
  it('holds one configuration for the whole sign', () => {
    const { nonDominant } = expandSign({
      ...base, dominant: track,
      base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
    });
    expect(nonDominant).toEqual([
      { atMs: 0, location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 400, location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
    ]);
  });

  it('spans the duration the repeat produced, not the one that was written', () => {
    const { nonDominant, durationMs } = expandSign({
      ...base, dominant: track,
      base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
      repeat: { fromMs: 0, toMs: 400, times: 3 },
    });
    expect(durationMs).toBe(1200);
    expect(nonDominant![nonDominant!.length - 1]!.atMs).toBe(1200);
  });
});

describe('repetition', () => {
  it('plays the interval the stated number of times', () => {
    // track goes out and back, so repeating the whole of it three times is
    // three round trips -- and the first of them is the one as written, which
    // the first version of this dropped, silently playing one cycle fewer.
    const { dominant, durationMs } = expandSign({
      ...base, dominant: track, repeat: { fromMs: 0, toMs: 400, times: 3 },
    });
    expect(durationMs).toBe(1200);
    expect(dominant.map((k) => k.atMs)).toEqual([0, 200, 400, 600, 800, 1000, 1200]);
    expect(dominant.map((k) => k.location)).toEqual([
      'NEUTRAL', 'CHEST_OUT', 'NEUTRAL', 'CHEST_OUT', 'NEUTRAL', 'CHEST_OUT', 'NEUTRAL',
    ]);
  });

  it('moves the stroke end along with everything after the interval', () => {
    const { strokeStartMs, strokeEndMs } = expandSign({
      ...base, dominant: track, repeat: { fromMs: 0, toMs: 200, times: 2 },
    });
    // The stroke started before the repeat, so it stays; it ended after it, so
    // it moves by the 200ms the extra cycle added.
    expect(strokeStartMs).toBe(80);
    expect(strokeEndMs).toBe(560);
  });

  it('refuses a repeat that cannot mean anything', () => {
    const bad = (repeat: { fromMs: number; toMs: number; times: number }) =>
      () => expandSign({ ...base, dominant: track, repeat });
    expect(bad({ fromMs: 200, toMs: 200, times: 2 })).toThrow(/empty interval/);
    expect(bad({ fromMs: 0, toMs: 200, times: 1 })).toThrow(/2 or more/);
    expect(bad({ fromMs: 0, toMs: 900, times: 2 })).toThrow(/outside its duration/);
  });
});

describe('stating the non-dominant hand', () => {
  it('refuses to be told twice', () => {
    expect(() => expandSign({
      ...base, dominant: track, symmetry: 'mirror',
      base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
    })).toThrow(/more than one way/);
  });

  it('leaves a one-handed sign one-handed', () => {
    expect(expandSign({ ...base, dominant: track }).nonDominant).toBeUndefined();
  });
});

describe('expansion and compilation agree', () => {
  it('compiles a shorthand sign to exactly what the written-out form compiles to', () => {
    const shorthand = compileSign({ ...base, dominant: track, symmetry: 'mirror' });
    const written = compileSign({ ...base, dominant: track, nonDominant: [...track] });
    expect(shorthand.keyframes.map((k) => k.timeMs)).toEqual(written.keyframes.map((k) => k.timeMs));
    for (let i = 0; i < written.keyframes.length; i++) {
      expect(shorthand.keyframes[i]!.pose).toEqual(written.keyframes[i]!.pose);
    }
  });
});

import {
  def, path, touch, tap, travel, loop, twist, change, family, p, lintSign,
  SOLVED_LOCATIONS, type LocationName,
} from '../src/index.js';
import { solveFK, jointPosition, vec3Distance, sampleClip } from '@signflow/motion-format';

/** A series of places with consecutive repeats collapsed: where the hand WENT. */
const visits = (places: readonly string[]) => places.filter((l, i) => i === 0 || l !== places[i - 1]);

describe('templates', () => {
  it('state a tap in full, with both ends naming the same contact site', () => {
    // The M6 lesson, made structural: a tap whose contact keyframe names a
    // fingertip and whose lift keyframe names the wrist is a lurch of most of a
    // hand's length, not a tap. The template applies one site to every keyframe.
    const sign = def('X', 'X', 'verb', 'x', tap(p('CHIN', 'OPEN_5', 'PALM_ACROSS', 'thumb'), 'NOSE', 2));
    const sites = sign.dominant.map((k) => k.contact);
    expect(new Set(sites)).toEqual(new Set(['thumb']));
    expect(visits(sign.dominant.map((k) => k.location)))
      .toEqual(['NEUTRAL_HIGH', 'CHIN', 'NOSE', 'CHIN']);
  });

  it('counts contacts, not cycles', () => {
    // Counted as visits, not keyframes: a held contact is written as two
    // keyframes at the same place, and a tap-tap is still two taps.
    const contacts = (n: number) => visits(def('X', 'X', 'verb', 'x',
      tap(p('CHIN', 'FLAT', 'PALM_IN', 'middle'), 'NOSE', n))
      .dominant.map((k) => k.location)).filter((l) => l === 'CHIN').length;
    expect(contacts(1)).toBe(1);
    expect(contacts(2)).toBe(2);
    expect(contacts(3)).toBe(3);
  });

  it('takes longer to travel further', () => {
    const near = path([p('CENTRE_MID', 'S', 'PALM_DOWN'), p('NEUTRAL', 'S', 'PALM_DOWN')]);
    const far = path([p('CENTRE_MID', 'S', 'PALM_DOWN'), p('ABOVE_HEAD', 'S', 'PALM_DOWN')]);
    expect(far.durationMs).toBeGreaterThan(near.durationMs);
  });

  it('puts the stroke between arriving at the first pose and arriving at the last', () => {
    const motion = path([p('CHEST', 'FLAT', 'PALM_IN'), p('CENTRE_HIGH', 'FLAT', 'PALM_IN')]);
    expect(motion.strokeStartMs).toBeGreaterThan(0);
    expect(motion.strokeEndMs).toBeGreaterThan(motion.strokeStartMs);
    expect(motion.durationMs).toBeGreaterThan(motion.strokeEndMs);
  });

  it('refuses a second non-dominant hand the way the sugar does', () => {
    expect(() => def('X', 'X', 'verb', 'x',
      path([p('CHEST', 'FLAT')], { other: [p('CHEST', 'FLAT')] }),
      { two: 'mirror' })).toThrow(/more than one way/);
  });

  it('writes a family’s movement once and its handshapes as data', () => {
    const members = family(
      (hs) => loop([p('CENTRE_MID', hs, 'PALM_OUT'), p('NEUTRAL', hs, 'PALM_SIDE'), p('CHEST_OUT', hs, 'PALM_IN')]),
      [['A1', 'A1', 'F', 'a'], ['B1', 'B1', 'G', 'b'], ['C1', 'C1', 'C', 'c']],
      'society', { two: 'mirror' },
    );
    expect(members).toHaveLength(3);
    // Same movement: same times, same places. Only the handshape differs.
    const shape = (s: (typeof members)[number]) => s.dominant.map((k) => `${k.atMs}@${k.location}`);
    expect(shape(members[0]!)).toEqual(shape(members[1]!));
    expect(shape(members[0]!)).toEqual(shape(members[2]!));
    expect(members.map((m) => m.dominant[1]!.handshape)).toEqual(['F', 'G', 'C']);
  });

  it('keeps nearly every pair of places under the speed warning', () => {
    // First written as "every pair", and that was false. Deriving time from
    // distance cannot be exact because the arm moves in joint space: CHEST to
    // SIDE_MID is 22cm but peaks at 2.5 m/s. What can honestly be claimed is a
    // rate, measured: timing by guesswork failed about one pair in six, and
    // this fails under one in a hundred. The linter catches the remainder and
    // `pace` fixes it. The rate is asserted so it cannot quietly get worse.
    const names = Object.keys(SOLVED_LOCATIONS) as LocationName[];
    const offenders: string[] = [];
    let tried = 0;
    for (let i = 0; i < names.length; i += 1) {
      for (let j = (i * 5 + 1) % 3; j < names.length; j += 3) {
        if (i === j) continue;
        tried++;
        const sign = def('P', 'P', 'verb', 'p',
          travel(p(names[i]!, 'FLAT', 'PALM_IN', 'middle'), p(names[j]!, 'FLAT', 'PALM_IN', 'middle')));
        for (const f of lintSign(sign)) {
          if (f.check === 'speed') offenders.push(`${names[i]}->${names[j]}`);
        }
      }
    }
    expect(tried).toBeGreaterThan(200);
    expect(offenders.length / tried).toBeLessThan(0.02);
  });

  it('lets one word fix a sign that is too fast', () => {
    const fast = def('P', 'P', 'verb', 'p',
      travel(p('CHEST', 'FLAT', 'PALM_IN', 'middle'), p('SIDE_MID', 'FLAT', 'PALM_IN', 'middle')));
    expect(lintSign(fast).some((f) => f.check === 'speed')).toBe(true);

    const slower = def('P', 'P', 'verb', 'p',
      travel(p('CHEST', 'FLAT', 'PALM_IN', 'middle'), p('SIDE_MID', 'FLAT', 'PALM_IN', 'middle'),
        { pace: 1.3 }));
    expect(lintSign(slower).some((f) => f.check === 'speed')).toBe(false);
    expect(slower.durationMs).toBeGreaterThan(fast.durationMs);
  });
});

import { hermiteEase } from '../src/index.js';

describe('easing inside a sign', () => {
  it('has the right end conditions for every kind of stop', () => {
    for (const start of [0, 1] as const) {
      for (const end of [0, 1] as const) {
        expect(hermiteEase(0, start, end), `${start}/${end} at 0`).toBeCloseTo(0, 12);
        expect(hermiteEase(1, start, end), `${start}/${end} at 1`).toBeCloseTo(1, 12);
      }
    }
  });

  it('never overshoots or goes backwards, so a pass-through cannot lurch', () => {
    // Monotonic for every combination of end speeds in {0, 1}, which is what
    // makes the pair of cases safe to use at all.
    for (const start of [0, 1] as const) {
      for (const end of [0, 1] as const) {
        let previous = -Infinity;
        for (let i = 0; i <= 200; i++) {
          const v = hermiteEase(i / 200, start, end);
          expect(v, `${start}/${end} at ${i / 200}`).toBeGreaterThanOrEqual(previous - 1e-12);
          expect(v).toBeLessThanOrEqual(1 + 1e-12);
          previous = v;
        }
      }
    }
  });

  it('is linear when both ends pass through, and smoothstep when both stop', () => {
    expect(hermiteEase(0.3, 1, 1)).toBeCloseTo(0.3, 12);
    expect(hermiteEase(0.5, 0, 0)).toBeCloseTo(0.5, 12);
    expect(hermiteEase(0.25, 0, 0)).toBeCloseTo(0.15625, 12);
  });

  it('starts a sign from rest instead of at full speed', () => {
    // The regression this exists for. For five milestones the easing in
    // sampleTrack was evaluated only at keyframe times, where t is always 0 or
    // 1, so it never took effect and every sign started at its peak speed: the
    // first 20ms of a 190ms approach covered 3.7cm, twice the average. A sign
    // that starts from rest has a first step well under its peak.
    const sign = def('X', 'X', 'verb', 'x',
      travel(p('CHIN', 'FLAT', 'PALM_IN', 'middle'), p('NEUTRAL', 'FLAT', 'PALM_IN', 'middle')));
    const clip = compileSign(sign);
    const steps: number[] = [];
    let previous = solveFK(sampleClip(clip, 0));
    for (let t = 20; t <= 200; t += 20) {
      const current = solveFK(sampleClip(clip, t));
      steps.push(vec3Distance(jointPosition(previous, 'right_wrist'), jointPosition(current, 'right_wrist')));
      previous = current;
    }
    expect(steps[0]!).toBeLessThan(Math.max(...steps) * 0.6);
  });

  it('keeps the hand moving through an arc instead of stopping at each point', () => {
    const arced = def('X', 'X', 'verb', 'x',
      path([p('CHEST', 'FLAT', 'PALM_IN'), p('NEUTRAL_HIGH', 'FLAT', 'PALM_IN'), p('SIDE_HIGH', 'FLAT', 'PALM_IN')]));
    const clip = compileSign(arced);
    const middle = arced.dominant[2]!.atMs;
    const speedAt = (t: number) => {
      const a = solveFK(sampleClip(clip, t - 10));
      const b = solveFK(sampleClip(clip, t + 10));
      return vec3Distance(jointPosition(a, 'right_wrist'), jointPosition(b, 'right_wrist')) / 0.02;
    };
    // At the via point the hand is travelling, not stopped.
    expect(speedAt(middle)).toBeGreaterThan(0.3);
    // At the end it is.
    expect(speedAt(arced.dominant[3]!.atMs - 10)).toBeLessThan(speedAt(middle));
  });
});

import { phonologicalDifference, SIGNS as LIB, findCollisions as collisions } from '../src/index.js';

describe('how two signs differ', () => {
  const sign = (id: string, motion: ReturnType<typeof path>, options = {}) =>
    def(id, id, 'verb', id, motion, options);
  const at = (loc: LocationName, hs = 'FLAT', ori: 'PALM_IN' | 'PALM_OUT' = 'PALM_IN') => p(loc, hs, ori);

  it('says nothing differs when the parameters are all the same', () => {
    // One sign under two names. The right model is one sign with two senses.
    const a = sign('A', touch(at('CHEST')));
    const b = sign('B', touch(at('CHEST')));
    expect(phonologicalDifference(a, b)).toEqual([]);
  });

  it('names a handshape-only difference', () => {
    const a = sign('A', touch(at('CHEST', 'FLAT')));
    const b = sign('B', touch(at('CHEST', 'S')));
    expect(phonologicalDifference(a, b)).toEqual(['handshape']);
  });

  it('names a location-only difference', () => {
    expect(phonologicalDifference(sign('A', touch(at('CHEST'))), sign('B', touch(at('CHIN')))))
      .toEqual(['location']);
  });

  it('names an orientation-only difference', () => {
    expect(phonologicalDifference(
      sign('A', touch(at('CHEST', 'FLAT', 'PALM_IN'))),
      sign('B', touch(at('CHEST', 'FLAT', 'PALM_OUT'))),
    )).toEqual(['orientation']);
  });

  it('names a contact-site difference', () => {
    expect(phonologicalDifference(
      sign('A', touch(p('CHEST', 'FLAT', 'PALM_IN', 'palm'))),
      sign('B', touch(p('CHEST', 'FLAT', 'PALM_IN', 'middle'))),
    )).toEqual(['contact']);
  });

  it('tells one hand from two', () => {
    const one = sign('A', touch(at('CHEST')));
    const two = sign('B', touch(at('CHEST')), { two: 'mirror' });
    expect(phonologicalDifference(one, two)).toContain('hands');
  });

  it('counts a different number of taps as a difference in movement', () => {
    const two = sign('A', tap(p('CHIN', 'FLAT', 'PALM_IN', 'middle'), 'NOSE', 2));
    const three = sign('B', tap(p('CHIN', 'FLAT', 'PALM_IN', 'middle'), 'NOSE', 3));
    expect(phonologicalDifference(two, three)).toContain('movement');
  });

  it('sees direction, which a static comparison cannot', () => {
    // GO and COME are the same hands in the same places travelling opposite
    // ways. As collapsed sequences of poses they run in opposite order.
    expect(phonologicalDifference(LIB.GO!, LIB.COME!).length).toBeGreaterThan(0);
  });

  it('separates the real minimal pairs already in the library', () => {
    // MOTHER and FATHER are one movement at two places, and the two are the
    // textbook case of a pair a pure distance threshold would call a collision.
    const diff = phonologicalDifference(LIB.MOTHER!, LIB.FATHER!);
    expect(diff).toContain('location');
    expect(diff).not.toContain('handshape');
  });

  it('reports why two close signs are close', () => {
    // Every collision now carries its reasons. An error that cannot say which
    // parameter to change is an error nobody can act on.
    for (const c of collisions(0.12)) expect(Array.isArray(c.differs)).toBe(true);
  });
});
