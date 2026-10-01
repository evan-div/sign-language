/**
 * Qualities and colours.
 *
 * Several of these are initialised: the colours BLUE, GREEN, YELLOW and PURPLE
 * are one shaking movement made with the first letter of the English word, so
 * they are written as a family -- one movement, four handshapes.
 *
 * Hand-authored from written descriptions, not reviewed by a Deaf signer.
 */

import type { SignDefinition } from '../definition.js';
import { change, def, family, path, tap, touch, travel, twist, p } from '../templates.js';

export const QUALITIES: readonly SignDefinition[] = [
  // --- colours ------------------------------------------------------------

  ...family(
    (hs) => twist(p('NEUTRAL_HIGH', hs, 'PALM_ACROSS'), 'PALM_ACROSS', 'PALM_OUT', 2),
    [
      ['BLUE', 'BLUE', 'B', 'A B hand shaken by twisting the wrist.'],
      ['GREEN', 'GREEN', 'G', 'A G hand shaken by twisting the wrist.'],
      ['YELLOW', 'YELLOW', 'Y', 'A Y hand shaken by twisting the wrist.'],
      ['PURPLE', 'PURPLE', 'P', 'A P hand shaken by twisting the wrist.'],
    ],
    'color',
  ),

  def('RED', 'RED', 'color', 'An index finger strokes down the lips.',
    travel(p('MOUTH', 'POINT', 'POINT_UP_BACK', 'index'), p('CHIN', 'POINT', 'POINT_UP_BACK', 'index'))),

  def('PINK', 'PINK', 'color', 'The middle finger of a P hand strokes down the lips.',
    travel(p('MOUTH', 'P', 'POINT_UP_BACK', 'middle'), p('CHIN', 'P', 'POINT_UP_BACK', 'middle'))),

  def('BROWN', 'BROWN', 'color', 'A B hand slides down the cheek.',
    travel(p('CHEEK', 'B', 'PALM_ACROSS', 'index'), p('CHIN', 'B', 'PALM_ACROSS', 'index'))),

  def('BLACK', 'BLACK', 'color', 'An index finger is drawn across the forehead.',
    travel(p('FOREHEAD', 'POINT', 'FINGERS_ACROSS', 'index'), p('TEMPLE', 'POINT', 'FINGERS_ACROSS', 'index'))),

  def('WHITE', 'WHITE', 'color', 'An open hand on the chest is drawn out, closing.',
    travel(p('CHEST', 'OPEN_5', 'PALM_IN', 'middle'), p('NEUTRAL', 'FLAT_O', 'PALM_IN', 'middle'))),

  def('ORANGE', 'ORANGE', 'color', 'A hand at the mouth squeezes, as when squeezing an orange.',
    path([
      p('MOUTH', 'C', 'PALM_ACROSS', 'index'),
      p('MOUTH', 'S', 'PALM_ACROSS', 'index'),
      p('MOUTH', 'C', 'PALM_ACROSS', 'index'),
      p('MOUTH', 'S', 'PALM_ACROSS', 'index', 100),
    ]),
    { fidelity: 'approximate', note: 'One sign for both the fruit and the colour.' }),

  def('COLOR', 'COLOR', 'color', 'Fingers wiggle at the chin.',
    touch(p('CHIN', 'OPEN_5', 'PALM_IN', 'middle')),
    { fidelity: 'approximate', note: 'The finger wiggle is not rendered.' }),

  // --- temperature, weight, speed ----------------------------------------

  def('HOT', 'HOT', 'quality', 'A C hand at the mouth turns outward and down, as if spitting out something hot.',
    travel(p('MOUTH', 'C', 'PALM_IN', 'thumb'), p('NEUTRAL', 'C', 'PALM_DOWN', 'thumb')),
    { fidelity: 'approximate' }),

  def('COLD', 'COLD', 'quality', 'Two fists held at the chest shiver.',
    twist(p('CHEST_OUT', 'S', 'PALM_IN'), 'PALM_IN', 'PALM_ACROSS', 2),
    { two: 'mirror', fidelity: 'approximate', note: 'A shiver is rendered as a slow twist.' }),

  def('HEAVY', 'HEAVY', 'quality', 'Both hands, palms up, drop as if weighed down.',
    travel(p('NEUTRAL', 'CLAW', 'PALM_UP'), p('NEUTRAL_LOW', 'CLAW', 'PALM_UP')), { two: 'mirror' }),

  def('LIGHT_WEIGHT', 'LIGHT(weight)', 'quality', 'Both hands, palms up, rise as if holding something weightless.',
    travel(p('NEUTRAL_LOW', 'OPEN_5', 'PALM_UP'), p('NEUTRAL', 'OPEN_5', 'PALM_UP')), { two: 'mirror' }),

  def('FAST', 'FAST', 'quality', 'An L hand flicks closed, the index snapping toward the thumb.',
    change('CHEST_OUT', p('CHEST_OUT', 'L', 'PALM_ACROSS'), p('CHEST_OUT', 'A', 'PALM_ACROSS')),
    { fidelity: 'approximate', note: 'A snap is two handshapes.' }),

  def('SLOW', 'SLOW', 'quality', 'One hand slides slowly up the back of the other.',
    travel(p('CENTRE_MID', 'FLAT', 'PALM_DOWN', 'palm'), p('CENTRE_HIGH', 'FLAT', 'PALM_DOWN', 'palm'), { pace: 1.7 }),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_DOWN'), fidelity: 'approximate',
      note: 'Contact with the other hand is positional.' }),

  // --- age ---------------------------------------------------------------

  def('OLD', 'OLD', 'quality', 'A fist at the chin is drawn down, as if stroking a beard.',
    travel(p('CHIN', 'A', 'PALM_IN', 'knuckles'), p('CHEST_OUT', 'A', 'PALM_IN', 'knuckles')),
    { fidelity: 'approximate' }),

  def('YOUNG', 'YOUNG', 'quality', 'Two bent hands brush upward on the chest, twice.',
    path([
      p('STOMACH', 'BENT_FLAT', 'PALM_IN', 'middle'),
      p('CHEST', 'BENT_FLAT', 'PALM_IN', 'middle'),
      p('STOMACH', 'BENT_FLAT', 'PALM_IN', 'middle'),
      p('CHEST', 'BENT_FLAT', 'PALM_IN', 'middle', 100),
    ], { pace: 1.1 }),
    { two: 'mirror', fidelity: 'approximate' }),

  // --- condition ---------------------------------------------------------

  def('HARD', 'HARD', 'quality', 'A bent V hand knocks on another, twice.',
    tap(p('CENTRE_MID', 'BENT_V', 'PALM_DOWN', 'knuckles'), 'CENTRE_HIGH', 2),
    { base: p('CENTRE_LOW', 'BENT_V', 'PALM_DOWN'), fidelity: 'approximate',
      note: 'One sign for both "difficult" and "solid". Contact between the hands is positional.' }),

  def('EASY', 'EASY', 'quality', 'The fingertips of one bent hand brush upward across the other, twice.',
    path([
      p('CENTRE_MID', 'BENT_FLAT', 'PALM_UP', 'middle'),
      p('CENTRE_HIGH', 'BENT_FLAT', 'PALM_UP', 'middle'),
      p('CENTRE_MID', 'BENT_FLAT', 'PALM_UP', 'middle'),
      p('CENTRE_HIGH', 'BENT_FLAT', 'PALM_UP', 'middle', 100),
    ]),
    { base: p('CENTRE_LOW', 'BENT_FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('CLEAN', 'CLEAN', 'quality', 'One flat hand wipes along the palm of the other.',
    travel(p('CENTRE_MID', 'FLAT', 'PALM_DOWN', 'palm'), p('OUT_FAR', 'FLAT', 'PALM_DOWN', 'palm')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate',
      note: 'One sign for both "clean" and "nice". Contact is positional.' }),

  def('DIRTY', 'DIRTY', 'quality', 'The back of a hand under the chin, fingers wiggling.',
    touch(p('CHIN', 'OPEN_5', 'PALM_DOWN', 'knuckles')),
    { fidelity: 'approximate', note: 'The wiggle is not rendered.' }),

  def('QUIET', 'QUIET', 'quality', 'Both flat hands start before the mouth and are drawn down and apart.',
    travel(p('FACE_LOW', 'FLAT', 'PALM_OUT'), p('NEUTRAL_LOW', 'FLAT', 'PALM_DOWN')),
    { two: 'mirror', fidelity: 'uncertain' }),

  def('READY', 'READY', 'quality', 'Both R hands move together to one side.',
    travel(p('CHEST_OUT', 'R', 'PALM_OUT'), p('SIDE_MID', 'R', 'PALM_OUT')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('BUSY', 'BUSY', 'quality', 'A flat hand circles on the back of the other.',
    path([
      p('CENTRE_MID', 'FLAT', 'PALM_DOWN', 'palm'),
      p('CENTRE_HIGH', 'FLAT', 'PALM_DOWN', 'palm'),
      p('NEUTRAL', 'FLAT', 'PALM_DOWN', 'palm'),
      p('CENTRE_MID', 'FLAT', 'PALM_DOWN', 'palm', 100),
    ]),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_DOWN'), fidelity: 'approximate' }),

  def('IMPORTANT', 'IMPORTANT', 'quality', 'Both F hands rise and meet.',
    travel(p('NEUTRAL_LOW', 'F', 'PALM_IN'), p('CHEST_OUT', 'F', 'PALM_IN')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('FUNNY', 'FUNNY', 'quality', 'An H hand brushes the nose, twice.',
    tap(p('NOSE', 'H', 'POINT_IN_FROM_SIDE', 'middle'), 'FACE_HIGH', 2), { fidelity: 'approximate' }),

  def('CRAZY', 'CRAZY', 'quality', 'An index finger circles at the temple.',
    path([
      p('TEMPLE', 'POINT', 'POINT_IN_FROM_SIDE', 'index'),
      p('FOREHEAD', 'POINT', 'POINT_IN_FROM_SIDE', 'index'),
      p('TEMPLE', 'POINT', 'POINT_IN_FROM_SIDE', 'index'),
      p('FOREHEAD', 'POINT', 'POINT_IN_FROM_SIDE', 'index', 100),
    ]),
    { fidelity: 'approximate', note: 'The circle is a back-and-forth.' }),

  def('WRONG', 'WRONG', 'quality', 'The thumb of a Y hand touches the chin.',
    touch(p('CHIN', 'Y', 'PALM_IN', 'thumb'))),

  def('FINE', 'FINE', 'quality', 'The thumb of an open hand touches the chest.',
    touch(p('CHEST', 'OPEN_5', 'PALM_ACROSS', 'thumb'))),
];
