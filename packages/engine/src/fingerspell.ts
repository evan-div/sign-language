/**
 * Fingerspelling synthesis: a word in, a timed pose stream out.
 *
 * Three things make fingerspelling read as a slideshow rather than as signing,
 * and all three are cheap to avoid, so we avoid them here:
 *
 *   1. Linear interpolation between handshapes. We ease every transition and
 *      slerp per joint (see blendPoses), because linear blending produces the
 *      characteristic mechanical snap.
 *   2. Holds that dominate transitions. Real fingerspelling spends more time
 *      moving than parked, so the default transition is longer than the hold.
 *   3. A hand pinned in space. Signers drift laterally across a word, so we
 *      apply a shallow arc to the shoulder over the word's duration.
 *
 * Double letters get explicit treatment: re-posing to an identical handshape is
 * invisible, so without a bounce EVAN and EVANN look the same.
 */

import {
  blendPoses,
  composePoses,
  quatFromEulerDeg,
  quatMultiply,
  type Pose,
  type Quat,
} from '@signflow/motion-format';
import { compileHandshape } from './handshapes/compile.js';
import { letterSpec, MOVING_LETTERS } from './handshapes/letters.js';
import { applyHandshape, REST_POSTURE, SPELLING_POSTURE } from './postures.js';
import type { Hand } from './handshapes/spec.js';

export interface FingerspellOptions {
  /** How long a letter is held at its target handshape. */
  readonly holdMs?: number;
  /** How long the hand takes to travel between two handshapes. */
  readonly transitionMs?: number;
  /** Extra time inserted before a repeated letter, for the bounce. */
  readonly doubleLetterMs?: number;
  /** Time to raise the hand from rest into spelling position. */
  readonly leadInMs?: number;
  /** Time to lower the hand back to rest. */
  readonly tailMs?: number;
  readonly hand?: Hand;
  /**
   * Playback rate. Holds scale with it fully; transitions scale sub-linearly,
   * because compressing travel time as hard as hold time makes fast spelling
   * unreadable long before it looks fast.
   */
  readonly speed?: number;
}

const DEFAULTS = {
  holdMs: 90,
  transitionMs: 115,
  doubleLetterMs: 75,
  // Raising the hand from rest to spelling position covers roughly 40cm; doing
  // it much faster than this reads as a snap rather than a lift.
  leadInMs: 460,
  tailMs: 460,
  hand: 'right' as Hand,
  speed: 1,
};

export interface LetterSegment {
  readonly letter: string;
  /** Position in the spelled word, 0-based. */
  readonly index: number;
  readonly holdStartMs: number;
  readonly holdEndMs: number;
  /** True when this letter repeats the one before it and needs a bounce. */
  readonly doubled: boolean;
  /** True for J and Z, whose citation forms carry path movement. */
  readonly moving: boolean;
}

export interface FingerspellPlan {
  readonly word: string;
  readonly letters: readonly string[];
  readonly segments: readonly LetterSegment[];
  readonly durationMs: number;
  readonly options: Required<FingerspellOptions>;
  /** Letters of the input that have no handshape, e.g. punctuation. */
  readonly skipped: readonly string[];
}

/** Smoothstep. Transitions that ease read as human; linear ones read as robotic. */
function ease(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

export function planFingerspell(word: string, options: FingerspellOptions = {}): FingerspellPlan {
  const requested = { ...DEFAULTS, ...options };
  const speed = Math.max(0.1, Math.min(4, requested.speed));
  const opts: Required<FingerspellOptions> = {
    ...requested,
    speed,
    holdMs: requested.holdMs / speed,
    transitionMs: requested.transitionMs / Math.pow(speed, 0.6),
    doubleLetterMs: requested.doubleLetterMs / Math.pow(speed, 0.6),
    leadInMs: requested.leadInMs / speed,
    tailMs: requested.tailMs / speed,
  };
  const letters: string[] = [];
  const skipped: string[] = [];

  for (const ch of word.toUpperCase()) {
    if (letterSpec(ch)) letters.push(ch);
    else if (ch.trim() !== '') skipped.push(ch);
  }

  const segments: LetterSegment[] = [];
  let cursor = opts.leadInMs;

  letters.forEach((letter, index) => {
    const doubled = index > 0 && letters[index - 1] === letter;
    const moving = MOVING_LETTERS.has(letter);
    if (doubled) cursor += opts.doubleLetterMs;

    // J and Z trace a path; they need room to travel it.
    const holdMs = moving ? opts.holdMs * 3.2 : opts.holdMs;
    const holdStartMs = cursor;
    const holdEndMs = cursor + holdMs;
    segments.push({ letter, index, holdStartMs, holdEndMs, doubled, moving });

    cursor = holdEndMs;
    if (index < letters.length - 1) cursor += opts.transitionMs;
  });

  return {
    word,
    letters,
    segments,
    durationMs: letters.length === 0 ? 0 : cursor + opts.tailMs,
    options: opts,
    skipped,
  };
}

/** The static pose for one letter, layered onto the spelling posture. */
export function letterPose(letter: string, hand: Hand): Pose {
  const spec = letterSpec(letter);
  if (!spec) return SPELLING_POSTURE;
  return applyHandshape(SPELLING_POSTURE, compileHandshape(spec, hand), hand);
}

/**
 * Extra wrist rotation for the letters that move.
 *
 * J hooks downward and back up; Z cuts three strokes. Both are approximations
 * of a path traced in space, expressed as wrist rotation because rotating the
 * wrist is the one thing we can do without inverse kinematics.
 */
function movementRotation(letter: string, phase: number): Quat {
  const p = phase < 0 ? 0 : phase > 1 ? 1 : phase;
  if (letter === 'J') {
    // Down, then hook across and back up.
    return quatFromEulerDeg(38 * Math.sin(p * Math.PI), 0, -30 * Math.sin(p * Math.PI) ** 2);
  }
  if (letter === 'Z') {
    // Three strokes: across, diagonally back, across again.
    const stroke = p * 3;
    const across = stroke < 1 ? stroke : stroke < 2 ? 2 - stroke : stroke - 2;
    const drop = p * 2;
    return quatFromEulerDeg(16 * drop, 0, -34 * (across - 0.5));
  }
  return quatFromEulerDeg(0, 0, 0);
}

/**
 * The lateral arc the hand travels across a word.
 *
 * Applied at the shoulder because we have no IK: a few degrees there moves the
 * hand a few centimetres, which is the scale of drift we want.
 */
function driftRotation(progress: number, hand: Hand): Quat {
  const dir = hand === 'right' ? 1 : -1;
  const sway = (progress - 0.5) * 2; // -1 at the start of the word, +1 at the end
  return quatFromEulerDeg(0, -2.5 * sway * dir, 3.5 * sway * dir);
}

/** Lateral kick that makes a repeated letter visibly re-articulate. */
function bounceRotation(amount: number, hand: Hand): Quat {
  const dir = hand === 'right' ? 1 : -1;
  return quatFromEulerDeg(0, 0, 6.5 * amount * dir);
}

function withShoulder(pose: Pose, hand: Hand, extra: Quat): Pose {
  const joint = `${hand}_shoulder`;
  const base = pose[joint];
  if (!base) return pose;
  return { ...pose, [joint]: quatMultiply(base, extra) };
}

/**
 * Partially open a handshape, for the release between two identical letters.
 * Blending toward the neutral spelling posture relaxes the fingers without
 * needing a second authored pose per letter.
 */
function released(pose: Pose, amount: number): Pose {
  return blendPoses(pose, SPELLING_POSTURE, amount);
}

export function sampleFingerspell(plan: FingerspellPlan, timeMs: number): Pose {
  const { segments, options } = plan;
  const hand = options.hand;
  if (segments.length === 0) return REST_POSTURE;

  const first = segments[0]!;
  const last = segments[segments.length - 1]!;

  // Progress across the spelled word itself, not across the clip. Measuring it
  // over the whole clip would make the drift non-zero at the first hold and
  // still moving at the last, so the shoulder would jump at both boundaries
  // where the edge cases below take over.
  const spellSpan = Math.max(last.holdEndMs - first.holdStartMs, 1);
  const progress = Math.min(1, Math.max(0, (timeMs - first.holdStartMs) / spellSpan));

  // The drift has to be applied on these edges too, at the progress value the
  // in-hold path would use. Leaving it off makes the shoulder snap back by a few
  // degrees at the exact frame the first or last hold begins or ends.
  const firstPose = withShoulder(letterPose(first.letter, hand), hand, driftRotation(0, hand));
  const lastPose = withShoulder(letterPose(last.letter, hand), hand, driftRotation(1, hand));

  // Raising the hand from rest. With no lead-in the plan is embedded inside a
  // sentence, where the sequencer owns the approach, so we hold the first
  // letter instead of inventing a rise from rest that would fight it.
  if (timeMs < first.holdStartMs) {
    if (first.holdStartMs <= 0) return firstPose;
    return blendPoses(REST_POSTURE, firstPose, ease(timeMs / first.holdStartMs));
  }

  // Lowering it again, unless the sequencer owns the release too.
  if (timeMs >= last.holdEndMs) {
    if (plan.durationMs <= last.holdEndMs) return lastPose;
    const t = ease((timeMs - last.holdEndMs) / (plan.durationMs - last.holdEndMs));
    return blendPoses(lastPose, REST_POSTURE, t);
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;

    if (timeMs <= seg.holdEndMs) {
      let pose = letterPose(seg.letter, hand);

      if (timeMs >= seg.holdStartMs) {
        // Inside the hold.
        if (seg.moving) {
          const phase = (timeMs - seg.holdStartMs) / Math.max(seg.holdEndMs - seg.holdStartMs, 1);
          const joint = `${hand}_wrist`;
          pose = { ...pose, [joint]: quatMultiply(pose[joint]!, movementRotation(seg.letter, phase)) };
        }
        return withShoulder(pose, hand, driftRotation(progress, hand));
      }

      // Travelling into this letter from the previous one.
      const prev = segments[i - 1]!;
      const span = Math.max(seg.holdStartMs - prev.holdEndMs, 1);
      const raw = (timeMs - prev.holdEndMs) / span;
      const t = ease(raw);

      let blended = blendPoses(letterPose(prev.letter, hand), pose, t);

      if (seg.doubled) {
        // Arc of release and re-close, peaking mid-transition.
        const peak = Math.sin(raw * Math.PI);
        blended = released(blended, 0.35 * peak);
        blended = withShoulder(blended, hand, bounceRotation(peak, hand));
      }

      return withShoulder(blended, hand, driftRotation(progress, hand));
    }
  }

  return composePoses(letterPose(last.letter, hand));
}

/** The segment active at a given time, for UI highlighting. */
export function activeSegment(plan: FingerspellPlan, timeMs: number): LetterSegment | undefined {
  let current: LetterSegment | undefined;
  for (const seg of plan.segments) {
    if (timeMs >= seg.holdStartMs - plan.options.transitionMs / 2) current = seg;
  }
  if (current && timeMs >= plan.durationMs) return undefined;
  return current;
}
