/**
 * Whole-body postures: where the arms are, independent of what the hands do.
 *
 * Kept separate from handshapes so the two compose. A handshape describes
 * fingers relative to a palm-out, fingers-up hand; a posture puts that hand
 * somewhere in signing space. Layering them is what lets 26 letters reuse one
 * arm pose, and later lets one sign's handshape be reused at another location.
 */

import {
  quatFromEulerDeg,
  quatMultiply,
  composePoses,
  IDENTITY,
  type Pose,
  type Quat,
} from '@signflow/motion-format';
import type { Hand } from './handshapes/spec.js';

/** Mirror a rotation across the body's sagittal plane. */
function mirrorQuat(q: Quat): Quat {
  return [q[0], -q[1], -q[2], q[3]];
}

function mirrored(prefix: string, joints: Record<string, Quat>): Pose {
  const out: Record<string, Quat> = {};
  for (const [joint, q] of Object.entries(joints)) {
    out[joint.replace('right_', prefix)] = prefix === 'right_' ? q : mirrorQuat(q);
  }
  return out;
}

/**
 * Wrist correction for the spelling anchor.
 *
 * Solved, not hand-authored: it is the inverse of the rotation the shoulder and
 * elbow accumulate, so that with this applied the hand sits palm-out and
 * fingers-up regardless of how the arm got there. Handshape wrist overrides
 * (G, H, P, Q) compose on top of this rather than replacing it.
 */
export const SPELLING_WRIST_CORRECTION: Quat = [
  -0.359456, -0.336829, -0.112137, 0.862996,
];

const SPELLING_ARM: Record<string, Quat> = {
  right_shoulder: quatFromEulerDeg(8.9, 40.8, 18.3),
  right_elbow: quatFromEulerDeg(28.1, -2.1, 3.8),
  right_wrist: SPELLING_WRIST_CORRECTION,
};

/**
 * Arms hanging at the sides, a little away from the body.
 *
 * Solved with forward kinematics rather than tuned by eye. The bind pose is a
 * goalpost, with the upper arm already 34 degrees out and down, so the shoulder
 * has to turn the arm IN: +24 degrees about Z leaves it 10 degrees from
 * vertical. (An earlier value of -10 turned it the wrong way, to 44 degrees, and
 * the wrists hung 40cm from the midline.) The shoulder's rotation carries the
 * forearm with it, so the elbow undoes 30 degrees about Z after folding the
 * forearm down, which leaves the forearm 6 degrees from vertical and the wrist
 * about 24cm from the midline -- clear of the hip, but not a coat hanger.
 */
const RESTING_ARM: Record<string, Quat> = {
  right_shoulder: quatFromEulerDeg(0, 0, 24),
  right_elbow: quatMultiply(quatFromEulerDeg(0, 0, -30), quatFromEulerDeg(168, 0, 0)),
  right_wrist: IDENTITY,
};

/** Arms hanging at the sides. The start and end of every utterance. */
export const REST_POSTURE: Pose = composePoses(
  mirrored('right_', RESTING_ARM),
  mirrored('left_', RESTING_ARM),
);

/**
 * Dominant hand raised into fingerspelling position -- in front of the
 * dominant shoulder at roughly chin height, palm toward the viewer. The
 * non-dominant arm stays at rest, which is correct: ASL fingerspelling is
 * one-handed.
 */
export const SPELLING_POSTURE: Pose = composePoses(
  REST_POSTURE,
  mirrored('right_', SPELLING_ARM),
);

/**
 * Layer a compiled handshape onto a posture.
 *
 * The wrist is composed rather than replaced: the posture's wrist correction
 * orients the hand, and the handshape's own wrist rotation (only G, H, P and Q
 * have one) turns it from there.
 */
export function applyHandshape(posture: Pose, handshape: Pose, hand: Hand = 'right'): Pose {
  const wristJoint = `${hand}_wrist`;
  const postureWrist = posture[wristJoint] ?? IDENTITY;
  const handWrist = handshape[wristJoint];

  const merged = composePoses(posture, handshape);
  return {
    ...merged,
    [wristJoint]: handWrist ? quatMultiply(postureWrist, handWrist) : postureWrist,
  };
}
