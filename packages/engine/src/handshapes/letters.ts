/**
 * The ASL manual alphabet, as handshape specs on the canonical skeleton.
 *
 * Orientation reference: right (dominant) hand, palm facing the viewer, fingers
 * up, unless the letter overrides `wrist`. All values were tuned against the
 * fingertip assertions in test/handshapes.test.ts -- see that file for what
 * each letter is actually checked against.
 *
 * KNOWN APPROXIMATIONS (these are the letters a Deaf reviewer should look at
 * first, and the reason Milestone 2 has a human read-back criterion):
 *   - M, N, T bury the thumb under or between curled fingers. A bone hierarchy
 *     without collision response cannot express that contact properly; the
 *     thumb is placed plausibly but does not truly tuck.
 *   - R crosses index over middle. We approximate with opposed lateral fan,
 *     which reads as "close together and leaning" rather than genuinely crossed.
 *   - K and P place the thumb between index and middle. Contact is approximate.
 */

import type { HandshapeSpec, ThumbSpec } from './spec.js';
import { CURLED, CURVED, HOOKED, STRAIGHT } from './spec.js';

// --- Thumb presets -------------------------------------------------------
// XYZ Euler degrees on the canonical bind pose, where the thumb rests pointing
// up-and-out at roughly 40 degrees from vertical.

/** Thumb vertical, alongside a closed fist (A). */
const THUMB_UP: ThumbSpec = { metacarpal: [-5, -4, 32], proximal: [1, 0, 0], distal: [3, 0, 0] };

/** Thumb extended horizontally away from the hand (L, Y). */
const THUMB_OUT: ThumbSpec = { metacarpal: [-1, 6, -13], proximal: [1, 0, 0], distal: [2, 0, 0] };

/** Thumb folded flat across the palm (B, U, V, I, X). */
const THUMB_ACROSS: ThumbSpec = { metacarpal: [-3, -32, 90], proximal: [60, 0, 0], distal: [60, 0, 0] };

/** Thumb clamped across the front of a fist (S). */
const THUMB_FRONT: ThumbSpec = { metacarpal: [13, -28, 89], proximal: [55, 0, 0], distal: [55, 0, 0] };

/** Thumb curved to oppose curved fingers (C). */
const THUMB_C: ThumbSpec = { metacarpal: [7, -10, 37], proximal: [1, 0, 0], distal: [8, 0, 0] };

/** Thumb curled to meet curved fingertips (O). */
const THUMB_O: ThumbSpec = { metacarpal: [3, -37, 41], proximal: [49, 0, 0], distal: [37, 0, 0] };

/** Thumb pad meeting the index pad (F). */
const THUMB_PINCH_INDEX: ThumbSpec = { metacarpal: [-3, -50, 31], proximal: [70, 0, 0], distal: [28, 0, 0] };

/** Thumb meeting the middle fingertip, index extended (D). */
const THUMB_PINCH_MID: ThumbSpec = { metacarpal: [29, -26, 59], proximal: [23, 0, 0], distal: [19, 0, 0] };

/** Thumb tucked beneath curled fingers (E). */
const THUMB_TUCKED: ThumbSpec = { metacarpal: [-13, -43, 60], proximal: [65, 0, 0], distal: [65, 0, 0] };

/** Thumb buried under curled fingers (M, N). */
const THUMB_DEEP: ThumbSpec = { metacarpal: [1, -31, 90], proximal: [65, 0, 0], distal: [65, 0, 0] };

/** Thumb wedged between two fingers (K, T). */
const THUMB_BETWEEN: ThumbSpec = { metacarpal: [-3, -18, 54], proximal: [11, 0, 0], distal: [39, 0, 0] };

/** Thumb laid over a folded pinky (W). */
const THUMB_OVER_PINKY: ThumbSpec = { metacarpal: [6, -17, 92], proximal: [10, 0, 0], distal: [30, 0, 0] };

/** Thumb parallel to a sideways index (G, Q). */
const THUMB_PARALLEL: ThumbSpec = { metacarpal: [-11, -5, 27], proximal: [0, 0, 0], distal: [0, 0, 0] };

// --- Wrist presets -------------------------------------------------------

/** Hand turned so the fingers point toward the midline, palm facing inward (G, H). */
const WRIST_SIDEWAYS: readonly [number, number, number] = [180, 0, -90];

/** Hand turned down and forward (P, Q). */
const WRIST_DOWNWARD: readonly [number, number, number] = [120, -90, -60];

const CLOSED = { flex: CURLED } as const;
const OPEN = { flex: STRAIGHT } as const;
/** Curled enough to meet the thumb, as in D and the closed fingers of F. */
const MEETING = { flex: [0.7, 0.6, 0.35] as const } as const;

export const ASL_LETTERS: Readonly<Record<string, HandshapeSpec>> = Object.freeze({
  A: {
    id: 'A', description: 'Closed fist, thumb upright along the index side.',
    index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: CLOSED, thumb: THUMB_UP,
  },
  B: {
    id: 'B', description: 'Four fingers straight and together, thumb across the palm.',
    index: OPEN, middle: OPEN, ring: OPEN, pinky: OPEN, thumb: THUMB_ACROSS, spread: 0,
  },
  C: {
    id: 'C', description: 'Fingers and thumb curved into a C.',
    index: { flex: CURVED }, middle: { flex: CURVED }, ring: { flex: CURVED }, pinky: { flex: CURVED },
    thumb: THUMB_C, spread: 0.15,
  },
  D: {
    id: 'D', description: 'Index straight, other fingers meeting the thumb.',
    index: OPEN, middle: MEETING, ring: MEETING, pinky: MEETING, thumb: THUMB_PINCH_MID,
  },
  E: {
    id: 'E', description: 'Fingers curled down onto a tucked thumb.',
    index: { flex: [0.7, 0.95, 0.55] }, middle: { flex: [0.7, 0.95, 0.55] },
    ring: { flex: [0.7, 0.95, 0.55] }, pinky: { flex: [0.7, 0.95, 0.55] },
    thumb: THUMB_TUCKED,
  },
  F: {
    id: 'F', description: 'Thumb and index pinched, other three fingers straight.',
    index: { flex: [0.72, 0.55, 0.3] }, middle: OPEN, ring: OPEN, pinky: OPEN,
    thumb: THUMB_PINCH_INDEX, spread: 0.35,
  },
  G: {
    id: 'G', description: 'Index pointing sideways, thumb parallel below it.',
    index: OPEN, middle: CLOSED, ring: CLOSED, pinky: CLOSED,
    thumb: THUMB_PARALLEL, wrist: WRIST_SIDEWAYS,
  },
  H: {
    id: 'H', description: 'Index and middle pointing sideways together.',
    index: OPEN, middle: OPEN, ring: CLOSED, pinky: CLOSED,
    thumb: THUMB_ACROSS, spread: 0, wrist: WRIST_SIDEWAYS,
  },
  I: {
    id: 'I', description: 'Pinky extended, other fingers closed.',
    index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: OPEN, thumb: THUMB_ACROSS,
  },
  J: {
    id: 'J', description: 'Pinky extended, tracing a J. Handshape only; movement is a clip.',
    index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: OPEN, thumb: THUMB_ACROSS,
  },
  K: {
    id: 'K', description: 'Index up, middle angled out, thumb between them.',
    index: OPEN, middle: { flex: [0.22, 0, 0], spread: -0.75 }, ring: CLOSED, pinky: CLOSED,
    thumb: THUMB_BETWEEN,
  },
  L: {
    id: 'L', description: 'Index up and thumb out, forming an L.',
    index: OPEN, middle: CLOSED, ring: CLOSED, pinky: CLOSED, thumb: THUMB_OUT,
  },
  M: {
    id: 'M', description: 'Three fingers folded over a buried thumb.',
    index: { flex: [0.9, 0.75, 0.4] }, middle: { flex: [0.9, 0.75, 0.4] },
    ring: { flex: [0.9, 0.75, 0.4] }, pinky: CLOSED, thumb: THUMB_DEEP,
  },
  N: {
    id: 'N', description: 'Two fingers folded over a buried thumb.',
    index: { flex: [0.9, 0.75, 0.4] }, middle: { flex: [0.9, 0.75, 0.4] },
    ring: CLOSED, pinky: CLOSED, thumb: THUMB_DEEP,
  },
  O: {
    id: 'O', description: 'Fingertips and thumb meeting in a circle.',
    index: { flex: [0.58, 0.62, 0.45] }, middle: { flex: [0.58, 0.62, 0.45] },
    ring: { flex: [0.58, 0.62, 0.45] }, pinky: { flex: [0.58, 0.62, 0.45] },
    thumb: THUMB_O,
  },
  P: {
    id: 'P', description: 'K handshape rotated to point downward.',
    index: OPEN, middle: { flex: [0.22, 0, 0], spread: -0.75 }, ring: CLOSED, pinky: CLOSED,
    thumb: THUMB_BETWEEN, wrist: WRIST_DOWNWARD,
  },
  Q: {
    id: 'Q', description: 'G handshape rotated to point downward.',
    index: OPEN, middle: CLOSED, ring: CLOSED, pinky: CLOSED,
    thumb: THUMB_PARALLEL, wrist: WRIST_DOWNWARD,
  },
  R: {
    id: 'R', description: 'Index and middle crossed (approximated by opposed fan).',
    index: { flex: [0.05, 0.05, 0], spread: -0.55 }, middle: { flex: [0.05, 0.05, 0], spread: 0.55 },
    ring: CLOSED, pinky: CLOSED, thumb: THUMB_ACROSS,
  },
  S: {
    id: 'S', description: 'Fist with the thumb clamped across the front.',
    index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: CLOSED, thumb: THUMB_FRONT,
  },
  T: {
    id: 'T', description: 'Fist with the thumb wedged between index and middle.',
    index: { flex: [0.95, 0.9, 0.5] }, middle: CLOSED, ring: CLOSED, pinky: CLOSED,
    thumb: THUMB_BETWEEN,
  },
  U: {
    id: 'U', description: 'Index and middle straight and together.',
    index: OPEN, middle: OPEN, ring: CLOSED, pinky: CLOSED, thumb: THUMB_ACROSS, spread: 0,
  },
  V: {
    id: 'V', description: 'Index and middle straight and apart.',
    index: { flex: STRAIGHT, spread: 1 }, middle: { flex: STRAIGHT, spread: -1 },
    ring: CLOSED, pinky: CLOSED, thumb: THUMB_ACROSS,
  },
  W: {
    id: 'W', description: 'Index, middle and ring straight and spread.',
    index: { flex: STRAIGHT, spread: 1 }, middle: { flex: STRAIGHT, spread: 0 },
    ring: { flex: STRAIGHT, spread: -1 }, pinky: CLOSED, thumb: THUMB_OVER_PINKY,
  },
  X: {
    id: 'X', description: 'Index hooked, other fingers closed.',
    index: { flex: HOOKED }, middle: CLOSED, ring: CLOSED, pinky: CLOSED, thumb: THUMB_ACROSS,
  },
  Y: {
    id: 'Y', description: 'Thumb and pinky extended, middle fingers closed.',
    index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: OPEN, thumb: THUMB_OUT,
  },
  Z: {
    id: 'Z', description: 'Index extended, tracing a Z. Handshape only; movement is a clip.',
    index: OPEN, middle: CLOSED, ring: CLOSED, pinky: CLOSED, thumb: THUMB_ACROSS,
  },
});

/** Letters whose citation form carries path movement rather than a static pose. */
export const MOVING_LETTERS: ReadonlySet<string> = new Set(['J', 'Z']);

export function letterSpec(letter: string): HandshapeSpec | undefined {
  return ASL_LETTERS[letter.toUpperCase()];
}

export function hasLetter(letter: string): boolean {
  return letter.toUpperCase() in ASL_LETTERS;
}
