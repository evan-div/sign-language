/**
 * Reading motion clips produced outside the engine.
 *
 * The motion pipeline writes clips as JSON; this reads them back. Parsing is
 * strict on purpose. A clip that came from an extractor is data of unknown
 * quality from another process, and the failure it can cause -- a subtly
 * malformed pose that renders as a broken limb rather than as an error -- is
 * much harder to trace than a rejected file.
 */

import { JOINT_INDEX, SKELETON_VERSION } from './skeleton.js';
import type { MotionClip, Keyframe, Pose, Provenance } from './pose.js';
import { FACE_CHANNEL_SET, type FaceKeyframe, type FacePose } from './face.js';
import type { Quat } from './quat.js';

export interface ClipParseResult {
  readonly clip?: MotionClip;
  readonly errors: readonly string[];
  /** Problems worth reporting that did not stop the clip loading. */
  readonly warnings: readonly string[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parsePose(raw: unknown, where: string, errors: string[], warnings: string[]): Pose {
  if (typeof raw !== 'object' || raw === null) {
    errors.push(`${where}: pose is not an object`);
    return {};
  }
  const pose: Record<string, Quat> = {};
  for (const [joint, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!JOINT_INDEX.has(joint)) {
      // Unknown joints are dropped rather than fatal: a clip from a newer
      // skeleton should still play the joints this one has.
      warnings.push(`${where}: ignoring unknown joint "${joint}"`);
      continue;
    }
    if (!Array.isArray(value) || value.length !== 4 || !value.every(isFiniteNumber)) {
      errors.push(`${where}: joint "${joint}" is not a quaternion`);
      continue;
    }
    const [x, y, z, w] = value as [number, number, number, number];
    const length = Math.hypot(x, y, z, w);
    if (Math.abs(length - 1) > 1e-3) {
      errors.push(`${where}: joint "${joint}" is not normalised (|q|=${length.toFixed(4)})`);
      continue;
    }
    pose[joint] = [x / length, y / length, z / length, w / length];
  }
  return pose;
}

/**
 * The face track, parsed the way the pose is: unknown channels dropped with a
 * warning, malformed weights refused.
 *
 * Out-of-range weights are an error rather than a clamp. A weight of 3 means
 * the producer is using a different convention -- degrees, or a percentage --
 * and clamping it to 1 would hide that behind a face that is merely wrong.
 */
function parseFace(raw: unknown, where: string, errors: string[], warnings: string[]): FacePose {
  if (typeof raw !== 'object' || raw === null) {
    errors.push(`${where}: face is not an object`);
    return {};
  }
  const face: Record<string, number> = {};
  for (const [channel, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!FACE_CHANNEL_SET.has(channel)) {
      warnings.push(`${where}: ignoring unknown face channel "${channel}"`);
      continue;
    }
    if (!isFiniteNumber(value)) {
      errors.push(`${where}: face channel "${channel}" is not a number`);
      continue;
    }
    if (value < 0 || value > 1) {
      errors.push(`${where}: face channel "${channel}" is ${value}, outside 0..1`);
      continue;
    }
    face[channel] = value;
  }
  return face as FacePose;
}

export function parseClip(raw: unknown): ClipParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof raw !== 'object' || raw === null) {
    return { errors: ['clip is not an object'], warnings };
  }
  const input = raw as Record<string, unknown>;

  if (typeof input.id !== 'string' || input.id.length === 0) errors.push('missing id');
  if (input.skeletonVersion !== SKELETON_VERSION) {
    // Refused rather than warned: joint offsets changing between versions
    // silently moves every hand, which is exactly the bug nobody finds.
    errors.push(
      `skeleton version mismatch: clip is ${String(input.skeletonVersion)}, engine is ${SKELETON_VERSION}`,
    );
  }
  if (!Array.isArray(input.keyframes) || input.keyframes.length === 0) {
    errors.push('clip has no keyframes');
  }

  const keyframes: Keyframe[] = [];
  if (Array.isArray(input.keyframes)) {
    let previous = -Infinity;
    input.keyframes.forEach((frame, i) => {
      const where = `keyframe ${i}`;
      if (typeof frame !== 'object' || frame === null) {
        errors.push(`${where}: not an object`);
        return;
      }
      const { timeMs, pose } = frame as Record<string, unknown>;
      if (!isFiniteNumber(timeMs)) {
        errors.push(`${where}: timeMs is not a number`);
        return;
      }
      if (timeMs < previous) errors.push(`${where}: timeMs goes backwards`);
      previous = timeMs;
      keyframes.push({ timeMs, pose: parsePose(pose, where, errors, warnings) });
    });
  }

  const faceKeyframes: FaceKeyframe[] = [];
  if (input.faceKeyframes !== undefined) {
    if (!Array.isArray(input.faceKeyframes)) {
      errors.push('faceKeyframes is not an array');
    } else {
      let previousFace = -Infinity;
      input.faceKeyframes.forEach((frame, i) => {
        const where = `face keyframe ${i}`;
        if (typeof frame !== 'object' || frame === null) {
          errors.push(`${where}: not an object`);
          return;
        }
        const { timeMs, face } = frame as Record<string, unknown>;
        if (!isFiniteNumber(timeMs)) {
          errors.push(`${where}: timeMs is not a number`);
          return;
        }
        if (timeMs < previousFace) errors.push(`${where}: timeMs goes backwards`);
        previousFace = timeMs;
        faceKeyframes.push({ timeMs, face: parseFace(face, where, errors, warnings) });
      });
    }
  }

  const durationMs = isFiniteNumber(input.durationMs)
    ? input.durationMs
    : keyframes.length > 0 ? keyframes[keyframes.length - 1]!.timeMs : 0;

  const stroke = {
    ...(isFiniteNumber(input.strokeStartMs) ? { strokeStartMs: input.strokeStartMs } : {}),
    ...(isFiniteNumber(input.strokeEndMs) ? { strokeEndMs: input.strokeEndMs } : {}),
  };
  if (stroke.strokeStartMs !== undefined && stroke.strokeEndMs !== undefined
      && stroke.strokeStartMs >= stroke.strokeEndMs) {
    errors.push('stroke ends before it starts');
  }

  const rawProvenance = input.provenance as Record<string, unknown> | undefined;
  if (!rawProvenance || typeof rawProvenance.source !== 'string') {
    // Not fatal, but a clip with no history cannot be reviewed or replaced
    // with any confidence about what it was.
    warnings.push('clip has no provenance; its origin is unrecoverable');
  }
  const provenance: Provenance | undefined = rawProvenance && typeof rawProvenance.source === 'string'
    ? {
        source: rawProvenance.source,
        ...(typeof rawProvenance.dataset === 'string' ? { dataset: rawProvenance.dataset } : {}),
        ...(typeof rawProvenance.license === 'string' ? { license: rawProvenance.license } : {}),
        ...(typeof rawProvenance.method === 'string' ? { method: rawProvenance.method } : {}),
      }
    : undefined;

  if (errors.length > 0) return { errors, warnings };

  return {
    errors,
    warnings,
    clip: {
      id: input.id as string,
      skeletonVersion: SKELETON_VERSION,
      durationMs,
      keyframes,
      ...stroke,
      ...(faceKeyframes.length > 0 ? { faceKeyframes } : {}),
      ...(provenance ? { provenance } : {}),
    },
  };
}

/** Parse, or throw with every problem listed. */
export function loadClip(raw: unknown): MotionClip {
  const result = parseClip(raw);
  if (!result.clip) {
    throw new Error(`Invalid motion clip:\n  ${result.errors.join('\n  ')}`);
  }
  return result.clip;
}
