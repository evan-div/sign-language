/**
 * Time and food.
 *
 * The days of the week are one movement -- a small circle with the palm out --
 * made with the first letter of the English name, so they are a family. SUNDAY
 * and THURSDAY are the two exceptions and are written out.
 *
 * Meal compounds (BREAKFAST, LUNCH, DINNER, TONIGHT) are not here: ASL builds
 * them from two signs, so they are lexicon entries over the components.
 *
 * Hand-authored from written descriptions, not reviewed by a Deaf signer.
 */

import type { SignDefinition } from '../definition.js';
import { change, def, family, loop, path, tap, touch, travel, twist, p } from '../templates.js';

export const TIME_FOOD: readonly SignDefinition[] = [
  // --- days ---------------------------------------------------------------

  ...family(
    (hs) => loop([
      p('NEUTRAL', hs, 'PALM_OUT'),
      p('NEUTRAL_HIGH', hs, 'PALM_OUT'),
      p('SIDE_MID', hs, 'PALM_OUT'),
    ], { pace: 1.1 }),
    [
      ['MONDAY', 'MONDAY', 'M', 'An M hand makes a small circle, palm out.'],
      ['TUESDAY', 'TUESDAY', 'T', 'A T hand makes a small circle, palm out.'],
      ['WEDNESDAY', 'WEDNESDAY', 'W', 'A W hand makes a small circle, palm out.'],
      ['FRIDAY', 'FRIDAY', 'F', 'An F hand makes a small circle, palm out.'],
      ['SATURDAY', 'SATURDAY', 'S', 'An S hand makes a small circle, palm out.'],
    ],
    'time',
  ),

  def('THURSDAY', 'THURSDAY', 'time', 'A T hand makes a small circle and finishes as an H.',
    path([
      p('NEUTRAL', 'T', 'PALM_OUT'), p('NEUTRAL_HIGH', 'T', 'PALM_OUT'),
      p('SIDE_MID', 'H', 'PALM_OUT'), p('NEUTRAL', 'H', 'PALM_OUT', undefined, 100),
    ], { pace: 1.1 }),
    { fidelity: 'approximate', note: 'The T-to-H change is made partway round the circle.' }),

  def('SUNDAY', 'SUNDAY', 'time', 'Both open hands, palms out, make a circle outward.',
    loop([
      p('CHEST_OUT', 'OPEN_5', 'PALM_OUT'), p('NEUTRAL_HIGH', 'OPEN_5', 'PALM_OUT'),
      p('SIDE_MID', 'OPEN_5', 'PALM_OUT'),
    ], { pace: 1.1 }),
    { two: 'mirror' }),

  // --- seasons, spans, and when -------------------------------------------

  def('SUMMER', 'SUMMER', 'time', 'A bent index finger is drawn across the forehead, as if wiping sweat.',
    travel(p('FOREHEAD', 'X', 'FINGERS_ACROSS', 'index'), p('TEMPLE', 'X', 'FINGERS_ACROSS', 'index')),
    { note: 'Differs from BLACK only in handshape.' }),

  def('WINTER', 'WINTER', 'time', 'Two W hands held at the chest shiver.',
    twist(p('CHEST_OUT', 'W', 'PALM_IN'), 'PALM_IN', 'PALM_ACROSS', 2),
    { two: 'mirror', fidelity: 'approximate', note: 'Differs from COLD only in handshape.' }),

  def('MONTH', 'MONTH', 'time', 'An index finger slides down the other index finger, as down a calendar.',
    travel(p('CENTRE_HIGH', 'POINT', 'PALM_IN', 'index'), p('CENTRE_MID', 'POINT', 'PALM_IN', 'index')),
    { base: p('CENTRE_LOW', 'POINT', 'PALM_IN'), fidelity: 'approximate' }),

  def('NOON', 'NOON', 'time', 'A flat hand stands upright on the forearm of the other.',
    touch(p('CENTRE_HIGH', 'FLAT', 'PALM_ACROSS')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_DOWN'), fidelity: 'approximate' }),

  def('START', 'START', 'verb', 'An index finger twists between the fingers of the other hand.',
    twist(p('CENTRE_MID', 'POINT', 'FINGERS_FORWARD', 'index'), 'FINGERS_FORWARD', 'FINGERS_ACROSS', 1),
    { base: p('CENTRE_LOW', 'V', 'FINGERS_FORWARD'), fidelity: 'approximate' }),

  def('LATER', 'LATER', 'time', 'An L hand, thumb on the palm, twists forward.',
    twist(p('NEUTRAL', 'L', 'PALM_ACROSS'), 'PALM_ACROSS', 'PALM_OUT', 1, { pace: 1.3 }),
    { fidelity: 'approximate' }),

  def('ALWAYS', 'ALWAYS', 'time', 'An index finger circles in front of the body.',
    loop([
      p('NEUTRAL', 'POINT', 'ANGLED_DOWN'), p('NEUTRAL_HIGH', 'POINT', 'ANGLED_DOWN'),
      p('SIDE_MID', 'POINT', 'ANGLED_DOWN'),
    ], { pace: 1.2 })),

  // --- food ---------------------------------------------------------------

  def('BREAD', 'BREAD', 'food', 'The fingers of one hand slice down the back of the other, as when cutting a loaf.',
    path([
      p('CENTRE_MID', 'FLAT', 'FINGERS_FORWARD', 'middle'), p('CENTRE_HIGH', 'FLAT', 'FINGERS_FORWARD', 'middle'),
      p('CENTRE_MID', 'FLAT', 'FINGERS_FORWARD', 'middle'), p('CENTRE_HIGH', 'FLAT', 'FINGERS_FORWARD', 'middle', 80),
    ]),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_IN'), fidelity: 'approximate' }),

  def('MILK', 'MILK', 'food', 'A hand opens and closes, as when milking.',
    path([
      p('CENTRE_MID', 'C', 'PALM_ACROSS'), p('CENTRE_MID', 'S', 'PALM_ACROSS'),
      p('CENTRE_MID', 'C', 'PALM_ACROSS'), p('CENTRE_MID', 'S', 'PALM_ACROSS', undefined, 100),
    ]),
    { fidelity: 'approximate' }),

  def('COFFEE', 'COFFEE', 'food', 'One fist circles on top of the other, grinding.',
    path([
      p('CENTRE_MID', 'S', 'PALM_DOWN', 'knuckles'), p('CENTRE_HIGH', 'S', 'PALM_DOWN', 'knuckles'),
      p('NEUTRAL', 'S', 'PALM_DOWN', 'knuckles'), p('CENTRE_MID', 'S', 'PALM_DOWN', 'knuckles', 100),
    ], { pace: 1.2 }),
    { base: p('CENTRE_LOW', 'S', 'PALM_DOWN'), fidelity: 'approximate' }),

  def('MEAT', 'MEAT', 'food', 'A pinching hand takes hold of the fleshy part of the other hand and shakes it.',
    tap(p('CENTRE_MID', 'F', 'PALM_DOWN', 'index'), 'CENTRE_HIGH', 2),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_DOWN'), fidelity: 'approximate' }),

  def('CHEESE', 'CHEESE', 'food', 'Two flat hands press together and twist.',
    twist(p('CHEST_OUT', 'FLAT', 'FINGERS_FORWARD', 'palm'), 'FINGERS_FORWARD', 'FINGERS_ACROSS_UP', 1),
    { two: 'mirror', fidelity: 'approximate' }),

  ...family(
    (hs) => twist(p('CHEEK', hs, 'PALM_ACROSS', 'index'), 'PALM_ACROSS', 'PALM_OUT', 1),
    [
      ['APPLE', 'APPLE', 'X', 'A bent index finger twists against the cheek.'],
      ['FRUIT', 'FRUIT', 'F', 'An F hand twists against the cheek.'],
      ['VEGETABLE', 'VEGETABLE', 'V', 'A V hand twists against the cheek.'],
    ],
    'food', { fidelity: 'approximate' },
  ),

  def('THIRSTY', 'THIRSTY', 'feeling', 'An index finger draws down the throat.',
    travel(p('CHIN', 'POINT', 'POINT_UP_BACK', 'index'), p('NECK', 'POINT', 'POINT_UP_BACK', 'index'))),
];
