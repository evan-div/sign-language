/**
 * Compiles a HandshapeSpec into canonical-skeleton joint rotations.
 *
 * Relies on the canonical bind pose (see motion-format/skeleton.ts): fingers
 * point +Y, the palm faces +Z, and every joint's rest rotation is identity.
 * Flexion is therefore a rotation about +X and lateral fan is a rotation
 * about +Z, for both hands.
 */

import {
  quatFromEulerDeg,
  quatMultiply,
  DEG,
  quatFromAxisAngle,
  type Pose,
  type Quat,
} from '@signflow/motion-format';
import {
  FAN_DIRECTION,
  FINGERS,
  MAX_DIP_FLEX,
  MAX_MCP_FLEX,
  MAX_PIP_FLEX,
  MAX_SPREAD,
  type FingerName,
  type FingerSpec,
  type Hand,
  type HandshapeSpec,
} from './spec.js';

export type { Hand };

const X_AXIS = [1, 0, 0] as const;
const Z_AXIS = [0, 0, 1] as const;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * The MCP joint carries both flexion and lateral fan.
 *
 * Order matters: fan first, then flex. Flexing after fanning keeps a spread
 * finger curling in its own plane, which is what a real hand does. The reverse
 * order swings an already-curled finger sideways and looks broken.
 */
function knuckleRotation(flex: number, fan: number, mirror: boolean): Quat {
  const flexQ = quatFromAxisAngle(X_AXIS, clamp01(flex) * MAX_MCP_FLEX * DEG);
  const fanAngle = -fan * MAX_SPREAD * DEG * (mirror ? -1 : 1);
  const fanQ = quatFromAxisAngle(Z_AXIS, fanAngle);
  return quatMultiply(fanQ, flexQ);
}

function fingerPose(
  hand: Hand,
  finger: FingerName,
  spec: FingerSpec,
  defaultSpread: number,
  mirror: boolean,
): Record<string, Quat> {
  const spread = spec.spread ?? defaultSpread * FAN_DIRECTION[finger];
  const [mcp, pip, dip] = spec.flex;
  return {
    [`${hand}_${finger}1`]: knuckleRotation(mcp, spread, mirror),
    [`${hand}_${finger}2`]: quatFromAxisAngle(X_AXIS, clamp01(pip) * MAX_PIP_FLEX * DEG),
    [`${hand}_${finger}3`]: quatFromAxisAngle(X_AXIS, clamp01(dip) * MAX_DIP_FLEX * DEG),
  };
}

/**
 * Mirror a rotation for the left hand.
 *
 * Reflecting across the YZ plane negates the Y and Z components of the
 * quaternion and leaves X and W. Finger flexion (pure X) is therefore
 * untouched, which is exactly right -- both hands curl the same way -- while
 * lateral terms flip.
 */
function mirrorQuat(q: Quat): Quat {
  return [q[0], -q[1], -q[2], q[3]];
}

export function compileHandshape(spec: HandshapeSpec, hand: Hand = 'right'): Pose {
  const mirror = hand === 'left';
  const defaultSpread = spec.spread ?? 0;
  const pose: Record<string, Quat> = {};

  for (const finger of FINGERS) {
    Object.assign(pose, fingerPose(hand, finger, spec[finger], defaultSpread, mirror));
  }

  const thumb: Array<[string, readonly [number, number, number]]> = [
    [`${hand}_thumb1`, spec.thumb.metacarpal],
    [`${hand}_thumb2`, spec.thumb.proximal],
    [`${hand}_thumb3`, spec.thumb.distal],
  ];
  for (const [joint, euler] of thumb) {
    const q = quatFromEulerDeg(euler[0], euler[1], euler[2]);
    pose[joint] = mirror ? mirrorQuat(q) : q;
  }

  if (spec.wrist) {
    const q = quatFromEulerDeg(spec.wrist[0], spec.wrist[1], spec.wrist[2]);
    pose[`${hand}_wrist`] = mirror ? mirrorQuat(q) : q;
  }

  return pose;
}
