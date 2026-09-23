/**
 * Handshapes used by lexical signs but not by the manual alphabet.
 *
 * ASL handshapes largely overlap with the alphabet -- a flat hand is B, a fist
 * is S, a pointing hand is the same shape as Z -- so most signs reuse the
 * letters. These are the ones that have no letter equivalent, expressed with
 * the same spec so they compile through the same path.
 *
 * Where a shape IS a letter's shape, it is declared as an alias rather than
 * copied. POINT and Z are the same configuration of the hand; writing the
 * numbers out twice means the two drift apart the first time either is edited,
 * and a test that only checks for near-duplicates cannot tell a deliberate
 * alias from an accident. Aliasing says which it is.
 */

import type { FingerSpec, HandshapeSpec, ThumbSpec } from './spec.js';
import { CURLED, CURVED, STRAIGHT } from './spec.js';
import { ASL_LETTERS } from './letters.js';

/** A sign handshape that is a letter's handshape under another name. */
export const HANDSHAPE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  POINT: 'Z',
});

function alias(id: string, description: string): HandshapeSpec {
  return { ...ASL_LETTERS[HANDSHAPE_ALIASES[id]!]!, id, description };
}

const THUMB_ALONGSIDE: ThumbSpec = { metacarpal: [-5, -4, 32], proximal: [1, 0, 0], distal: [3, 0, 0] };
const THUMB_TUCKED_IN: ThumbSpec = { metacarpal: [-3, -32, 90], proximal: [60, 0, 0], distal: [60, 0, 0] };
const THUMB_SPREAD: ThumbSpec = { metacarpal: [-1, 6, -13], proximal: [1, 0, 0], distal: [2, 0, 0] };
const THUMB_ROUNDED: ThumbSpec = { metacarpal: [7, -10, 37], proximal: [1, 0, 0], distal: [8, 0, 0] };

/** Solved, like the letter thumbs: leaves the thumb pointing [0.20 0.97 0.15]. */
const THUMB_UP: ThumbSpec = { metacarpal: [-10, -60, 40], proximal: [0, 0, 0], distal: [0, 0, 0] };
/** Solved for contact, like the 6 and 7 thumbs: leaves a 0.0cm gap, not 2.6cm. */
const THUMB_PINCH_LOW: ThumbSpec = { metacarpal: [34, -45, 52], proximal: [23, 0, 0], distal: [19, 0, 0] };

const OPEN = { flex: STRAIGHT } as const;
const CLOSED = { flex: CURLED } as const;
/** Extended at the knuckle, bent at the middle joint: the "bent" family. */
const BENT: FingerSpec = { flex: [0.1, 0.75, 0.55] };

export const SIGN_HANDSHAPES: Readonly<Record<string, HandshapeSpec>> = Object.freeze({
  /** Flat hand, fingers together, thumb alongside rather than across the palm. */
  FLAT: {
    id: 'FLAT', description: 'Flat hand, fingers together, thumb alongside.',
    index: OPEN, middle: OPEN, ring: OPEN, pinky: OPEN, thumb: THUMB_ALONGSIDE, spread: 0,
  },
  /** Open hand, all five digits spread. The "5" handshape. */
  OPEN_5: {
    id: 'OPEN_5', description: 'All fingers extended and spread.',
    index: OPEN, middle: OPEN, ring: OPEN, pinky: OPEN, thumb: THUMB_SPREAD, spread: 1,
  },
  /**
   * Index extended, everything else closed: the "1" handshape, for pointing.
   * The same hand as the letter Z, which is Z's shape plus a traced movement.
   */
  POINT: alias('POINT', 'Index extended, other fingers closed.'),
  /** Fingers straight but folded forward at the knuckles. */
  BENT_FLAT: {
    id: 'BENT_FLAT', description: 'Fingers straight, bent forward at the knuckles.',
    index: { flex: [0.55, 0, 0] }, middle: { flex: [0.55, 0, 0] },
    ring: { flex: [0.55, 0, 0] }, pinky: { flex: [0.55, 0, 0] },
    thumb: THUMB_ALONGSIDE, spread: 0,
  },
  /**
   * Spread fingers, all hooked. The "claw".
   *
   * Hooked rather than evenly curved, and fully spread. Authored as an evenly
   * curved hand at 0.8 spread it measured 6mm from the letter C, which is a
   * rounded cup with the fingers together -- a different handshape that would
   * have rendered every CLAW sign as a C.
   */
  CLAW: {
    id: 'CLAW', description: 'Fingers spread and hooked.',
    index: { flex: [0.3, 0.65, 0.5] }, middle: { flex: [0.3, 0.65, 0.5] },
    ring: { flex: [0.3, 0.65, 0.5] }, pinky: { flex: [0.3, 0.65, 0.5] },
    thumb: THUMB_ROUNDED, spread: 1,
  },
  /** Thumb, index and little extended: I-L-Y. */
  ILY: {
    id: 'ILY', description: 'Thumb, index and little finger extended.',
    index: OPEN, middle: CLOSED, ring: CLOSED, pinky: OPEN, thumb: THUMB_SPREAD,
  },
  /** Fingers together and flat, meeting a flattened thumb. */
  FLAT_O: {
    id: 'FLAT_O', description: 'Flattened O: fingers together meeting the thumb.',
    index: { flex: [0.6, 0.45, 0.3] }, middle: { flex: [0.6, 0.45, 0.3] },
    ring: { flex: [0.6, 0.45, 0.3] }, pinky: { flex: [0.6, 0.45, 0.3] },
    thumb: { metacarpal: [3, -37, 41], proximal: [40, 0, 0], distal: [30, 0, 0] }, spread: 0,
  },
  /** Index and middle extended and bent: the "bent V", or claw-V. */
  BENT_V: {
    id: 'BENT_V', description: 'Index and middle extended and bent, others closed.',
    index: { ...BENT, spread: 0.5 }, middle: { ...BENT, spread: -0.2 },
    ring: CLOSED, pinky: CLOSED, thumb: THUMB_TUCKED_IN,
  },
  /** Middle fingertip meeting the thumb, the rest extended: the "open 8". */
  OPEN_8: {
    id: 'OPEN_8', description: 'Middle finger bent to the thumb, the others extended.',
    index: OPEN, middle: { flex: [0.79, 0.5, 0.35] }, ring: OPEN, pinky: OPEN,
    thumb: THUMB_PINCH_LOW, spread: 0.4,
  },
  /** Index curled onto the thumb, the rest closed: the "baby O". */
  BABY_O: {
    id: 'BABY_O', description: 'Index curled to meet the thumb, other fingers closed.',
    index: { flex: [0.55, 0.7, 0.4] }, middle: CLOSED, ring: CLOSED, pinky: CLOSED,
    thumb: { metacarpal: [4, -30, 58], proximal: [34, 0, 0], distal: [22, 0, 0] },
  },
  /** Thumb and index extended with the index bent: the "bent L". */
  BENT_L: {
    id: 'BENT_L', description: 'Thumb out, index extended and bent, others closed.',
    index: BENT, middle: CLOSED, ring: CLOSED, pinky: CLOSED, thumb: THUMB_SPREAD,
  },
  /** Four fingers spread, thumb across the palm. */
  FOUR: {
    id: 'FOUR', description: 'Four fingers extended and spread, thumb across the palm.',
    index: OPEN, middle: OPEN, ring: OPEN, pinky: OPEN, thumb: THUMB_TUCKED_IN, spread: 1,
  },
  /**
   * Thumb, index and middle extended: the number 3.
   *
   * Not the letter W, which extends index, middle and ring with the thumb
   * holding the little finger down. The two are a classic minimal pair and the
   * distinctness test keeps them apart.
   */
  NUM_3: {
    id: 'NUM_3', description: 'Thumb, index and middle extended, ring and little closed.',
    index: { ...OPEN, spread: 0.55 }, middle: { ...OPEN, spread: -0.1 },
    ring: CLOSED, pinky: CLOSED, thumb: THUMB_SPREAD,
  },
  /** Little finger meeting the thumb, the other three extended: the number 6. */
  NUM_6: {
    id: 'NUM_6', description: 'Little finger meeting the thumb, the other three extended.',
    index: OPEN, middle: OPEN, ring: OPEN, pinky: { flex: [0.54, 0.86, 0.06] },
    thumb: { metacarpal: [22, -18, 94], proximal: [22, 0, 0], distal: [17, 0, 0] }, spread: 0.35,
  },
  /** Ring finger meeting the thumb, the other three extended: the number 7. */
  NUM_7: {
    id: 'NUM_7', description: 'Ring finger meeting the thumb, the other three extended.',
    index: OPEN, middle: OPEN, ring: { flex: [0.79, 0.5, 0.36] }, pinky: OPEN,
    thumb: { metacarpal: [37, -20, 75], proximal: [25, 0, 0], distal: [4, 0, 0] }, spread: 0.35,
  },
  /** A fist with the thumb standing up. */
  THUMB_OUT: {
    id: 'THUMB_OUT', description: 'Closed fist with the thumb extended upward.',
    index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: CLOSED, thumb: THUMB_UP,
  },
});

export function signHandshape(id: string): HandshapeSpec | undefined {
  return SIGN_HANDSHAPES[id];
}
