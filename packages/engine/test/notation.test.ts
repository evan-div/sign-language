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
