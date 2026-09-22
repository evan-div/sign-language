/**
 * Compiles a SignDefinition into a MotionClip on the canonical skeleton.
 *
 * Each keyframe becomes a full pose: the arm rotations that put the hand at its
 * location, the wrist correction that squares the hand up, the sign's own
 * orientation on top of that, and the handshape. Sampling between keyframes is
 * then ordinary per-joint slerp, which is why signs and fingerspelling can share
 * one blending path.
 */

import {
  blendPoses, composePoses, quatFromEulerDeg, quatMultiply,
  type MotionClip, type Keyframe, type Pose, type Quat,
} from '@signflow/motion-format';
import { compileHandshape } from '../handshapes/compile.js';
import { letterSpec } from '../handshapes/letters.js';
import { signHandshape } from '../handshapes/sign-shapes.js';
import { REST_POSTURE } from '../postures.js';
import type { Hand } from '../handshapes/spec.js';
import { SOLVED_LOCATIONS } from './locations.generated.js';
import { orientationQuat } from './orientation.js';
import { isTwoHanded, type SignDefinition, type SignKeyframe } from './definition.js';

/** Mirror a rotation across the body's sagittal plane. */
function mirrorQuat(q: Quat): Quat {
  return [q[0], -q[1], -q[2], q[3]];
}

function resolveHandshape(id: string) {
  const spec = letterSpec(id) ?? signHandshape(id);
  if (!spec) throw new Error(`Unknown handshape "${id}"`);
  return spec;
}

/**
 * The pose for one hand at one keyframe.
 *
 * Locations are solved for the right arm, so the non-dominant hand mirrors
 * them. Mirroring the composed quaternions rather than re-solving keeps the two
 * hands exactly symmetric, which matters for two-handed signs.
 */
export function keyframePose(keyframe: SignKeyframe, hand: Hand): Pose {
  const location = SOLVED_LOCATIONS[keyframe.location];

  const euler = (v: readonly [number, number, number]) => quatFromEulerDeg(v[0], v[1], v[2]);
  const shoulder = euler(location.shoulder);
  const elbow = euler(location.elbow);
  const wrist = quatMultiply(
    location.wristCorrection as Quat,
    orientationQuat(keyframe.orientation ?? 'PALM_OUT'),
  );

  // A handshape contributes fingers only. Letters G, H, P and Q carry a wrist
  // rotation as part of being that letter, which is a fingerspelling concern:
  // borrowing H's finger configuration for NAME must not also borrow the angle
  // the letter H is held at. Orientation is the sign's to state.
  const { [`${hand}_wrist`]: _letterWrist, ...fingers } = compileHandshape(
    resolveHandshape(keyframe.handshape), hand,
  );
  const composedWrist = wrist;

  const mirror = hand === 'left';
  return {
    ...fingers,
    [`${hand}_shoulder`]: mirror ? mirrorQuat(shoulder) : shoulder,
    [`${hand}_elbow`]: mirror ? mirrorQuat(elbow) : elbow,
    [`${hand}_wrist`]: mirror ? mirrorQuat(composedWrist) : composedWrist,
  };
}

/** Sample one hand's keyframe track at a time, clamping past both ends. */
function sampleTrack(track: readonly SignKeyframe[], hand: Hand, timeMs: number): Pose {
  if (track.length === 0) return {};
  const first = track[0]!;
  if (timeMs <= first.atMs) return keyframePose(first, hand);
  const last = track[track.length - 1]!;
  if (timeMs >= last.atMs) return keyframePose(last, hand);

  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i]!;
    const b = track[i + 1]!;
    if (timeMs <= b.atMs) {
      const span = b.atMs - a.atMs;
      const t = span <= 0 ? 1 : (timeMs - a.atMs) / span;
      return blendPoses(keyframePose(a, hand), keyframePose(b, hand), ease(t));
    }
  }
  return keyframePose(last, hand);
}

/** Smoothstep. Signs decelerate into their held positions rather than arriving linearly. */
function ease(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

export function compileSign(sign: SignDefinition, dominantHand: Hand = 'right'): MotionClip {
  const nonDominantHand: Hand = dominantHand === 'right' ? 'left' : 'right';

  // Both hands' keyframes land on one shared timeline, so a clip is a single
  // list of full-body poses rather than two tracks the sequencer must combine.
  const times = new Set<number>([0, sign.durationMs]);
  for (const k of sign.dominant) times.add(k.atMs);
  for (const k of sign.nonDominant ?? []) times.add(k.atMs);

  const keyframes: Keyframe[] = [...times].sort((a, b) => a - b).map((timeMs) => {
    const layers: Pose[] = [REST_POSTURE, sampleTrack(sign.dominant, dominantHand, timeMs)];
    if (isTwoHanded(sign)) {
      layers.push(sampleTrack(sign.nonDominant!, nonDominantHand, timeMs));
    }
    return { timeMs, pose: composePoses(...layers) };
  });

  return {
    id: sign.id,
    skeletonVersion: 'sfcs-1.0.0',
    durationMs: sign.durationMs,
    keyframes,
    strokeStartMs: sign.strokeStartMs,
    strokeEndMs: sign.strokeEndMs,
    provenance: {
      source: sign.provenance.source,
      method: sign.provenance.validation,
      ...(sign.provenance.note ? { dataset: sign.provenance.note } : {}),
    },
  };
}
