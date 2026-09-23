/**
 * Poses and motion clips.
 *
 * A Pose is sparse on purpose: a handshape only names finger joints, a wrist
 * orientation only names the wrist. Composing sparse poses is how we layer a
 * handshape onto an arm posture without either one knowing about the other.
 */

import { IDENTITY, quatSlerp, type Quat } from './quat.js';
import { JOINT_INDEX } from './skeleton.js';
import { sampleFaceTrack, NEUTRAL_FACE, type FaceKeyframe, type FacePose } from './face.js';

/** Joint name -> local rotation. Joints left out are at their rest rotation. */
export type Pose = Readonly<Record<string, Quat>>;

export const REST_POSE: Pose = Object.freeze({});

export function rotationOf(pose: Pose, joint: string): Quat {
  return pose[joint] ?? IDENTITY;
}

/**
 * Layer poses left to right. Later poses win on joints they name.
 *
 * This is a replace, not an additive blend -- correct for "arm posture, then
 * handshape on top", which is the only composition v0.1 needs. Additive
 * layering belongs to the non-manual track and is not implemented yet.
 */
export function composePoses(...poses: Pose[]): Pose {
  return Object.assign({}, ...poses) as Pose;
}

/** Per-joint slerp across the union of both poses' joints. */
export function blendPoses(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const out: Record<string, Quat> = {};
  for (const joint of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[joint] = quatSlerp(rotationOf(a, joint), rotationOf(b, joint), t);
  }
  return out;
}

export function validatePose(pose: Pose): string[] {
  const problems: string[] = [];
  for (const [joint, q] of Object.entries(pose)) {
    if (!JOINT_INDEX.has(joint)) {
      problems.push(`unknown joint "${joint}"`);
      continue;
    }
    const len = Math.hypot(q[0], q[1], q[2], q[3]);
    if (!Number.isFinite(len)) problems.push(`joint "${joint}" has a non-finite rotation`);
    else if (Math.abs(len - 1) > 1e-3) problems.push(`joint "${joint}" rotation is not normalised (|q|=${len.toFixed(4)})`);
  }
  return problems;
}

/**
 * A keyframed motion clip on the canonical skeleton.
 *
 * `strokeStartMs`/`strokeEndMs` are what let the sequencer trim a clip's own
 * rest-to-sign ramps when concatenating signs. Without them every concatenation
 * plays two ramps back to back, which is exactly the stop-start artefact we are
 * trying to avoid. Cheap to record now, expensive to backfill later.
 */
export interface MotionClip {
  readonly id: string;
  readonly skeletonVersion: string;
  readonly durationMs: number;
  readonly keyframes: readonly Keyframe[];
  readonly strokeStartMs?: number;
  readonly strokeEndMs?: number;
  /**
   * The face, on its own timeline. Sparse and usually absent: a brow raise
   * spans a clause while the hands change six times underneath it, so tying
   * the two together would make every facial change a whole-body keyframe.
   */
  readonly faceKeyframes?: readonly FaceKeyframe[];
  readonly provenance?: Provenance;
}

export interface Keyframe {
  readonly timeMs: number;
  readonly pose: Pose;
}

export interface Provenance {
  readonly source: string;
  readonly dataset?: string;
  readonly license?: string;
  readonly method?: string;
}

/** Sample a clip's face track at a time. Neutral when the clip carries none. */
export function sampleClipFace(clip: MotionClip, timeMs: number): FacePose {
  return clip.faceKeyframes ? sampleFaceTrack(clip.faceKeyframes, timeMs) : NEUTRAL_FACE;
}

/** Sample a clip at a time, slerping between the surrounding keyframes. */
export function sampleClip(clip: MotionClip, timeMs: number): Pose {
  const frames = clip.keyframes;
  if (frames.length === 0) return REST_POSE;
  const first = frames[0]!;
  if (timeMs <= first.timeMs) return first.pose;
  const last = frames[frames.length - 1]!;
  if (timeMs >= last.timeMs) return last.pose;

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i]!;
    const b = frames[i + 1]!;
    if (timeMs <= b.timeMs) {
      const span = b.timeMs - a.timeMs;
      const t = span <= 0 ? 0 : (timeMs - a.timeMs) / span;
      return blendPoses(a.pose, b.pose, t);
    }
  }
  return last.pose;
}
