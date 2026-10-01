/**
 * A last handful of signs, chosen because they are common words whose form is
 * well enough known to author, and because several are minimal pairs of signs
 * already in the library.
 *
 * Hand-authored from written descriptions, not reviewed by a Deaf signer.
 */

import type { SignDefinition } from '../definition.js';
import { arc, def, family, loop, path, touch, travel, twist, p } from '../templates.js';

export const EXTRAS: readonly SignDefinition[] = [
  def('BATHROOM', 'BATHROOM', 'place', 'A T hand, shaken.',
    twist(p('NEUTRAL_HIGH', 'T', 'PALM_ACROSS'), 'PALM_ACROSS', 'PALM_OUT', 2)),

  def('LIBRARY', 'LIBRARY', 'place', 'An L hand makes a small circle, palm out.',
    loop([p('NEUTRAL', 'L', 'PALM_OUT'), p('NEUTRAL_HIGH', 'L', 'PALM_OUT'), p('SIDE_MID', 'L', 'PALM_OUT')], { pace: 1.1 })),

  def('FAT', 'FAT', 'quality', 'Both cupped hands at the cheeks move outward, as puffed cheeks.',
    travel(p('CHEEK', 'C', 'PALM_ACROSS', 'thumb'), p('SIDE_HIGH', 'C', 'PALM_ACROSS', 'thumb')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('UP', 'UP', 'motion', 'An index finger points up and rises.',
    travel(p('NEUTRAL', 'POINT', 'PALM_OUT'), p('NEUTRAL_HIGH', 'POINT', 'PALM_OUT'))),

  def('DOWN', 'DOWN', 'motion', 'An index finger points down and lowers.',
    travel(p('NEUTRAL', 'POINT', 'FINGERS_DOWN_OUT'), p('NEUTRAL_LOW', 'POINT', 'FINGERS_DOWN_OUT'))),

  def('LEFT', 'LEFT', 'motion', 'An L hand, thumb out, moves toward the left.',
    travel(p('NEUTRAL', 'L', 'PALM_OUT'), p('CHEST_OUT', 'L', 'PALM_OUT'))),

  def('HERE', 'HERE', 'motion', 'Both flat hands, palms up, make small circles in front of the body.',
    loop([p('CHEST_OUT', 'FLAT', 'PALM_UP'), p('NEUTRAL', 'FLAT', 'PALM_UP'), p('NEUTRAL_LOW', 'FLAT', 'PALM_UP')], { pace: 1.2 }),
    { two: 'alternate', fidelity: 'approximate' }),

  def('CHRISTMAS', 'CHRISTMAS', 'society', 'A C hand sweeps in an arc across the chest.',
    arc(p('SHOULDER', 'C', 'PALM_IN', 'thumb'), p('CONTRA_CHEST', 'C', 'PALM_IN', 'thumb'), p('WAIST', 'C', 'PALM_IN', 'thumb')),
    { fidelity: 'approximate' }),

  def('BORN', 'BORN', 'health', 'Both flat hands, palms up, move out from the stomach.',
    travel(p('STOMACH', 'FLAT', 'PALM_UP', 'palm'), p('NEUTRAL', 'FLAT', 'PALM_UP', 'palm')),
    { two: 'mirror', fidelity: 'approximate', note: 'Differs from PREGNANT in orientation and in using both hands.' }),

  def('JUMP', 'JUMP', 'motion', 'A V hand hops up off the palm of the other hand and lands again.',
    arc(p('CENTRE_MID', 'V', 'FINGERS_DOWN', 'index'), p('CENTRE_HIGH', 'V', 'FINGERS_DOWN', 'index'), p('CENTRE_MID', 'V', 'FINGERS_DOWN', 'index')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('FALL', 'FALL', 'motion', 'A V hand standing on the palm of the other tips over.',
    twist(p('CENTRE_MID', 'V', 'FINGERS_DOWN', 'index'), 'FINGERS_DOWN', 'FINGERS_ACROSS', 1),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),
];
