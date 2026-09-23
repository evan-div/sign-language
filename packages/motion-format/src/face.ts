/**
 * The face channel.
 *
 * Kept as a separate track from the joint pose, for two reasons. The first is
 * interop: a face is driven by named blendshape weights, not by rotations, and
 * every avatar pipeline worth targeting -- VRM 1.0 expressions, ARKit, Live
 * Link -- already speaks that vocabulary. Naming the channels after ARKit means
 * a real avatar can consume this track with a lookup table rather than a
 * translation layer. The second is that the face and the hands are separately
 * authored and separately timed: a brow raise spans a clause while the hands
 * change six times underneath it, and forcing them into one keyframe list would
 * make every facial change a whole-body keyframe.
 *
 * Weights run 0 to 1. Unknown channel names are rejected rather than ignored,
 * for the same reason unknown joints are: a typo that silently does nothing is
 * worse than one that stops.
 *
 * WHAT THIS IS NOT. ARKit has 52 shapes; this names the subset ASL grammar
 * actually uses, and the placeholder mannequin implements them procedurally --
 * a brow bar that moves, not a blendshaped mesh. The names are the contract;
 * the mannequin's rendering of them is a placeholder like everything else about
 * it.
 */

/**
 * The channels we drive, named as ARKit names them.
 *
 * Brows and eyes carry ASL's sentence-type marking; the mouth channels carry
 * mouth morphemes and mouthing. `headShake` and `headNod` are NOT here: those
 * are head rotation, which is a joint, and belong in the pose.
 */
export const FACE_CHANNELS = [
  'browInnerUp',
  'browOuterUpLeft',
  'browOuterUpRight',
  'browDownLeft',
  'browDownRight',
  'eyeWideLeft',
  'eyeWideRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'jawOpen',
  'mouthPucker',
  'mouthFunnel',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFrownLeft',
  'mouthFrownRight',
  'cheekPuff',
  'tongueOut',
] as const;

export type FaceChannel = (typeof FACE_CHANNELS)[number];

export const FACE_CHANNEL_SET: ReadonlySet<string> = new Set(FACE_CHANNELS);

/** Channel name -> weight, 0 to 1. Channels left out are at neutral. */
export type FacePose = Readonly<Partial<Record<FaceChannel, number>>>;

export const NEUTRAL_FACE: FacePose = Object.freeze({});

export interface FaceKeyframe {
  readonly timeMs: number;
  readonly face: FacePose;
}

export function faceWeight(face: FacePose, channel: FaceChannel): number {
  return face[channel] ?? 0;
}

/**
 * Layer face poses, taking the strongest weight for each channel.
 *
 * Maximum rather than replace, which is the opposite of how joint poses
 * compose, and the difference is not an inconsistency. Two markers overlapping
 * on the same joint must resolve to one rotation -- a head cannot be in two
 * places. Two markers both raising the brows should raise them once, not twice
 * and not have the later one cancel the earlier one's stronger raise.
 */
export function composeFaces(...faces: FacePose[]): FacePose {
  const out: Record<string, number> = {};
  for (const face of faces) {
    for (const [channel, weight] of Object.entries(face)) {
      if (weight === undefined) continue;
      const current = out[channel];
      if (current === undefined || weight > current) out[channel] = weight;
    }
  }
  return out as FacePose;
}

/** Linear blend across the union of both poses' channels. */
export function blendFaces(a: FacePose, b: FacePose, t: number): FacePose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const out: Record<string, number> = {};
  for (const channel of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const from = (a as Record<string, number>)[channel] ?? 0;
    const to = (b as Record<string, number>)[channel] ?? 0;
    out[channel] = from + (to - from) * t;
  }
  return out as FacePose;
}

/** Scale every weight, for ramping a marker in and out. */
export function scaleFace(face: FacePose, amount: number): FacePose {
  if (amount >= 1) return face;
  if (amount <= 0) return NEUTRAL_FACE;
  const out: Record<string, number> = {};
  for (const [channel, weight] of Object.entries(face)) {
    if (weight !== undefined) out[channel] = weight * amount;
  }
  return out as FacePose;
}

export function validateFace(face: FacePose): string[] {
  const problems: string[] = [];
  for (const [channel, weight] of Object.entries(face)) {
    if (!FACE_CHANNEL_SET.has(channel)) {
      problems.push(`unknown face channel "${channel}"`);
      continue;
    }
    if (typeof weight !== 'number' || !Number.isFinite(weight)) {
      problems.push(`face channel "${channel}" has a non-finite weight`);
    } else if (weight < 0 || weight > 1) {
      problems.push(`face channel "${channel}" is ${weight}, outside 0..1`);
    }
  }
  return problems;
}

/** Sample a face track at a time, clamping past both ends. */
export function sampleFaceTrack(track: readonly FaceKeyframe[], timeMs: number): FacePose {
  if (track.length === 0) return NEUTRAL_FACE;
  const first = track[0]!;
  if (timeMs <= first.timeMs) return first.face;
  const last = track[track.length - 1]!;
  if (timeMs >= last.timeMs) return last.face;

  for (let i = 0; i < track.length - 1; i++) {
    const a = track[i]!;
    const b = track[i + 1]!;
    if (timeMs <= b.timeMs) {
      const span = b.timeMs - a.timeMs;
      const t = span <= 0 ? 0 : (timeMs - a.timeMs) / span;
      return blendFaces(a.face, b.face, t);
    }
  }
  return last.face;
}
