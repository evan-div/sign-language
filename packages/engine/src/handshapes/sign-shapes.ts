/**
 * Handshapes used by lexical signs but not by the manual alphabet.
 *
 * ASL handshapes largely overlap with the alphabet -- a flat hand is B, a fist
 * is S, a pointing hand is close to D -- so most signs reuse the letters. These
 * are the ones that have no letter equivalent, expressed with the same spec so
 * they compile through the same path.
 */

import type { HandshapeSpec, ThumbSpec } from './spec.js';
import { CURLED, CURVED, STRAIGHT } from './spec.js';

const THUMB_ALONGSIDE: ThumbSpec = { metacarpal: [-5, -4, 32], proximal: [1, 0, 0], distal: [3, 0, 0] };
const THUMB_TUCKED_IN: ThumbSpec = { metacarpal: [-3, -32, 90], proximal: [60, 0, 0], distal: [60, 0, 0] };
const THUMB_SPREAD: ThumbSpec = { metacarpal: [-1, 6, -13], proximal: [1, 0, 0], distal: [2, 0, 0] };
const THUMB_ROUNDED: ThumbSpec = { metacarpal: [7, -10, 37], proximal: [1, 0, 0], distal: [8, 0, 0] };

const OPEN = { flex: STRAIGHT } as const;
const CLOSED = { flex: CURLED } as const;

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
  /** Index extended, everything else closed. The "1" handshape, for pointing. */
  POINT: {
    id: 'POINT', description: 'Index extended, other fingers closed.',
    index: OPEN, middle: CLOSED, ring: CLOSED, pinky: CLOSED, thumb: THUMB_TUCKED_IN,
  },
  /** Fingers straight but folded forward at the knuckles. */
  BENT_FLAT: {
    id: 'BENT_FLAT', description: 'Fingers straight, bent forward at the knuckles.',
    index: { flex: [0.55, 0, 0] }, middle: { flex: [0.55, 0, 0] },
    ring: { flex: [0.55, 0, 0] }, pinky: { flex: [0.55, 0, 0] },
    thumb: THUMB_ALONGSIDE, spread: 0,
  },
  /** Spread fingers, all curved. The "claw". */
  CLAW: {
    id: 'CLAW', description: 'Fingers spread and curved.',
    index: { flex: CURVED }, middle: { flex: CURVED }, ring: { flex: CURVED }, pinky: { flex: CURVED },
    thumb: THUMB_ROUNDED, spread: 0.8,
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
});

export function signHandshape(id: string): HandshapeSpec | undefined {
  return SIGN_HANDSHAPES[id];
}
