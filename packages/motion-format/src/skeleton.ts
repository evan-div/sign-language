/**
 * The SignFlow Canonical Skeleton (SFCS).
 *
 * Topology mirrors SMPL-X's 55-joint layout (22 body + jaw + 2 eyes + 15 per
 * hand) and its joint ordering. We adopt the topology, NOT the SMPL-X body
 * model: nothing here stores shape or expression coefficients, which keeps the
 * licensing exposure on datasets rather than on our motion format. The reason
 * to match SMPL-X at all is interop -- every dataset, extractor and research
 * model in this field already speaks it, so a novel topology would mean writing
 * a converter for every input source forever.
 *
 * ## Bind pose convention
 *
 * Two choices here are unusual enough to be worth stating plainly, because the
 * whole handshape system depends on them:
 *
 * 1. **Every joint's rest rotation is identity.** Bone geometry lives entirely
 *    in the rest *offsets*. A joint's local rotation is therefore expressed in
 *    world-aligned axes at bind time, which makes handshape specs readable
 *    ("flex about X") instead of a soup of bone-local frames.
 *
 * 2. **The bind pose is a "goalpost", not a T-pose**: upper arms out and down,
 *    forearms vertical, hands up with palms facing forward (+Z) and fingers
 *    pointing up (+Y). This aligns the hand frame with the world frame, so
 *    finger flexion is a rotation about +X and finger spread is a rotation
 *    about +Z, for both hands.
 *
 * World axes: +X is the avatar's left, +Y is up, +Z is forward (toward the
 * viewer). The avatar faces the camera.
 */

import type { Vec3 } from './quat.js';

export const SKELETON_VERSION = 'sfcs-1.0.0';

export type Side = 'left' | 'right';

export interface JointDef {
  readonly name: string;
  /** Index into JOINTS of the parent, or -1 for the root. */
  readonly parent: number;
  /** Translation from the parent joint, in metres, in the bind pose. */
  readonly offset: Vec3;
}

/** Finger geometry, expressed once and mirrored per hand. */
const FINGERS = {
  index:  { base: [0.030, 0.085, 0] as Vec3, seg: [0.040, 0.024] as const, tip: 0.020 },
  middle: { base: [0.010, 0.090, 0] as Vec3, seg: [0.045, 0.028] as const, tip: 0.021 },
  pinky:  { base: [-0.030, 0.078, 0] as Vec3, seg: [0.032, 0.020] as const, tip: 0.017 },
  ring:   { base: [-0.010, 0.086, 0] as Vec3, seg: [0.042, 0.026] as const, tip: 0.020 },
} as const;

/** The thumb is diagonal, so its segments need full vectors rather than a length. */
const THUMB = {
  base: [0.030, 0.018, 0.012] as Vec3,
  seg1: [0.030, 0.026, 0.008] as Vec3,
  seg2: [0.020, 0.018, 0.005] as Vec3,
  tip: [0.015, 0.013, 0.004] as Vec3,
} as const;

/**
 * Sign of the "toward the thumb" axis for a hand.
 *
 * The right hand sits at -X, so its thumb points toward the midline (+X); the
 * left hand mirrors. Finger flexion is unaffected -- only lateral terms flip.
 */
function thumbDir(side: Side): number {
  return side === 'right' ? 1 : -1;
}

function mirrorX(v: Vec3, t: number): Vec3 {
  return [v[0] * t, v[1], v[2]];
}

/** SMPL-X orders hand joints index, middle, pinky, ring, thumb. We match it. */
const FINGER_ORDER = ['index', 'middle', 'pinky', 'ring'] as const;

function buildHand(side: Side, wristIndex: number, startIndex: number): JointDef[] {
  const t = thumbDir(side);
  const joints: JointDef[] = [];
  let next = startIndex;

  for (const finger of FINGER_ORDER) {
    const g = FINGERS[finger];
    const proximal = next;
    joints.push({ name: `${side}_${finger}1`, parent: wristIndex, offset: mirrorX(g.base, t) });
    joints.push({ name: `${side}_${finger}2`, parent: proximal, offset: [0, g.seg[0], 0] });
    joints.push({ name: `${side}_${finger}3`, parent: proximal + 1, offset: [0, g.seg[1], 0] });
    next += 3;
  }

  const thumb = next;
  joints.push({ name: `${side}_thumb1`, parent: wristIndex, offset: mirrorX(THUMB.base, t) });
  joints.push({ name: `${side}_thumb2`, parent: thumb, offset: mirrorX(THUMB.seg1, t) });
  joints.push({ name: `${side}_thumb3`, parent: thumb + 1, offset: mirrorX(THUMB.seg2, t) });

  return joints;
}

const BODY: JointDef[] = [
  { name: 'pelvis',         parent: -1, offset: [0, 0.95, 0] },
  { name: 'left_hip',       parent: 0,  offset: [0.09, -0.06, 0] },
  { name: 'right_hip',      parent: 0,  offset: [-0.09, -0.06, 0] },
  { name: 'spine1',         parent: 0,  offset: [0, 0.10, 0] },
  { name: 'left_knee',      parent: 1,  offset: [0, -0.42, 0] },
  { name: 'right_knee',     parent: 2,  offset: [0, -0.42, 0] },
  { name: 'spine2',         parent: 3,  offset: [0, 0.12, 0] },
  { name: 'left_ankle',     parent: 4,  offset: [0, -0.42, 0] },
  { name: 'right_ankle',    parent: 5,  offset: [0, -0.42, 0] },
  { name: 'spine3',         parent: 6,  offset: [0, 0.12, 0] },
  { name: 'left_foot',      parent: 7,  offset: [0, -0.05, 0.13] },
  { name: 'right_foot',     parent: 8,  offset: [0, -0.05, 0.13] },
  { name: 'neck',           parent: 9,  offset: [0, 0.16, 0] },
  { name: 'left_collar',    parent: 9,  offset: [0.04, 0.11, 0] },
  { name: 'right_collar',   parent: 9,  offset: [-0.04, 0.11, 0] },
  { name: 'head',           parent: 12, offset: [0, 0.09, 0] },
  { name: 'left_shoulder',  parent: 13, offset: [0.13, 0.02, 0] },
  { name: 'right_shoulder', parent: 14, offset: [-0.13, 0.02, 0] },
  { name: 'left_elbow',     parent: 16, offset: [0.15, -0.22, 0.02] },
  { name: 'right_elbow',    parent: 17, offset: [-0.15, -0.22, 0.02] },
  { name: 'left_wrist',     parent: 18, offset: [0, 0.255, 0] },
  { name: 'right_wrist',    parent: 19, offset: [0, 0.255, 0] },
  { name: 'jaw',            parent: 15, offset: [0, 0.02, 0.06] },
  { name: 'left_eye',       parent: 15, offset: [0.032, 0.075, 0.085] },
  { name: 'right_eye',      parent: 15, offset: [-0.032, 0.075, 0.085] },
];

export const JOINTS: readonly JointDef[] = [
  ...BODY,
  ...buildHand('left', 20, BODY.length),
  ...buildHand('right', 21, BODY.length + 15),
];

export const JOINT_COUNT = JOINTS.length;

export const JOINT_INDEX: ReadonlyMap<string, number> = new Map(
  JOINTS.map((j, i) => [j.name, i]),
);

export function jointIndex(name: string): number {
  const i = JOINT_INDEX.get(name);
  if (i === undefined) throw new Error(`Unknown canonical joint: ${name}`);
  return i;
}

/**
 * Fingertip end-effectors.
 *
 * These are not joints -- SMPL-X has three joints per finger and no tip -- but
 * handshape verification needs tip positions, so we carry them as named offsets
 * from the distal joint.
 */
export interface TipSite {
  readonly name: string;
  readonly joint: string;
  readonly offset: Vec3;
}

function buildTips(side: Side): TipSite[] {
  const t = thumbDir(side);
  const tips: TipSite[] = FINGER_ORDER.map((finger) => ({
    name: `${side}_${finger}_tip`,
    joint: `${side}_${finger}3`,
    offset: [0, FINGERS[finger].tip, 0] as Vec3,
  }));
  tips.push({ name: `${side}_thumb_tip`, joint: `${side}_thumb3`, offset: mirrorX(THUMB.tip, t) });
  return tips;
}

export const TIP_SITES: readonly TipSite[] = [...buildTips('left'), ...buildTips('right')];

/** Every joint below the wrist on the given side, in canonical order. */
export function handJoints(side: Side): string[] {
  return JOINTS.map((j) => j.name).filter((n) => n.startsWith(`${side}_`) &&
    /(index|middle|ring|pinky|thumb)[123]$/.test(n));
}
