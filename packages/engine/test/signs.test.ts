import { describe, it, expect } from 'vitest';
import {
  solveFK, jointPosition, tipPosition, vec3Distance, validatePose,
  palmNormal, fingerDirection, penetrationDepth, segmentPenetration, type Vec3,
} from '@signflow/motion-format';
import {
  SIGNS, SIGN_IDS, signDefinition, compileSign, isTwoHanded,
  SOLVED_LOCATIONS, ORIENTATIONS, SIGN_HANDSHAPES,
  sequence, samplePrepared, activeSequenceSegment, signClip,
  REST_POSTURE, findCollisions, lintLibrary, expandSign,
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
  const armOf = (name: keyof typeof SOLVED_LOCATIONS) => {
    const solved = solveFK(probe(name));
    return {
      shoulder: jointPosition(solved, 'right_shoulder'),
      elbow: jointPosition(solved, 'right_elbow'),
      wrist: jointPosition(solved, 'right_wrist'),
    };
  };

  it('reaches every target that is not inside the body', () => {
    // NOSE, CHEEK and BROW name points on the face, and a wrist cannot be
    // inside a head. Those three resolve to the nearest reachable point
    // outside it, and are only ever meant to be used with a contact site --
    // a fingertip at the nose, with the wrist below it -- which re-solves the
    // arm at compile time and does reach them.
    for (const [name, location] of Object.entries(SOLVED_LOCATIONS)) {
      const target = location.target as Vec3;
      const err = vec3Distance(armOf(name as never).wrist, target);
      if (penetrationDepth(target) > 0) {
        expect(err, `${name} (target is inside the body)`).toBeLessThan(0.03);
      } else {
        expect(err, name).toBeLessThan(0.005);
      }
    }
  });

  it('keeps both arm segments out of the body', () => {
    // Joints alone are not enough: an upper arm can have its shoulder and its
    // elbow both outside the torso and its middle four centimetres inside it.
    //
    // Two centimetres rather than zero, because the torso is a box and arms
    // have no give here. Reaching across the body to the far shoulder presses
    // the upper arm against the chest, and CONTRA_SHOULDER sits at 1.3cm for
    // that reason -- a real arm would flatten, this one overlaps instead.
    for (const name of Object.keys(SOLVED_LOCATIONS)) {
      const { shoulder, elbow, wrist } = armOf(name as never);
      expect(segmentPenetration(shoulder, elbow), `${name} upper arm`).toBeLessThan(0.02);
      expect(segmentPenetration(elbow, wrist), `${name} forearm`).toBeLessThan(0.02);
    }
  });

  it('never folds the elbow up above the hand', () => {
    // Not "elbow below the shoulder": reaching above your head requires the
    // elbow above the shoulder, and as a rule that left ABOVE_HEAD 15cm short.
    // What reads as broken is the elbow above the hand it is holding up.
    for (const name of Object.keys(SOLVED_LOCATIONS)) {
      const { elbow, wrist } = armOf(name as never);
      expect(elbow[1], `${name} elbow height`).toBeLessThan(wrist[1] + 0.15);
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

  it('points the hand where each orientation says it does', () => {
    // The point of naming orientations by their two directions is that the name
    // and the behaviour can be checked against each other. Stated as Euler
    // angles they could not be: an orientation called PALM_UP can face the palm
    // up and still leave the fingers pointing back at the signer.
    const mismatched: string[] = [];
    for (const [name, spec] of Object.entries(ORIENTATIONS)) {
      const solved = solveFK(probe('NEUTRAL', name as never));
      const fingersOff = angleBetween(fingerDirection(solved, 'right'), spec.fingers as Vec3);
      const palmOff = angleBetween(palmNormal(solved, 'right'), spec.palm as Vec3);
      if (fingersOff > 5 || palmOff > 10) {
        mismatched.push(`${name} (fingers ${fingersOff.toFixed(0)}deg, palm ${palmOff.toFixed(0)}deg off)`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('mirrors "across the body" to mean the midline on either hand', () => {
    const across = compileSign({
      id: 'm', gloss: 'm', description: 'm', durationMs: 1, strokeStartMs: 0, strokeEndMs: 1,
      dominant: [{ atMs: 0, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'FINGERS_ACROSS' }],
      nonDominant: [{ atMs: 0, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'FINGERS_ACROSS' }],
      provenance: { source: 'hand-authored', validation: 'unvalidated' },
    }).keyframes[0]!.pose;
    const solved = solveFK(across);
    // The right hand points toward +X and the left toward -X: both inward.
    expect(fingerDirection(solved, 'right')[0]).toBeGreaterThan(0.9);
    expect(fingerDirection(solved, 'left')[0]).toBeLessThan(-0.9);
  });

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

describe('handshape and orientation are separate concerns', () => {
  it('does not let a letter\u2019s own wrist angle leak into a sign', () => {
    // H, G, P and Q carry a wrist rotation as part of being that letter, which
    // is a fingerspelling concern. Borrowing H's fingers for NAME must not also
    // borrow the angle the letter H is held at.
    const withH = solveFK(probe('NEUTRAL', 'PALM_OUT'));
    const hSign = compileSign({
      id: 'h', gloss: 'h', description: 'h', durationMs: 1, strokeStartMs: 0, strokeEndMs: 1,
      dominant: [{ atMs: 0, location: 'NEUTRAL', handshape: 'H', orientation: 'PALM_OUT' }],
      provenance: { source: 'hand-authored', validation: 'unvalidated' },
    }).keyframes[0]!.pose;
    const hSolved = solveFK(hSign);
    // Same orientation asked for, so the same orientation achieved, whichever
    // handshape supplied the fingers.
    expect(angleBetween(fingerDirection(hSolved, 'right'), fingerDirection(withH, 'right'))).toBeLessThan(1);
    expect(angleBetween(palmNormal(hSolved, 'right'), palmNormal(withH, 'right'))).toBeLessThan(1);
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

  it('keeps the two hands from occupying the same space', () => {
    for (const id of SIGN_IDS) {
      const sign = SIGNS[id]!;
      if (!isTwoHanded(sign)) continue;
      const clip = compileSign(sign);
      for (const frame of clip.keyframes) {
        const solved = solveFK(frame.pose);
        const apart = vec3Distance(
          jointPosition(solved, 'right_wrist'), jointPosition(solved, 'left_wrist'));
        expect(apart, `${id} @${frame.timeMs}ms`).toBeGreaterThan(0.07);
      }
    }
  });

  it('keeps every sign distinct from every other over its whole stroke', () => {
    // Compared as a trajectory, not as one pose in the middle of the stroke.
    // Measured at the midpoint GO and COME are 0.0cm apart -- same hands, same
    // place, opposite directions -- and so are plenty of real ASL pairs. A
    // check that cannot see direction is blind to exactly the pairs it is for.
    const collisions = findCollisions(0.03).map((c) => `${c.a}/${c.b} (${(c.distance * 100).toFixed(1)}cm)`);
    expect(collisions).toEqual([]);
  });

  it('passes its own linter with no errors', () => {
    // The linter is the thing that makes a hundred signs tractable: nobody can
    // watch them all, so the properties that can be decided from geometry are
    // decided here on every commit. Warnings are judgement calls and do not
    // fail; errors are hands inside heads.
    const errors = lintLibrary()
      .filter((f) => f.severity === 'error')
      .map((f) => `${f.signId}: ${f.message}`);
    expect(errors).toEqual([]);
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
