import { describe, it, expect } from 'vitest';
import { solveFK, tipPosition, jointPosition, vec3Distance, validatePose } from '@signflow/motion-format';
import {
  planFingerspell, sampleFingerspell, activeSegment, PlaybackClock,
  REST_POSTURE, SPELLING_POSTURE,
} from '../src/index.js';

const handY = (pose: Parameters<typeof solveFK>[0]) =>
  jointPosition(solveFK(pose), 'right_wrist')[1];

const tipsOf = (pose: Parameters<typeof solveFK>[0]) => {
  const s = solveFK(pose);
  const wrist = jointPosition(s, 'right_wrist');
  return ['thumb', 'index', 'middle', 'ring', 'pinky']
    .flatMap((f) => tipPosition(s, `right_${f}_tip`).map((v, i) => v - wrist[i]!));
};

const shapeDistance = (a: Parameters<typeof solveFK>[0], b: Parameters<typeof solveFK>[0]) => {
  const [x, y] = [tipsOf(a), tipsOf(b)];
  return Math.hypot(...x.map((v, i) => v - y[i]!));
};

describe('planning', () => {
  it('produces one segment per letter', () => {
    const plan = planFingerspell('EVAN');
    expect(plan.letters).toEqual(['E', 'V', 'A', 'N']);
    expect(plan.segments).toHaveLength(4);
  });

  it('is case insensitive', () => {
    expect(planFingerspell('evan').letters).toEqual(['E', 'V', 'A', 'N']);
  });

  it('skips characters with no handshape and reports them', () => {
    const plan = planFingerspell("O'Brien-2");
    expect(plan.letters.join('')).toBe('OBRIEN');
    expect(plan.skipped).toEqual(["'", '-', '2']);
  });

  it('handles an empty word without producing motion', () => {
    const plan = planFingerspell('');
    expect(plan.segments).toEqual([]);
    expect(plan.durationMs).toBe(0);
    expect(sampleFingerspell(plan, 0)).toEqual(REST_POSTURE);
  });

  it('orders segments monotonically and without overlap', () => {
    const plan = planFingerspell('SIGNFLOW');
    let previousEnd = 0;
    for (const seg of plan.segments) {
      expect(seg.holdStartMs).toBeGreaterThanOrEqual(previousEnd);
      expect(seg.holdEndMs).toBeGreaterThan(seg.holdStartMs);
      previousEnd = seg.holdEndMs;
    }
    expect(plan.durationMs).toBeGreaterThan(previousEnd);
  });

  it('gives J and Z longer holds, because they travel', () => {
    const jz = planFingerspell('JZ');
    const ab = planFingerspell('AB');
    const span = (p: typeof jz, i: number) => p.segments[i]!.holdEndMs - p.segments[i]!.holdStartMs;
    expect(span(jz, 0)).toBeGreaterThan(span(ab, 0) * 2);
    expect(jz.segments.every((s) => s.moving)).toBe(true);
    expect(ab.segments.every((s) => s.moving)).toBe(false);
  });
});

describe('double letters', () => {
  it('flags a repeated letter', () => {
    const plan = planFingerspell('ANNA');
    expect(plan.segments.map((s) => s.doubled)).toEqual([false, false, true, false]);
  });

  it('finds every repeat in MISSISSIPPI', () => {
    const plan = planFingerspell('MISSISSIPPI');
    const doubled = plan.segments.filter((s) => s.doubled).map((s) => s.index);
    expect(doubled).toEqual([3, 6, 9]);
  });

  it('allows extra time for the bounce', () => {
    // Same letter count, but one has a repeat to articulate.
    expect(planFingerspell('ANNA').durationMs)
      .toBeGreaterThan(planFingerspell('ANTA').durationMs);
  });

  it('visibly re-articulates, so EVANN differs from EVAN', () => {
    const single = planFingerspell('EVAN');
    const doubled = planFingerspell('EVANN');
    expect(doubled.durationMs).toBeGreaterThan(single.durationMs);
    expect(doubled.segments).toHaveLength(5);
  });

  it('opens the hand between two identical letters', () => {
    // Without a release the second N is invisible: the hand never moves.
    const plan = planFingerspell('ANNA');
    const second = plan.segments[2]!;
    const previous = plan.segments[1]!;
    const midTransition = (previous.holdEndMs + second.holdStartMs) / 2;

    const held = sampleFingerspell(plan, previous.holdStartMs + 5);
    const between = sampleFingerspell(plan, midTransition);
    expect(shapeDistance(held, between)).toBeGreaterThan(0.01);
  });
});

describe('sampling', () => {
  const plan = planFingerspell('EVAN');

  it('starts and ends at rest', () => {
    expect(shapeDistance(sampleFingerspell(plan, 0), REST_POSTURE)).toBeLessThan(1e-9);
    expect(shapeDistance(sampleFingerspell(plan, plan.durationMs), REST_POSTURE)).toBeLessThan(1e-9);
  });

  it('raises the hand before the first letter', () => {
    expect(handY(sampleFingerspell(plan, plan.segments[0]!.holdStartMs)))
      .toBeGreaterThan(handY(REST_POSTURE) + 0.2);
  });

  it('lowers it again after the last', () => {
    const last = plan.segments[plan.segments.length - 1]!;
    expect(handY(sampleFingerspell(plan, last.holdEndMs)))
      .toBeGreaterThan(handY(sampleFingerspell(plan, plan.durationMs)));
  });

  it('holds a recognisable handshape at each letter', () => {
    // At the middle of a hold the hand should match that letter, not its neighbours.
    for (const seg of plan.segments) {
      const mid = (seg.holdStartMs + seg.holdEndMs) / 2;
      const sampled = sampleFingerspell(plan, mid);
      const s = solveFK(sampled);
      const reach = (f: string) =>
        vec3Distance(tipPosition(s, `right_${f}_tip`), jointPosition(s, 'right_wrist'));

      if (seg.letter === 'V') {
        expect(vec3Distance(tipPosition(s, 'right_index_tip'), tipPosition(s, 'right_middle_tip')))
          .toBeGreaterThan(0.05);
      }
      if (seg.letter === 'A') {
        expect(reach('index')).toBeLessThan(reach('thumb'));
      }
    }
  });

  it('emits a valid, normalised pose at every point in the timeline', () => {
    for (let t = 0; t <= plan.durationMs; t += 7) {
      const pose = sampleFingerspell(plan, t);
      expect(validatePose(pose), `at ${t}ms`).toEqual([]);
    }
  });

  it('drives the fingers whenever the hand is up', () => {
    // Poses are sparse -- at rest only the arms are named, and the renderer is
    // responsible for returning unnamed bones to their rest rotation. Once a
    // letter is being formed, the finger joints must actually be present.
    const first = plan.segments[0]!;
    const atRest = sampleFingerspell(plan, 0);
    const atLetter = sampleFingerspell(plan, (first.holdStartMs + first.holdEndMs) / 2);

    expect(Object.keys(atRest)).toHaveLength(6);
    const fingerJoints = Object.keys(atLetter).filter((j) => /right_(index|thumb)[123]$/.test(j));
    expect(fingerJoints).toHaveLength(6);
  });

  it('moves continuously, with no jumps between frames', () => {
    // A discontinuity here is exactly the slideshow artefact we are avoiding.
    let previous = sampleFingerspell(plan, 0);
    for (let t = 4; t <= plan.durationMs; t += 4) {
      const current = sampleFingerspell(plan, t);
      expect(shapeDistance(previous, current), `jump at ${t}ms`).toBeLessThan(0.02);
      previous = current;
    }
  });

  it('clamps outside the timeline rather than throwing', () => {
    expect(() => sampleFingerspell(plan, -500)).not.toThrow();
    expect(() => sampleFingerspell(plan, plan.durationMs * 3)).not.toThrow();
  });
});

describe('speed', () => {
  it('shortens the whole utterance', () => {
    expect(planFingerspell('EVAN', { speed: 2 }).durationMs)
      .toBeLessThan(planFingerspell('EVAN', { speed: 1 }).durationMs);
  });

  it('compresses transitions less than holds, to stay readable', () => {
    const slow = planFingerspell('EVAN', { speed: 1 }).options;
    const fast = planFingerspell('EVAN', { speed: 2 }).options;
    const holdRatio = slow.holdMs / fast.holdMs;
    const transitionRatio = slow.transitionMs / fast.transitionMs;
    expect(holdRatio).toBeCloseTo(2, 5);
    expect(transitionRatio).toBeLessThan(holdRatio);
    expect(transitionRatio).toBeGreaterThan(1);
  });

  it('clamps absurd speeds instead of producing a zero-length plan', () => {
    expect(planFingerspell('EVAN', { speed: 0 }).durationMs).toBeGreaterThan(0);
    expect(planFingerspell('EVAN', { speed: 1000 }).durationMs).toBeGreaterThan(0);
  });
});

describe('active segment', () => {
  it('tracks the letter being spelled', () => {
    const plan = planFingerspell('EVAN');
    for (const seg of plan.segments) {
      const mid = (seg.holdStartMs + seg.holdEndMs) / 2;
      expect(activeSegment(plan, mid)?.letter).toBe(seg.letter);
      expect(activeSegment(plan, mid)?.index).toBe(seg.index);
    }
  });

  it('reports nothing once the word is finished', () => {
    const plan = planFingerspell('EVAN');
    expect(activeSegment(plan, plan.durationMs + 1)).toBeUndefined();
  });

  it('distinguishes repeated letters by index', () => {
    const plan = planFingerspell('ANNA');
    const third = plan.segments[2]!;
    expect(activeSegment(plan, (third.holdStartMs + third.holdEndMs) / 2)?.index).toBe(2);
  });
});

describe('playback clock', () => {
  it('does not advance while paused', () => {
    const clock = new PlaybackClock(1000);
    clock.tick(100);
    expect(clock.state.timeMs).toBe(0);
  });

  it('advances while playing and stops at the end', () => {
    const clock = new PlaybackClock(1000);
    clock.play();
    clock.tick(400);
    expect(clock.state.timeMs).toBe(400);
    clock.tick(5000);
    expect(clock.state.timeMs).toBe(1000);
    expect(clock.state.playing).toBe(false);
    expect(clock.hasEnded).toBe(true);
  });

  it('restarts from the beginning when replayed from the end', () => {
    const clock = new PlaybackClock(1000);
    clock.play();
    clock.tick(5000);
    clock.play();
    expect(clock.state.timeMs).toBe(0);
    expect(clock.state.playing).toBe(true);
  });

  it('clamps seeks to the timeline', () => {
    const clock = new PlaybackClock(1000);
    clock.seek(-100);
    expect(clock.state.timeMs).toBe(0);
    clock.seek(99999);
    expect(clock.state.timeMs).toBe(1000);
    clock.seekNormalized(0.25);
    expect(clock.state.timeMs).toBe(250);
  });

  it('keeps relative position when the plan is retimed', () => {
    // Changing speed re-plans, so the scrub handle must not jump.
    const clock = new PlaybackClock(1000);
    clock.seek(500);
    clock.retime(600);
    expect(clock.state.timeMs).toBe(300);
  });

  it('ignores playback of an empty timeline', () => {
    const clock = new PlaybackClock(0);
    clock.play();
    expect(clock.state.playing).toBe(false);
  });
});
