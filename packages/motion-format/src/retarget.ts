/**
 * Canonical skeleton -> avatar rig mapping.
 *
 * Motion is stored on the canonical skeleton and mapped onto an avatar at load
 * time, so that motion data is never coupled to a particular character. VRM 1.0
 * is our rig contract because it is glTF-based, openly specified, and defines a
 * complete humanoid bone map including full finger chains.
 *
 * Note that SMPL-X calls the fourth finger "pinky" while VRM calls it "little",
 * and SMPL-X's thumb1 is VRM's thumbMetacarpal. Those two renamings are the
 * only surprises in the table.
 */

import type { Quat } from './quat.js';
import { IDENTITY } from './quat.js';

export type VrmBoneName = string;

function fingerMap(side: 'left' | 'right'): Record<string, VrmBoneName> {
  const s = side;
  const cap = side === 'left' ? 'left' : 'right';
  const segments = ['Proximal', 'Intermediate', 'Distal'];
  const out: Record<string, VrmBoneName> = {};

  for (const [canonical, vrm] of [['index', 'Index'], ['middle', 'Middle'], ['ring', 'Ring'], ['pinky', 'Little']] as const) {
    segments.forEach((seg, i) => {
      out[`${s}_${canonical}${i + 1}`] = `${cap}${vrm}${seg}`;
    });
  }
  // The thumb has a metacarpal where the other fingers have a proximal.
  ['Metacarpal', 'Proximal', 'Distal'].forEach((seg, i) => {
    out[`${s}_thumb${i + 1}`] = `${cap}Thumb${seg}`;
  });
  return out;
}

/** Canonical joint name -> VRM 1.0 humanoid bone name. */
export const CANONICAL_TO_VRM: Readonly<Record<string, VrmBoneName>> = Object.freeze({
  pelvis: 'hips',
  spine1: 'spine',
  spine2: 'chest',
  spine3: 'upperChest',
  neck: 'neck',
  head: 'head',
  jaw: 'jaw',
  left_eye: 'leftEye',
  right_eye: 'rightEye',

  left_collar: 'leftShoulder',
  left_shoulder: 'leftUpperArm',
  left_elbow: 'leftLowerArm',
  left_wrist: 'leftHand',
  right_collar: 'rightShoulder',
  right_shoulder: 'rightUpperArm',
  right_elbow: 'rightLowerArm',
  right_wrist: 'rightHand',

  left_hip: 'leftUpperLeg',
  left_knee: 'leftLowerLeg',
  left_ankle: 'leftFoot',
  left_foot: 'leftToes',
  right_hip: 'rightUpperLeg',
  right_knee: 'rightLowerLeg',
  right_ankle: 'rightFoot',
  right_foot: 'rightToes',

  ...fingerMap('left'),
  ...fingerMap('right'),
});

export const VRM_TO_CANONICAL: Readonly<Record<VrmBoneName, string>> = Object.freeze(
  Object.fromEntries(Object.entries(CANONICAL_TO_VRM).map(([k, v]) => [v, k])),
);

/**
 * Per-bone correction applied when a target rig's bind pose differs from ours.
 *
 * The procedural mannequin is built in the canonical bind pose, so every
 * correction is identity and retargeting is a direct copy. A real VRM avatar
 * imported in T-pose will need real corrections here -- computed once at load
 * from the two bind poses, not hand-authored.
 */
export interface RetargetMap {
  readonly name: string;
  readonly bones: Readonly<Record<string, VrmBoneName>>;
  readonly corrections: Readonly<Record<string, Quat>>;
}

export const IDENTITY_RETARGET: RetargetMap = Object.freeze({
  name: 'canonical-bind',
  bones: CANONICAL_TO_VRM,
  corrections: {},
});

export function correctionFor(map: RetargetMap, joint: string): Quat {
  return map.corrections[joint] ?? IDENTITY;
}
