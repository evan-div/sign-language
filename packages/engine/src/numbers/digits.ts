/**
 * The digit handshapes.
 *
 * Most of them already existed. ASL's numbers are drawn from the same small
 * inventory of hand configurations as everything else, so 0 is the letter O,
 * 1 is the pointing hand, 2 is V, 4 and 5 and 8 and 10 are shapes the lexical
 * signs already needed, and 9 is F. Only 3, 6 and 7 had to be added. That is
 * the handshape-as-parameter architecture paying out: a number is not a new
 * kind of thing, it is the same parameter with a different value.
 *
 * ## The palm-orientation convention, which is a choice
 *
 * ASL turns the palm differently for 1-5 depending on what the number is doing:
 * counting, quantifying, giving an address, telling the time. The convention
 * taken here is the common teaching one -- 1 to 5 with the palm toward the
 * signer, 6 to 9 with the palm toward the addressee -- and it is stated in one
 * place so a reviewer can change it in one place. It is also near the top of
 * the list of things a Deaf reviewer should check first, because a wrong palm
 * is not a stylistic slip: for some numbers it is a different sign.
 */

import type { OrientationName } from '../signs/orientation.js';

/** Digit -> handshape id. */
export const DIGIT_HANDSHAPES: Readonly<Record<number, string>> = Object.freeze({
  0: 'O',
  1: 'POINT',
  2: 'V',
  3: 'NUM_3',
  4: 'FOUR',
  5: 'OPEN_5',
  6: 'NUM_6',
  7: 'NUM_7',
  8: 'OPEN_8',
  9: 'F',
});

/** The 10 handshape: a fist with the thumb up, shaken. */
export const TEN_HANDSHAPE = 'THUMB_OUT';

export function digitHandshape(digit: number): string {
  const shape = DIGIT_HANDSHAPES[digit];
  if (!shape) throw new Error(`No handshape for digit ${digit}`);
  return shape;
}

/** See the note above: this is the convention, and it is a choice. */
export function digitOrientation(digit: number): OrientationName {
  return digit >= 1 && digit <= 5 ? 'PALM_IN' : 'PALM_OUT';
}
