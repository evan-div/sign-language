/**
 * Verbs.
 *
 * Two limits on this batch are worth stating up front.
 *
 * ASL verbs are frequently DIRECTIONAL: GIVE-you and GIVE-me are one sign aimed
 * at two places, and the sign carries its subject and object in its path. There
 * are no loci here, so every verb is signed once, in its citation form, aimed
 * at the viewer or at nobody. That is a real loss and is listed in the
 * architecture notes as a gap, not a design.
 *
 * And a verb whose form I could not recall well enough is not here. REMEMBER,
 * USE, KEEP, LET, BELIEVE, WIN and a dozen others are left to fingerspelling
 * rather than signed wrongly; they are recorded in data/vocabulary/skipped.json
 * with the reason.
 *
 * Hand-authored from written descriptions, not reviewed by a Deaf signer.
 */

import type { SignDefinition } from '../definition.js';
import { change, def, path, tap, touch, travel, twist, p } from '../templates.js';

export const VERBS: readonly SignDefinition[] = [
  // --- possession and transfer -------------------------------------------

  def('HAVE', 'HAVE', 'verb', 'Bent hands are drawn to the chest, fingertips touching it.',
    travel(p('NEUTRAL', 'BENT_FLAT', 'PALM_IN', 'middle'), p('CHEST', 'BENT_FLAT', 'PALM_IN', 'middle')),
    { two: 'mirror' }),

  def('GET', 'GET', 'verb', 'Open hands close into fists as they are drawn in, as if grasping.',
    travel(p('NEUTRAL', 'CLAW', 'PALM_DOWN'), p('CHEST_OUT', 'S', 'PALM_DOWN')),
    { two: 'mirror', fidelity: 'approximate', note: 'The grasp is a change of handshape along the path.' }),

  def('SEND', 'SEND', 'verb', 'A flattened O flicks open and away from the other hand.',
    travel(p('NEUTRAL', 'FLAT_O', 'PALM_DOWN'), p('OUT_FAR', 'OPEN_5', 'PALM_DOWN')),
    { fidelity: 'approximate' }),

  def('SHOW', 'SHOW', 'communication', 'An index finger touches the palm of the other hand, and both move forward.',
    path(
      [p('CENTRE_MID', 'POINT', 'FINGERS_FORWARD', 'index'), p('OUT_FAR', 'POINT', 'FINGERS_FORWARD', 'index', 100)],
      { other: [p('CENTRE_LOW', 'FLAT', 'PALM_OUT'), p('CHEST_OUT', 'FLAT', 'PALM_OUT', undefined, 100)] },
    ),
    { fidelity: 'approximate', note: 'Contact between the hands is positional.' }),

  def('PAY', 'PAY', 'society', 'An index finger flicks forward off the palm of the other hand.',
    travel(p('CENTRE_MID', 'POINT', 'FINGERS_FORWARD', 'index'), p('OUT_FAR', 'POINT', 'FINGERS_FORWARD', 'index')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('BUY', 'BUY', 'society', 'A flattened O takes money from the palm of the other hand and moves forward.',
    travel(p('CENTRE_MID', 'FLAT_O', 'PALM_UP', 'middle'), p('OUT_FAR', 'FLAT_O', 'PALM_UP', 'middle')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('SELL', 'SELL', 'society', 'Both flattened O hands swing forward and out, away from the body.',
    travel(p('CHEST_OUT', 'FLAT_O', 'PALM_DOWN', 'middle'), p('OUT_FAR', 'FLAT_O', 'PALM_DOWN', 'middle')),
    { two: 'mirror', fidelity: 'approximate' }),

  // --- motion ------------------------------------------------------------

  def('OPEN', 'OPEN', 'verb', 'Two flat hands, palms out and together, swing apart like doors.',
    travel(p('CHEST_OUT', 'FLAT', 'PALM_OUT'), p('SIDE_MID', 'FLAT', 'PALM_OUT')), { two: 'mirror' }),

  def('CLOSE', 'CLOSE', 'verb', 'Two flat hands, palms out and apart, swing together like doors.',
    travel(p('SIDE_MID', 'FLAT', 'PALM_OUT'), p('CHEST_OUT', 'FLAT', 'PALM_OUT')), { two: 'mirror' }),

  def('PUSH', 'PUSH', 'verb', 'Both flat hands push forward.',
    travel(p('CHEST_OUT', 'FLAT', 'PALM_OUT'), p('OUT_FAR', 'FLAT', 'PALM_OUT')), { two: 'mirror' }),

  def('PULL', 'PULL', 'verb', 'A fist grips and is drawn back toward the body.',
    travel(p('OUT_FAR', 'S', 'PALM_IN'), p('CHEST_OUT', 'S', 'PALM_IN'))),

  def('WALK', 'WALK', 'motion', 'Two flat hands, palms down, step forward alternately.',
    path([
      p('NEUTRAL_LOW', 'FLAT', 'PALM_DOWN'), p('OUT_FAR', 'FLAT', 'PALM_DOWN'),
      p('NEUTRAL_LOW', 'FLAT', 'PALM_DOWN'), p('OUT_FAR', 'FLAT', 'PALM_DOWN', undefined, 80),
    ], { pace: 1.2 }),
    { two: 'alternate' }),

  def('TRAVEL', 'TRAVEL', 'motion', 'A V hand moves forward in an arc, fingers walking.',
    path([p('NEUTRAL', 'V', 'FINGERS_DOWN'), p('NEUTRAL_HIGH', 'V', 'FINGERS_DOWN'), p('OUT_FAR', 'V', 'FINGERS_DOWN', undefined, 100)]),
    { fidelity: 'approximate', note: 'The walking fingers are not rendered.' }),

  def('PLANE', 'PLANE', 'transport', 'An I-L-Y hand, as a plane, flies up and away.',
    travel(p('NEUTRAL', 'ILY', 'PALM_DOWN'), p('OUT_HIGH', 'ILY', 'PALM_DOWN')),
    { note: 'Used for both the aircraft and flying.' }),

  def('SIT', 'SIT', 'verb', 'Two bent fingers come down onto two others and rest on them.',
    travel(p('CENTRE_HIGH', 'BENT_V', 'FINGERS_ACROSS_DOWN', 'middle'), p('CENTRE_MID', 'BENT_V', 'FINGERS_ACROSS_DOWN', 'middle')),
    { base: p('CENTRE_LOW', 'BENT_V', 'FINGERS_FORWARD'), fidelity: 'approximate',
      note: 'Contact is positional. Differs from CHAIR in making one movement, not two taps, and from NAME in handshape.' }),

  def('STAND', 'STAND', 'verb', 'A V hand stands, fingers down, on the palm of the other hand.',
    touch(p('CENTRE_MID', 'V', 'FINGERS_DOWN', 'index')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('DANCE', 'DANCE', 'verb', 'A V hand swings back and forth over the other palm.',
    path([
      p('CENTRE_MID', 'V', 'FINGERS_DOWN', 'index'), p('NEUTRAL', 'V', 'FINGERS_DOWN', 'index'),
      p('CENTRE_MID', 'V', 'FINGERS_DOWN', 'index'), p('NEUTRAL', 'V', 'FINGERS_DOWN', 'index', 80),
    ]),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('SING', 'SING', 'verb', 'A flat hand sways back and forth over the forearm.',
    path([
      p('CENTRE_MID', 'FLAT', 'PALM_SIDE'), p('NEUTRAL', 'FLAT', 'PALM_SIDE'),
      p('CENTRE_MID', 'FLAT', 'PALM_SIDE'), p('NEUTRAL', 'FLAT', 'PALM_SIDE', undefined, 80),
    ], { pace: 1.2 }),
    { base: p('CENTRE_LOW', 'FLAT', 'FINGERS_ACROSS_UP'), fidelity: 'approximate' }),

  // --- the senses and the mind -------------------------------------------

  def('LISTEN', 'LISTEN', 'verb', 'A cupped hand held to the ear.',
    touch(p('EAR', 'C', 'PALM_ACROSS', 'index')), { fidelity: 'approximate' }),

  // HEAR is deliberately absent. "Ear" and "hear" are one pointing sign in ASL;
  // the phonological check reported them identical in every parameter, which is
  // the case it exists for. The right model is one sign (EAR) reached by two
  // English words, and the lexicon says so.

  def('FEEL', 'FEEL', 'feeling', 'The middle finger brushes up the chest.',
    travel(p('STOMACH', 'OPEN_8', 'PALM_IN', 'middle'), p('NECK', 'OPEN_8', 'PALM_IN', 'middle'))),

  def('FORGET', 'FORGET', 'verb', 'A flat hand wipes across the forehead and closes.',
    travel(p('FOREHEAD', 'FLAT', 'PALM_IN', 'middle'), p('TEMPLE', 'A', 'PALM_IN', 'middle')),
    { fidelity: 'approximate' }),

  def('DECIDE', 'DECIDE', 'verb', 'Both F hands drop from the forehead.',
    travel(p('FOREHEAD', 'F', 'PALM_ACROSS', 'index'), p('NEUTRAL', 'F', 'PALM_ACROSS', 'index')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('CHOOSE', 'CHOOSE', 'verb', 'A pinch picks something from the air and lifts it.',
    travel(p('NEUTRAL', 'F', 'PALM_OUT'), p('NEUTRAL_HIGH', 'F', 'PALM_OUT')), { fidelity: 'approximate' }),

  def('FIND', 'FIND', 'verb', 'An open hand rises, fingers closing into a pinch.',
    travel(p('NEUTRAL', 'OPEN_5', 'PALM_DOWN'), p('NEUTRAL_HIGH', 'F', 'PALM_DOWN')),
    { fidelity: 'approximate' }),

  def('TRY', 'TRY', 'verb', 'Both T hands push forward together.',
    travel(p('CHEST_OUT', 'T', 'PALM_IN'), p('NEUTRAL', 'T', 'PALM_IN')), { two: 'mirror', fidelity: 'approximate' }),

  // --- reading, writing, studying ----------------------------------------

  def('READ', 'READ', 'school', 'A V hand scans down the face of the other palm.',
    travel(p('CENTRE_HIGH', 'V', 'FINGERS_DOWN', 'index'), p('CENTRE_MID', 'V', 'FINGERS_DOWN', 'index')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_OUT'), fidelity: 'approximate' }),

  def('WRITE', 'WRITE', 'school', 'A pinched hand writes across the palm of the other.',
    travel(p('CENTRE_MID', 'F', 'PALM_DOWN', 'index'), p('NEUTRAL', 'F', 'PALM_DOWN', 'index')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('STUDY', 'STUDY', 'school', 'Fingers wiggle toward the palm of the other hand.',
    touch(p('CENTRE_HIGH', 'OPEN_5', 'FINGERS_DOWN', 'middle')),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate', note: 'The wiggle is not rendered.' }),

  // --- change and meeting ------------------------------------------------

  def('MEET', 'MEET', 'verb', 'Two index fingers come together.',
    travel(p('NEUTRAL', 'POINT', 'PALM_ACROSS'), p('CHEST_OUT', 'POINT', 'PALM_ACROSS')), { two: 'mirror' }),

  def('VISIT', 'VISIT', 'verb', 'Two V hands circle forward alternately.',
    path([
      p('NEUTRAL', 'V', 'PALM_IN'), p('NEUTRAL_HIGH', 'V', 'PALM_IN'),
      p('NEUTRAL', 'V', 'PALM_IN'), p('NEUTRAL_HIGH', 'V', 'PALM_IN', undefined, 80),
    ], { pace: 1.1 }),
    { two: 'alternate', fidelity: 'approximate' }),

  def('CHANGE', 'CHANGE', 'verb', 'Two fists turn over in opposite directions.',
    twist(p('CHEST_OUT', 'S', 'PALM_DOWN'), 'PALM_DOWN', 'PALM_UP', 1, { pace: 1.2 }),
    { two: 'alternate', fidelity: 'approximate' }),

  def('BREAK', 'BREAK', 'verb', 'Two fists held together snap apart.',
    travel(p('CHEST_OUT', 'S', 'PALM_DOWN'), p('SIDE_MID', 'S', 'PALM_UP')), { two: 'mirror', fidelity: 'approximate' }),

  def('CUT', 'CUT', 'verb', 'Two fingers snip like scissors, moving forward.',
    path([
      p('NEUTRAL', 'V', 'PALM_DOWN'), p('NEUTRAL', 'U', 'PALM_DOWN'),
      p('OUT_FAR', 'V', 'PALM_DOWN'), p('OUT_FAR', 'U', 'PALM_DOWN', undefined, 80),
    ], { pace: 1.2 }),
    { fidelity: 'approximate', note: 'The snip is a change from V to U.' }),

  def('LOSE', 'LOSE', 'verb', 'Pinched fingers drop open, letting something go.',
    travel(p('NEUTRAL', 'F', 'PALM_UP'), p('NEUTRAL_LOW', 'OPEN_5', 'PALM_UP')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('COOK', 'COOK', 'food', 'A flat hand turns over on the palm of the other, as when turning food.',
    twist(p('CENTRE_MID', 'FLAT', 'PALM_UP'), 'PALM_UP', 'PALM_DOWN', 1),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('KITCHEN', 'KITCHEN', 'place', 'A K hand turns over on the palm of the other.',
    twist(p('CENTRE_MID', 'K', 'PALM_UP'), 'PALM_UP', 'PALM_DOWN', 1),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),
];
