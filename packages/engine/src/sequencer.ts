/**
 * Turns an ordered list of signs and fingerspelled words into one timeline.
 *
 * The important move is trimming each clip to its stroke. A sign clip contains
 * its own approach from rest and release back to rest; concatenating whole clips
 * plays a release straight into the next approach, which is the stop-start
 * artefact that makes avatar signing look like a slideshow. So the sequencer
 * keeps only the meaningful middle of each clip and generates the travel
 * between them itself.
 */

import {
  blendPoses, quatFromEulerDeg, quatMultiply, sampleClip,
  solveFK, jointPosition, vec3Distance,
  type MotionClip, type Pose, type Quat,
} from '@signflow/motion-format';
import { planFingerspell, sampleFingerspell, type FingerspellPlan, type LetterSegment } from './fingerspell.js';
import { REST_POSTURE } from './postures.js';
import type { Hand } from './handshapes/spec.js';
import { compileSign } from './signs/compile.js';
import { signDefinition } from './signs/library.js';

export type SequenceItem =
  | { readonly kind: 'sign'; readonly signId: string }
  | { readonly kind: 'fingerspell'; readonly word: string };

export interface SequenceOptions {
  /**
   * Baseline travel time between two items, before distance is taken into
   * account. See `transitionFor`.
   */
  readonly transitionMs?: number;
  /** Time to raise the hands from rest before the first item. */
  readonly leadInMs?: number;
  /** Time to lower them again after the last. */
  readonly tailMs?: number;
  readonly speed?: number;
  readonly hand?: Hand;
  /**
   * A deliberate pause held at rest after the hands are down, distinct from the
   * time it takes to lower them. Sentence-final punctuation sets this.
   */
  readonly endPauseMs?: number;
}

const DEFAULTS = {
  transitionMs: 130,
  leadInMs: 300,
  tailMs: 380,
  speed: 1,
  hand: 'right' as Hand,
  endPauseMs: 0,
};

/** Extra travel time per metre the hands have to cover. */
const MS_PER_METRE = 850;
const MIN_TRANSITION_MS = 140;
const MAX_TRANSITION_MS = 640;

/**
 * How long the hands need to get from one pose to the next.
 *
 * A fixed transition is wrong as soon as the distances vary: a one-handed sign
 * followed by a two-handed one has to bring the non-dominant hand up from rest,
 * roughly 40cm, and doing that in the same time as a 5cm adjustment produces a
 * visible snap. Scaling with distance costs nothing and removes a whole class of
 * these.
 */
function transitionFor(from: Pose, to: Pose, base: number, speed: number): number {
  const a = solveFK(from);
  const b = solveFK(to);
  const travel = Math.max(
    vec3Distance(jointPosition(a, 'right_wrist'), jointPosition(b, 'right_wrist')),
    vec3Distance(jointPosition(a, 'left_wrist'), jointPosition(b, 'left_wrist')),
  );
  const ms = base + travel * MS_PER_METRE;
  return Math.min(MAX_TRANSITION_MS, Math.max(MIN_TRANSITION_MS, ms)) / speed;
}

export interface SequencedSegment {
  readonly index: number;
  readonly kind: 'sign' | 'fingerspell';
  readonly signId?: string;
  readonly word?: string;
  readonly gloss: string;
  /** Absolute time the meaningful part of this item begins. */
  readonly strokeStartMs: number;
  readonly strokeEndMs: number;
  /** Length of the travel that leads into this item. */
  readonly transitionInMs: number;
  /** Letters, for a fingerspelled word. One timeline item, many sub-segments. */
  readonly letters?: readonly LetterSegment[];
}

export interface Sequence {
  readonly segments: readonly SequencedSegment[];
  readonly durationMs: number;
  /** How long the hands take to come back down, excluding any end pause. */
  readonly tailTravelMs: number;
  readonly options: Required<SequenceOptions>;
}

/** Compiling a sign builds a pose per keyframe, so cache per id and hand. */
const clipCache = new Map<string, MotionClip>();

export function signClip(signId: string, hand: Hand = 'right'): MotionClip {
  const key = `${signId}:${hand}`;
  const cached = clipCache.get(key);
  if (cached) return cached;
  const definition = signDefinition(signId);
  if (!definition) throw new Error(`Unknown sign "${signId}"`);
  const clip = compileSign(definition, hand);
  clipCache.set(key, clip);
  return clip;
}

function ease(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

/** How long a clip's stroke lasts, which is all the sequencer plays of it. */
function strokeDuration(clip: MotionClip): number {
  const start = clip.strokeStartMs ?? 0;
  const end = clip.strokeEndMs ?? clip.durationMs;
  return Math.max(end - start, 1);
}

interface Prepared {
  readonly segment: SequencedSegment;
  readonly clip?: MotionClip;
  readonly spell?: FingerspellPlan;
}

export function sequence(items: readonly SequenceItem[], options: SequenceOptions = {}): {
  sequence: Sequence;
  prepared: readonly Prepared[];
} {
  const requested = { ...DEFAULTS, ...options };
  const speed = Math.max(0.1, Math.min(4, requested.speed));
  const opts: Required<SequenceOptions> = {
    ...requested,
    speed,
    transitionMs: requested.transitionMs / Math.pow(speed, 0.6),
    leadInMs: requested.leadInMs / speed,
    tailMs: requested.tailMs / speed,
    endPauseMs: requested.endPauseMs / speed,
  };

  // Build the items first, then lay them out: gap lengths depend on how far the
  // hands travel between neighbouring poses, which needs the poses.
  interface Draft {
    clip?: MotionClip;
    spell?: FingerspellPlan;
    kind: 'sign' | 'fingerspell';
    signId?: string;
    word?: string;
    gloss: string;
    strokeMs: number;
    letters?: readonly LetterSegment[];
  }

  const drafts: Draft[] = items.map((item) => {
    if (item.kind === 'sign') {
      const clip = signClip(item.signId, opts.hand);
      return {
        clip, kind: 'sign', signId: item.signId,
        gloss: signDefinition(item.signId)?.gloss ?? item.signId,
        strokeMs: strokeDuration(clip) / speed,
      };
    }
    // No lead-in or tail: inside a sentence the sequencer owns the approach and
    // release, so the word starts already in spelling position.
    const spell = planFingerspell(item.word, { speed, hand: opts.hand, leadInMs: 0, tailMs: 0 });
    return {
      spell, kind: 'fingerspell', word: item.word,
      gloss: spell.letters.join('-'),
      strokeMs: Math.max(spell.durationMs, 1),
      letters: spell.segments,
    };
  });

  const edgePose = (draft: Draft, t: number): Pose =>
    draft.clip
      ? sampleClip(draft.clip, (draft.clip.strokeStartMs ?? 0)
          + ((draft.clip.strokeEndMs ?? draft.clip.durationMs) - (draft.clip.strokeStartMs ?? 0)) * t)
      : draft.spell ? sampleFingerspell(draft.spell, draft.spell.durationMs * t)
      : REST_POSTURE;

  const prepared: Prepared[] = [];
  let cursor = 0;

  drafts.forEach((draft, index) => {
    const transitionInMs = index === 0
      ? transitionFor(REST_POSTURE, edgePose(draft, 0), opts.leadInMs * speed, speed)
      : transitionFor(edgePose(drafts[index - 1]!, 1), edgePose(draft, 0), requested.transitionMs, speed);

    const strokeStartMs = cursor + transitionInMs;
    const strokeEndMs = strokeStartMs + draft.strokeMs;
    cursor = strokeEndMs;

    prepared.push({
      ...(draft.clip ? { clip: draft.clip } : {}),
      ...(draft.spell ? { spell: draft.spell } : {}),
      segment: {
        index, kind: draft.kind, gloss: draft.gloss,
        strokeStartMs, strokeEndMs, transitionInMs,
        ...(draft.signId ? { signId: draft.signId } : { word: draft.word }),
        ...(draft.letters ? { letters: draft.letters } : {}),
      },
    });
  });

  const tailTravelMs = drafts.length === 0
    ? 0
    : transitionFor(edgePose(drafts[drafts.length - 1]!, 1), REST_POSTURE, opts.tailMs * speed, speed);
  cursor += tailTravelMs + (drafts.length === 0 ? 0 : opts.endPauseMs);

  return {
    prepared,
    sequence: {
      segments: prepared.map((p) => p.segment),
      durationMs: items.length === 0 ? 0 : cursor,
      tailTravelMs,
      options: opts,
    },
  };
}

/** The pose at a point within one item's stroke, `t` from 0 to 1. */
function poseWithin(item: Prepared, t: number, speed: number): Pose {
  if (item.clip) {
    const start = item.clip.strokeStartMs ?? 0;
    const end = item.clip.strokeEndMs ?? item.clip.durationMs;
    return sampleClip(item.clip, start + (end - start) * t);
  }
  if (item.spell) return sampleFingerspell(item.spell, item.spell.durationMs * t);
  return REST_POSTURE;
}

/**
 * A shallow lift applied to the shoulders mid-transition.
 *
 * Slerping between two arm poses already curves the wrist path, but it can curve
 * it straight through the torso. Biasing the shoulder outward at the midpoint
 * bends the travel away from the body, which is the cheapest thing that makes
 * consecutive signs read as connected rather than teleported.
 */
function arcBias(pose: Pose, amount: number): Pose {
  if (amount <= 0.001) return pose;
  const out: Record<string, Quat> = { ...pose };
  for (const hand of ['right', 'left'] as const) {
    const joint = `${hand}_shoulder`;
    const base = pose[joint];
    if (!base) continue;
    const side = hand === 'right' ? 1 : -1;
    out[joint] = quatMultiply(base, quatFromEulerDeg(-4.5 * amount, 0, 5.5 * amount * side));
  }
  return out;
}

export function samplePrepared(
  prepared: readonly Prepared[],
  seq: Sequence,
  timeMs: number,
): Pose {
  if (prepared.length === 0) return REST_POSTURE;
  const speed = seq.options.speed;
  const first = prepared[0]!;
  const last = prepared[prepared.length - 1]!;

  // Raising the hands into the first sign.
  if (timeMs < first.segment.strokeStartMs) {
    const span = Math.max(first.segment.strokeStartMs, 1);
    const t = ease(timeMs / span);
    return arcBias(blendPoses(REST_POSTURE, poseWithin(first, 0, speed), t), Math.sin(t * Math.PI) * 0.6);
  }

  // Lowering them after the last. The end pause is held at rest afterwards, so
  // it must not stretch the descent.
  if (timeMs >= last.segment.strokeEndMs) {
    const span = Math.max(seq.tailTravelMs, 1);
    const t = ease((timeMs - last.segment.strokeEndMs) / span);
    return arcBias(blendPoses(poseWithin(last, 1, speed), REST_POSTURE, t), Math.sin(t * Math.PI) * 0.5);
  }

  for (let i = 0; i < prepared.length; i++) {
    const item = prepared[i]!;
    const { strokeStartMs, strokeEndMs } = item.segment;

    if (timeMs <= strokeEndMs) {
      if (timeMs >= strokeStartMs) {
        const t = (timeMs - strokeStartMs) / Math.max(strokeEndMs - strokeStartMs, 1);
        return poseWithin(item, t, speed);
      }
      // Travelling from the previous item into this one.
      const previous = prepared[i - 1]!;
      const from = previous.segment.strokeEndMs;
      const raw = (timeMs - from) / Math.max(strokeStartMs - from, 1);
      const blended = blendPoses(poseWithin(previous, 1, speed), poseWithin(item, 0, speed), ease(raw));
      return arcBias(blended, Math.sin(raw * Math.PI));
    }
  }

  return poseWithin(last, 1, speed);
}

/** The segment active at a time, for highlighting. */
export function activeSequenceSegment(seq: Sequence, timeMs: number): SequencedSegment | undefined {
  if (timeMs >= seq.durationMs) return undefined;
  let current: SequencedSegment | undefined;
  for (const segment of seq.segments) {
    if (timeMs >= segment.strokeStartMs - segment.transitionInMs / 2) current = segment;
  }
  return current;
}

export type { Prepared };
