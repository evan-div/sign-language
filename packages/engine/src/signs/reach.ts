/**
 * Putting a named part of the hand at a named place.
 *
 * The solved location table gives arm rotations that put the WRIST at a target.
 * That is the wrong articulator for most signs made at the face: a sign "at the
 * chin" touches the chin with the fingertips, and the wrist sits a hand's length
 * below. Placing the wrist at the chin instead leaves the fingertips above the
 * crown of the head -- measured at 6 to 12cm above it for FOREHEAD, TEMPLE and
 * EAR with the fingers pointing up.
 *
 * The fix does not need general inverse kinematics, only the observation that
 * an orientation is stated in WORLD directions and so does not depend on how
 * the arm got there. If the hand's world rotation is O, then the offset from
 * the wrist to any point in the hand is a known constant rotated by O. So
 * "articulator at T" is just "wrist at T minus that offset", and what remains
 * is a three-degree-of-freedom position solve on a two-link arm -- which is what
 * the offline location solver already does, seeded here from its answer.
 *
 * Note this is not the finger IK the architecture ruled out. That objection was
 * to fitting finger rotations to noisy landmark positions, where small position
 * errors become large angle errors and jitter. This is a well-conditioned
 * position solve on two long bones from an exact target, run once per sign at
 * compile time, not per frame on measured data.
 */

import {
  solveFK, jointPosition, jointRotation, tipPosition, quatFromEulerDeg, quatRotateVec3,
  vec3Add, vec3Distance, vec3Sub, segmentPenetration, type Pose, type Quat, type Vec3,
} from '@signflow/motion-format';
import { compileHandshape } from '../handshapes/compile.js';
import type { HandshapeSpec } from '../handshapes/spec.js';

/**
 * Which part of the hand is placed at the location.
 *
 * `wrist` is the default and is what the solved location table means literally.
 * The others are the parts that actually touch things: a pointing finger, the
 * fingertips of a flat hand, the heel or face of the palm, the knuckles of a
 * fist.
 */
export type ContactSite =
  | 'wrist' | 'index' | 'middle' | 'ring' | 'pinky' | 'thumb' | 'palm' | 'knuckles';

export type Arm = readonly [number, number, number, number, number, number];

const armPose = (p: Arm): Pose => ({
  right_shoulder: quatFromEulerDeg(p[0], p[1], p[2]),
  right_elbow: quatFromEulerDeg(p[3], p[4], p[5]),
});

/**
 * The offset from the wrist to a contact site, in the hand's own frame.
 *
 * Computed by posing the hand with identity arm rotations. Because every joint's
 * rest rotation is identity, that leaves the hand frame aligned with the world
 * frame, so the difference of the two world positions IS the hand-local offset.
 */
export function contactOffset(spec: HandshapeSpec, site: ContactSite): Vec3 {
  if (site === 'wrist') return [0, 0, 0];
  const solved = solveFK(compileHandshape(spec, 'right'));
  const wrist = jointPosition(solved, 'right_wrist');

  if (site === 'knuckles') return vec3Sub(jointPosition(solved, 'right_middle1'), wrist);
  if (site === 'palm') {
    // The palm's face, not a joint: a little over half way to the knuckles and
    // a centimetre and a half out along the palm normal.
    const knuckle = vec3Sub(jointPosition(solved, 'right_middle1'), wrist);
    return [knuckle[0] * 0.55, knuckle[1] * 0.55, knuckle[2] * 0.55 + 0.015];
  }
  return vec3Sub(tipPosition(solved, `right_${site}_tip`), wrist);
}

/**
 * Cost of an arm pose against a wrist target.
 *
 * Reaching the point comes first; the rest only chooses between poses that
 * reach it. Keep the rotations modest, keep the elbow from riding above the
 * wrist, keep the elbow and wrist out of the body, and among everything that
 * reaches, prefer the elbow low.
 *
 * The elbow terms are the ones with history. "At least 13cm off the midline"
 * was a stand-in for "not inside the chest" that only looked sideways, so for
 * targets at the face -- where the elbow naturally comes forward and in -- the
 * only way to satisfy it was to raise the elbow, and every face location solved
 * with the elbow flared to shoulder height. Measuring penetration in all three
 * axes lets the elbow come in front of the ribs where it belongs. Making
 * "elbow low" a hard ceiling instead fails the other way: a hand above the head
 * REQUIRES the elbow above the shoulder, and as a constraint it left ABOVE_HEAD
 * 15cm short. It is a preference, so it settles ties and yields to reach.
 */
function cost(p: Arm, target: Vec3): number {
  const solved = solveFK(armPose(p));
  const wrist = jointPosition(solved, 'right_wrist');
  const elbow = jointPosition(solved, 'right_elbow');
  const shoulder = jointPosition(solved, 'right_shoulder');
  const reg = 2.2e-7 * p.reduce((a, v) => a + v * v, 0);
  const elbowAboveWrist = Math.max(0, elbow[1] - wrist[1] + 0.02);
  // Whole limbs, not just their ends: an upper arm can have both joints clear
  // of the torso and its middle inside it.
  const upperArm = Math.max(0, segmentPenetration(shoulder, elbow) + 0.01);
  const forearm = Math.max(0, segmentPenetration(elbow, wrist) + 0.01);
  const elbowHeld = Math.max(0, elbow[1] - 1.20);
  return vec3Distance(wrist, target) + reg + elbowAboveWrist * 0.6
    + upperArm * 2.0 + forearm * 2.0 + elbowHeld * 0.02;
}

/**
 * Pattern search from a seed. Deterministic, and a compiled sign must be the
 * same every run, so there is no randomness and no restart schedule -- the seed
 * is the table's own answer for a nearby point.
 */
export function solveArm(target: Vec3, seed: Arm): Arm {
  let p: Arm = seed;
  let c = cost(p, target);
  let step = 14;
  while (step > 0.01) {
    let improved = false;
    for (let i = 0; i < 6; i++) {
      for (const d of [step, -step]) {
        const cand = [...p] as [number, number, number, number, number, number];
        cand[i] = p[i]! + d;
        if (Math.abs(cand[i]!) > 155) continue;
        const cc = cost(cand, target);
        if (cc < c - 1e-9) { p = cand; c = cc; improved = true; }
      }
    }
    if (!improved) step /= 2;
  }
  return p;
}

export interface ReachedArm {
  readonly shoulder: Vec3;
  readonly elbow: Vec3;
  /** Rotation that leaves the hand's world orientation at identity. */
  readonly wristCorrection: Quat;
  /** How far the wrist ended up from where it was asked to be, in metres. */
  readonly residual: number;
}

/**
 * Solve the arm so that `site` on the hand lands on `target` with the hand at
 * world orientation `orientation`.
 */
export function reach(target: Vec3, offsetLocal: Vec3, orientation: Quat, seed: Arm): ReachedArm {
  const wristTarget = vec3Sub(target, quatRotateVec3(orientation, offsetLocal));
  const arm = solveArm(wristTarget, seed);
  const solved = solveFK(armPose(arm));
  const accumulated = jointRotation(solved, 'right_wrist');
  return {
    shoulder: [arm[0], arm[1], arm[2]],
    elbow: [arm[3], arm[4], arm[5]],
    wristCorrection: [-accumulated[0], -accumulated[1], -accumulated[2], accumulated[3]],
    residual: vec3Distance(jointPosition(solved, 'right_wrist'), wristTarget),
  };
}

/** Where the contact site actually ended up, for verification. */
export function reachedContact(arm: ReachedArm, offsetLocal: Vec3, orientation: Quat): Vec3 {
  const solved = solveFK(armPose([...arm.shoulder, ...arm.elbow] as Arm));
  return vec3Add(jointPosition(solved, 'right_wrist'), quatRotateVec3(orientation, offsetLocal));
}
