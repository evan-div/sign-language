/**
 * Forward kinematics on the canonical skeleton.
 *
 * This exists for verification as much as for rendering. Because handshapes are
 * authored as joint rotations, the only way to check that "F" really is a
 * thumb-index pinch is to solve the chain and measure the distance between the
 * two fingertips. The handshape tests do exactly that, and the same solver
 * later backs the pipeline's handshape classifier.
 */

import {
  quatMultiply,
  quatRotateVec3,
  vec3Add,
  IDENTITY,
  type Quat,
  type Vec3,
} from './quat.js';
import { JOINTS, JOINT_INDEX, TIP_SITES } from './skeleton.js';
import { rotationOf, type Pose } from './pose.js';

export interface SolvedSkeleton {
  /** World position of each joint, indexed as JOINTS. */
  readonly positions: readonly Vec3[];
  /** World rotation of each joint, indexed as JOINTS. */
  readonly rotations: readonly Quat[];
}

export function solveFK(pose: Pose): SolvedSkeleton {
  const positions: Vec3[] = new Array(JOINTS.length);
  const rotations: Quat[] = new Array(JOINTS.length);

  // JOINTS is ordered parents-before-children, so a single forward pass works.
  for (let i = 0; i < JOINTS.length; i++) {
    const joint = JOINTS[i]!;
    const local = rotationOf(pose, joint.name);

    if (joint.parent < 0) {
      positions[i] = joint.offset;
      rotations[i] = local;
      continue;
    }

    const parentPos = positions[joint.parent]!;
    const parentRot = rotations[joint.parent]!;
    positions[i] = vec3Add(parentPos, quatRotateVec3(parentRot, joint.offset));
    rotations[i] = quatMultiply(parentRot, local);
  }

  return { positions, rotations };
}

export function jointPosition(solved: SolvedSkeleton, name: string): Vec3 {
  const i = JOINT_INDEX.get(name);
  if (i === undefined) throw new Error(`Unknown canonical joint: ${name}`);
  return solved.positions[i]!;
}

export function jointRotation(solved: SolvedSkeleton, name: string): Quat {
  const i = JOINT_INDEX.get(name);
  if (i === undefined) throw new Error(`Unknown canonical joint: ${name}`);
  return solved.rotations[i]!;
}

/** World position of a fingertip end-effector (see TIP_SITES). */
export function tipPosition(solved: SolvedSkeleton, tipName: string): Vec3 {
  const site = TIP_SITES.find((s) => s.name === tipName);
  if (!site) throw new Error(`Unknown tip site: ${tipName}`);
  const i = JOINT_INDEX.get(site.joint)!;
  return vec3Add(solved.positions[i]!, quatRotateVec3(solved.rotations[i]!, site.offset));
}

/** The direction the palm faces, in world space. +Z at bind. */
export function palmNormal(solved: SolvedSkeleton, side: 'left' | 'right'): Vec3 {
  return quatRotateVec3(jointRotation(solved, `${side}_wrist`), [0, 0, 1]);
}

/** The direction the fingers point, in world space. +Y at bind. */
export function fingerDirection(solved: SolvedSkeleton, side: 'left' | 'right'): Vec3 {
  return quatRotateVec3(jointRotation(solved, `${side}_wrist`), [0, 1, 0]);
}

export const REST_SOLVED: SolvedSkeleton = solveFK({});
export { IDENTITY };
