/**
 * People, family and groups.
 *
 * Every sign here is hand-authored from a written description by someone who is
 * not a fluent signer, and is unvalidated. Compounds -- SON, DAUGHTER, BROTHER,
 * SISTER, TEACHER, STUDENT, HUSBAND, WIFE -- are NOT authored as one sign each.
 * ASL builds them from two signs in sequence, so the components are here and
 * the compounds are lexicon entries that expand to both.
 */

import type { SignDefinition } from '../definition.js';
import { def, family, loop, path, tap, touch, travel, twist, p } from '../templates.js';

export const PEOPLE: readonly SignDefinition[] = [
  // --- the components compounds are built from ---------------------------

  def('BOY', 'BOY', 'person',
    'A C hand at the forehead closes and opens, like taking hold of a cap brim.',
    path([
      p('FOREHEAD', 'C', 'PALM_ACROSS', 'index'),
      p('FOREHEAD', 'FLAT_O', 'PALM_ACROSS', 'index'),
      p('FOREHEAD', 'C', 'PALM_ACROSS', 'index'),
      p('FOREHEAD', 'FLAT_O', 'PALM_ACROSS', 'index', 120),
    ]),
    { fidelity: 'approximate', note: 'The grasp is two alternating handshapes.' }),

  def('GIRL', 'GIRL', 'person',
    'The thumb of an A hand strokes down the cheek along the jaw.',
    travel(p('CHEEK', 'A', 'PALM_ACROSS', 'thumb'), p('CHIN', 'A', 'PALM_ACROSS', 'thumb'))),

  def('BABY', 'BABY', 'person',
    'Both arms cradle and rock from side to side.',
    path([
      p('CENTRE_MID', 'FLAT', 'PALM_UP'),
      p('SIDE_MID', 'FLAT', 'PALM_UP'),
      p('CENTRE_MID', 'FLAT', 'PALM_UP'),
      p('SIDE_MID', 'FLAT', 'PALM_UP', undefined, 100),
    ], { pace: 1.2 }),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate',
      note: 'The real sign is the forearms cradled one over the other; the base hand is held in place.' }),

  def('MARRY', 'MARRY', 'family',
    'Two hands come together and clasp.',
    travel(p('NEUTRAL', 'C', 'PALM_ACROSS'), p('CHEST_OUT', 'S', 'PALM_ACROSS')),
    { two: 'mirror', fidelity: 'approximate', note: 'The clasp is positional; the hands do not interlock.' }),

  def('SAME_INDEX', 'SAME(index)', 'quantity',
    'Two index fingers held side by side, pointing forward.',
    touch(p('CHEST_OUT', 'POINT', 'FINGERS_FORWARD')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('GRAND', 'GRAND', 'family',
    'The hand bounces out and away from the face, the second half of GRANDMOTHER and GRANDFATHER.',
    path([
      p('CHIN', 'OPEN_5', 'PALM_ACROSS', 'thumb'),
      p('NEUTRAL', 'OPEN_5', 'PALM_ACROSS', 'thumb'),
      p('OUT_FAR', 'OPEN_5', 'PALM_ACROSS', 'thumb', 100),
    ]),
    { fidelity: 'approximate' }),

  def('TEACH', 'TEACH', 'school',
    'Both flattened O hands start at the temples and move forward, opening.',
    travel(p('TEMPLE', 'FLAT_O', 'PALM_OUT', 'middle'), p('NEUTRAL_HIGH', 'FLAT', 'PALM_UP')),
    { two: 'mirror' }),

  // --- family -------------------------------------------------------------

  def('UNCLE', 'UNCLE', 'family',
    'A U hand near the temple, shaken.',
    twist(p('TEMPLE', 'U', 'PALM_ACROSS', 'index'), 'PALM_ACROSS', 'PALM_OUT', 2),
    { fidelity: 'approximate' }),

  def('AUNT', 'AUNT', 'family',
    'An A hand near the cheek, shaken.',
    twist(p('CHEEK', 'A', 'PALM_ACROSS', 'thumb'), 'PALM_ACROSS', 'PALM_OUT', 2),
    { fidelity: 'approximate' }),

  // --- groups: one circle, five handshapes -------------------------------

  ...family(
    (hs) => path([
      p('CHEST_OUT', hs, 'PALM_OUT'),
      p('NEUTRAL', hs, 'PALM_SIDE'),
      p('SIDE_MID', hs, 'PALM_SIDE'),
      p('NEUTRAL_LOW', hs, 'PALM_IN'),
      p('CHEST_OUT', hs, 'PALM_IN', undefined, 100),
    ], { pace: 1.1 }),
    [
      ['GROUP', 'GROUP', 'G', 'Both G hands circle outward and back together.'],
      ['CLASS', 'CLASS', 'C', 'Both C hands circle outward and back together.'],
      ['TEAM', 'TEAM', 'T', 'Both T hands circle outward and back together.'],
      ['ORGANIZATION', 'ORGANIZATION', 'O', 'Both O hands circle outward and back together.'],
    ],
    'society', { two: 'mirror', fidelity: 'citation' },
  ),

  // --- roles --------------------------------------------------------------

  def('DOCTOR', 'DOCTOR', 'health',
    'An M hand taps the wrist of the other hand, as when taking a pulse.',
    tap(p('CENTRE_MID', 'M', 'PALM_DOWN', 'knuckles'), 'CENTRE_HIGH', 2),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate',
      note: 'Contact with the wrist is positional.' }),

  def('NURSE', 'NURSE', 'health',
    'An N hand taps the wrist of the other hand.',
    tap(p('CENTRE_MID', 'N', 'PALM_DOWN', 'knuckles'), 'CENTRE_HIGH', 2),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate',
      note: 'Contact with the wrist is positional.' }),

  def('POLICE', 'POLICE', 'society',
    'A C hand taps the chest where a badge would be.',
    tap(p('CONTRA_CHEST', 'C', 'PALM_IN', 'thumb'), 'CHEST_OUT', 2)),

  def('KING', 'KING', 'society',
    'A K hand sweeps from one shoulder down to the opposite hip.',
    travel(p('CONTRA_SHOULDER', 'K', 'PALM_IN', 'thumb'), p('WAIST', 'K', 'PALM_IN', 'thumb'))),

  def('QUEEN', 'QUEEN', 'society',
    'A Q hand sweeps from one shoulder down to the opposite hip.',
    travel(p('CONTRA_SHOULDER', 'Q', 'PALM_IN', 'thumb'), p('WAIST', 'Q', 'PALM_IN', 'thumb'))),

  def('BOSS', 'BOSS', 'work',
    'The fingertips of a flat hand tap the shoulder.',
    tap(p('SHOULDER', 'FLAT', 'PALM_DOWN', 'middle'), 'SIDE_MID', 2),
    { fidelity: 'approximate' }),

  def('HEARING', 'HEARING', 'person',
    'An index finger circles forward from the mouth.',
    loop([
      p('MOUTH', 'POINT', 'PALM_ACROSS', 'index'),
      p('FACE_LOW', 'POINT', 'PALM_ACROSS', 'index'),
      p('CHIN', 'POINT', 'PALM_ACROSS', 'index'),
    ]),
    { fidelity: 'approximate' }),

  def('BLIND', 'BLIND', 'person',
    'A V hand, fingers pointing at the eyes, pokes toward them.',
    tap(p('BROW', 'V', 'POINT_UP_BACK', 'index'), 'FACE_HIGH', 2),
    { fidelity: 'approximate' }),
];
