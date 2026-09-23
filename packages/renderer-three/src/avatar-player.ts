/**
 * The renderer boundary.
 *
 * Everything above this line speaks canonical poses; everything below speaks
 * three.js. Swapping in Babylon, or a real VRM avatar in place of the
 * mannequin, means writing another implementation of this interface -- not
 * touching the engine.
 */

import { Quaternion, type Object3D } from 'three';
import { IDENTITY, JOINTS, NEUTRAL_FACE, type FacePose, type Pose, type Quat } from '@signflow/motion-format';
import { createMannequin, type Mannequin, type MannequinOptions } from './mannequin.js';

export interface AvatarPlayer {
  readonly root: Object3D;
  /** Drive the avatar to a pose. Joints the pose omits return to rest. */
  applyPose(pose: Pose): void;
  /**
   * Drive the face from expression weights. Channels the pose omits return to
   * neutral, for the same reason joints do: otherwise the previous frame's
   * brow raise outlives the clause it belonged to.
   */
  applyFace(face: FacePose): void;
  dispose(): void;
}

export class MannequinPlayer implements AvatarPlayer {
  private readonly mannequin: Mannequin;
  private readonly scratch = new Quaternion();

  constructor(options: MannequinOptions = {}) {
    this.mannequin = createMannequin(options);
  }

  get root(): Object3D {
    return this.mannequin.root;
  }

  /**
   * Poses are sparse: a handshape names fingers, a posture names arms. Any
   * joint the pose leaves out must be reset, or the previous frame's rotation
   * survives into this one -- which shows up as fingers that never uncurl.
   */
  applyPose(pose: Pose): void {
    for (const joint of JOINTS) {
      const node = this.mannequin.joints.get(joint.name);
      if (!node) continue;
      const q: Quat = pose[joint.name] ?? IDENTITY;
      this.scratch.set(q[0], q[1], q[2], q[3]);
      node.quaternion.copy(this.scratch);
    }
  }

  applyFace(face: FacePose = NEUTRAL_FACE): void {
    this.mannequin.applyFace(face);
  }

  dispose(): void {
    this.mannequin.dispose();
  }
}

export function createAvatarPlayer(options: MannequinOptions = {}): AvatarPlayer {
  return new MannequinPlayer(options);
}
