import { describe, it, expect } from 'vitest';
import {
  solveFK, jointPosition, tipPosition, vec3Distance, validatePose,
  palmNormal, fingerDirection, type Vec3,
} from '@signflow/motion-format';
import {
  SIGNS, SIGN_IDS, signDefinition, compileSign, isTwoHanded,
  SOLVED_LOCATIONS, ORIENTATIONS, SIGN_HANDSHAPES,
  sequence, samplePrepared, activeSequenceSegment, signClip,
  REST_POSTURE,
} from '../src/index.js';

const REST = solveFK(REST_POSTURE);
const REST_LEFT_Y = jointPosition(REST, 'left_wrist')[1];

/** Fingertip positions for both hands: a signature of the whole body pose. */
const signature = (pose: Parameters<typeof solveFK>[0]) => {
  const s = solveFK(pose);
  return ['thumb', 'index', 'middle', 'ring', 'pinky'].flatMap((f) => [
    ...tipPosition(s, `right_${f}_tip`), ...tipPosition(s, `left_${f}_tip`),
  ]);
};
const signatureDistance = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]!));

/** A one-keyframe sign, for probing a single location or orientation. */
const probe = (location: keyof typeof SOLVED_LOCATIONS, orientation?: keyof typeof ORIENTATIONS) =>
  compileSign({
    id: 'probe', gloss: 'probe', description: 'probe', durationMs: 1,
    strokeStartMs: 0, strokeEndMs: 1,
    dominant: [{ atMs: 0, location, handshape: 'FLAT', ...(orientation ? { orientation } : {}) }],
    provenance: { source: 'hand-authored', validation: 'unvalidated' },
  }).keyframes[0]!.pose;

const angleBetween = (a: Vec3, b: Vec3) =>
  (Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI;

describe('solved locations', () => {
  it('reaches every target it was solved for', () => {
    for (const [name, location] of Object.entries(SOLVED_LOCATIONS)) {
      const wrist = jointPosition(solveFK(probe(name as never)), 'right_wrist');
      expect(vec3Distance(wrist, location.target as Vec3), name).toBeLessThan(0.005);
    }
  });

  it('keeps every elbow below its wrist and clear of the torso', () => {
    for (const name of Object.keys(SOLVED_LOCATIONS)) {
      const solved = solveFK(probe(name as never));
      const elbow = jointPosition(solved, 'right_elbow');
      const wrist = jointPosition(solved, 'right_wrist');
      // A low, forward hand legitimately sits a little under its own elbow;
      // what this rules out is the arm folding up over itself.
      expect(elbow[1], `${name} elbow height`).toBeLessThan(wrist[1] + 0.06);
      expect(Math.abs(elbow[0]), `${name} elbow clearance`).toBeGreaterThan(0.11);
    }
  });
});

describe('orientations', () => {
  const oriented = (orientation: keyof typeof ORIENTATIONS) => {
    const s = solveFK(probe('NEUTRAL', orientation));
    return {
      palm: palmNormal(s, 'right'),
      fingers: fingerDirection(s, 'right'),
      wrist: jointPosition(s, 'right_wrist'),
    };
  };

  it('turns the hand somewhere different for each named orientation', () => {
    // Compared as directions, not tip positions: ANGLED_OUT is deliberately a
    // near neighbour of PALM_OUT, and a few centimetres of tip travel says
    // nothing about whether the hand is actually facing somewhere else.
    const names = Object.keys(ORIENTATIONS) as Array<keyof typeof ORIENTATIONS>;
    const tooSimilar: string[] = [];
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = oriented(names[i]!);
        const b = oriented(names[j]!);
        const apart = Math.max(angleBetween(a.palm, b.palm), angleBetween(a.fingers, b.fingers));
        if (apart < 15) tooSimilar.push(`${names[i]}/${names[j]} (${apart.toFixed(0)}deg)`);
      }
    }
    expect(tooSimilar).toEqual([]);
  });

  it('leaves the wrist where the location put it', () => {
    // Orientation turns the hand; it must not move the arm.
    const reference = oriented('PALM_OUT').wrist;
    for (const o of Object.keys(ORIENTATIONS)) {
      expect(vec3Distance(oriented(o as never).wrist, reference), o).toBeLessThan(1e-9);
    }
  });
});

describe('the sign library', () => {
  it('is all hand-authored and all unvalidated', () => {
    // If this ever fails, the claim in the interface and the docs is stale.
    for (const id of SIGN_IDS) {
      expect(SIGNS[id]!.provenance.source, id).toBe('hand-authored');
      expect(SIGNS[id]!.provenance.validation, id).toBe('unvalidated');
    }
  });

  it('compiles every sign to a valid clip', () => {
    for (const id of SIGN_IDS) {
      const clip = compileSign(SIGNS[id]!);
      expect(clip.keyframes.length, id).toBeGreaterThan(1);
      for (const frame of clip.keyframes) {
        expect(validatePose(frame.pose), `${id} @${frame.timeMs}ms`).toEqual([]);
      }
    }
  });

  it('gives every sign a stroke inside its duration', () => {
    for (const id of SIGN_IDS) {
      const { strokeStartMs, strokeEndMs, durationMs } = SIGNS[id]!;
      expect(strokeStartMs, id).toBeGreaterThanOrEqual(0);
      expect(strokeEndMs, id).toBeGreaterThan(strokeStartMs);
      expect(strokeEndMs, id).toBeLessThanOrEqual(durationMs);
    }
  });

  it('makes every sign actually move', () => {
    // Measured on fingertips, not the wrist: YES is a wrist nod and NO a
    // handshape change, and neither displaces the wrist at all.
    for (const id of SIGN_IDS) {
      const frames = compileSign(SIGNS[id]!).keyframes.map((k) => signature(k.pose));
      let change = 0;
      for (let i = 1; i < frames.length; i++) change += signatureDistance(frames[i]!, frames[i - 1]!);
      expect(change, id).toBeGreaterThan(0.05);
    }
  });

  it('raises the non-dominant hand for two-handed signs and leaves it down otherwise', () => {
    for (const id of SIGN_IDS) {
      const clip = compileSign(SIGNS[id]!);
      const middle = clip.keyframes[Math.floor(clip.keyframes.length / 2)]!;
      const leftY = jointPosition(solveFK(middle.pose), 'left_wrist')[1];
      if (isTwoHanded(SIGNS[id]!)) expect(leftY, `${id} (two-handed)`).toBeGreaterThan(REST_LEFT_Y + 0.05);
      else expect(leftY, `${id} (one-handed)`).toBeCloseTo(REST_LEFT_Y, 6);
    }
  });

  it('keeps every sign visually distinct from every other', () => {
    const mid = (id: string) => {
      const clip = compileSign(SIGNS[id]!);
      const t = ((clip.strokeStartMs ?? 0) + (clip.strokeEndMs ?? clip.durationMs)) / 2;
      let closest = clip.keyframes[0]!;
      for (const f of clip.keyframes) if (Math.abs(f.timeMs - t) < Math.abs(closest.timeMs - t)) closest = f;
      return signature(closest.pose);
    };
    const collisions: string[] = [];
    for (let i = 0; i < SIGN_IDS.length; i++) {
      for (let j = i + 1; j < SIGN_IDS.length; j++) {
        const d = signatureDistance(mid(SIGN_IDS[i]!), mid(SIGN_IDS[j]!));
        if (d < 0.03) collisions.push(`${SIGN_IDS[i]}/${SIGN_IDS[j]} (${(d * 100).toFixed(1)}cm)`);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('only references handshapes that exist', () => {
    const known = new Set([...Object.keys(SIGN_HANDSHAPES), ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']);
    for (const id of SIGN_IDS) {
      const sign = SIGNS[id]!;
      for (const k of [...sign.dominant, ...(sign.nonDominant ?? [])]) {
        expect(known.has(k.handshape), `${id} uses ${k.handshape}`).toBe(true);
      }
    }
  });

  it('rejects an unknown sign id', () => {
    expect(signDefinition('NOPE')).toBeUndefined();
    expect(() => signClip('NOPE')).toThrow(/Unknown sign/);
  });
});

describe('sequencing', () => {
  const sentence = () => sequence([
    { kind: 'sign', signId: 'HELLO' },
    { kind: 'sign', signId: 'MY' },
    { kind: 'sign', signId: 'NAME' },
    { kind: 'fingerspell', word: 'EVAN' },
  ]);

  it('lays segments out in order without overlapping', () => {
    const { sequence: seq } = sentence();
    expect(seq.segments).toHaveLength(4);
    let previousEnd = 0;
    for (const segment of seq.segments) {
      expect(segment.strokeStartMs).toBeGreaterThanOrEqual(previousEnd);
      expect(segment.strokeEndMs).toBeGreaterThan(segment.strokeStartMs);
      previousEnd = segment.strokeEndMs;
    }
    expect(seq.durationMs).toBeGreaterThan(previousEnd);
  });

  it('treats a fingerspelled word as one segment with letter sub-segments', () => {
    const { sequence: seq } = sentence();
    const spelled = seq.segments[3]!;
    expect(spelled.kind).toBe('fingerspell');
    expect(spelled.gloss).toBe('E-V-A-N');
    expect(spelled.letters).toHaveLength(4);
  });

  it('plays only the stroke of each sign, not its approach and release', () => {
    // A sign's own ramps are the sequencer's job to replace, or two signs in a
    // row play one release straight into the next approach.
    const { sequence: seq } = sequence([{ kind: 'sign', signId: 'HELLO' }]);
    const clip = signClip('HELLO');
    const stroke = (clip.strokeEndMs ?? 0) - (clip.strokeStartMs ?? 0);
    const segment = seq.segments[0]!;
    expect(segment.strokeEndMs - segment.strokeStartMs).toBeCloseTo(stroke, 3);
    expect(stroke).toBeLessThan(clip.durationMs);
  });

  it('gives a longer approach when the hands have further to travel', () => {
    // MY is one-handed; NAME needs the non-dominant hand up from rest.
    const oneToTwo = sequence([{ kind: 'sign', signId: 'MY' }, { kind: 'sign', signId: 'NAME' }]);
    const oneToOne = sequence([{ kind: 'sign', signId: 'YOU' }, { kind: 'sign', signId: 'YOUR' }]);
    expect(oneToTwo.sequence.segments[1]!.transitionInMs)
      .toBeGreaterThan(oneToOne.sequence.segments[1]!.transitionInMs);
  });

  it('starts and ends at rest', () => {
    const { sequence: seq, prepared } = sentence();
    expect(signatureDistance(signature(samplePrepared(prepared, seq, 0)), signature(REST_POSTURE)))
      .toBeLessThan(1e-9);
    expect(signatureDistance(signature(samplePrepared(prepared, seq, seq.durationMs)), signature(REST_POSTURE)))
      .toBeLessThan(1e-9);
  });

  it('emits a valid pose at every point in the timeline', () => {
    const { sequence: seq, prepared } = sentence();
    for (let t = 0; t <= seq.durationMs; t += 11) {
      expect(validatePose(samplePrepared(prepared, seq, t)), `at ${t}ms`).toEqual([]);
    }
  });

  it('moves continuously, with no jump between frames', () => {
    // The whole reason for trimming to the stroke and scaling transitions with
    // distance. A step much past a centimetre per frame is a visible snap.
    const { sequence: seq, prepared } = sentence();
    let previous = solveFK(samplePrepared(prepared, seq, 0));
    for (let t = 4; t <= seq.durationMs; t += 4) {
      const current = solveFK(samplePrepared(prepared, seq, t));
      for (const joint of ['right_wrist', 'left_wrist']) {
        const step = vec3Distance(jointPosition(previous, joint), jointPosition(current, joint));
        expect(step, `${joint} at ${t}ms`).toBeLessThan(0.010);
      }
      previous = current;
    }
  });

  it('holds a recognisable pose in the middle of each sign', () => {
    const { sequence: seq, prepared } = sentence();
    for (const segment of seq.segments.filter((s) => s.kind === 'sign')) {
      const mid = (segment.strokeStartMs + segment.strokeEndMs) / 2;
      const sampled = signature(samplePrepared(prepared, seq, mid));
      expect(signatureDistance(sampled, signature(REST_POSTURE))).toBeGreaterThan(0.1);
    }
  });

  it('tracks the active segment for highlighting', () => {
    const { sequence: seq } = sentence();
    for (const segment of seq.segments) {
      const mid = (segment.strokeStartMs + segment.strokeEndMs) / 2;
      expect(activeSequenceSegment(seq, mid)?.index).toBe(segment.index);
    }
    expect(activeSequenceSegment(seq, seq.durationMs + 1)).toBeUndefined();
  });

  it('shortens with speed but keeps transitions readable', () => {
    const slow = sequence([{ kind: 'sign', signId: 'HELLO' }, { kind: 'sign', signId: 'MY' }], { speed: 1 });
    const fast = sequence([{ kind: 'sign', signId: 'HELLO' }, { kind: 'sign', signId: 'MY' }], { speed: 2 });
    expect(fast.sequence.durationMs).toBeLessThan(slow.sequence.durationMs);
    const ratio = slow.sequence.segments[1]!.transitionInMs / fast.sequence.segments[1]!.transitionInMs;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(2.05);
  });

  it('handles an empty sequence without producing motion', () => {
    const { sequence: seq, prepared } = sequence([]);
    expect(seq.durationMs).toBe(0);
    expect(samplePrepared(prepared, seq, 0)).toEqual(REST_POSTURE);
  });
});
