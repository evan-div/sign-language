/**
 * The body, health, and feelings.
 *
 * Body-part signs are largely indexical -- you point at the thing -- which is
 * why they are short, and why they depend most heavily on the contact-site
 * machinery: an index finger "at the eye" has to put its fingertip there, not
 * its wrist.
 *
 * Hand-authored from written descriptions, not reviewed by a Deaf signer.
 */

import type { SignDefinition } from '../definition.js';
import { change, def, loop, path, tap, touch, travel, twist, p } from '../templates.js';

export const BODY: readonly SignDefinition[] = [
  // --- the head -----------------------------------------------------------

  def('EYE', 'EYE', 'body', 'An index finger points at the eye.',
    touch(p('BROW', 'POINT', 'POINT_IN_FROM_SIDE', 'index'))),

  def('EAR', 'EAR', 'body', 'An index finger points at the ear.',
    touch(p('EAR', 'POINT', 'POINT_UP_BACK', 'index'))),

  def('NOSE', 'NOSE', 'body', 'An index finger points at the nose.',
    touch(p('NOSE', 'POINT', 'POINT_IN_FROM_SIDE', 'index'))),

  def('MOUTH', 'MOUTH', 'body', 'An index finger points at the mouth.',
    touch(p('MOUTH', 'POINT', 'POINT_UP_BACK', 'index'))),

  def('TOOTH', 'TOOTH', 'body', 'An index finger taps the front teeth.',
    tap(p('MOUTH', 'POINT', 'POINT_UP_BACK', 'index'), 'FACE_LOW', 2)),

  def('NECK', 'NECK', 'body', 'An index finger points at the throat.',
    touch(p('NECK', 'POINT', 'POINT_UP_BACK', 'index'))),

  def('HAIR', 'HAIR', 'body', 'Thumb and index finger take hold of a strand of hair.',
    touch(p('TEMPLE', 'F', 'PALM_ACROSS', 'index')), { fidelity: 'approximate' }),

  def('FACE', 'FACE', 'body', 'An index finger circles the face.',
    loop([
      p('FACE_HIGH', 'POINT', 'POINT_UP_BACK', 'index'),
      p('SIDE_HIGH', 'POINT', 'POINT_UP_BACK', 'index'),
      p('FACE_LOW', 'POINT', 'POINT_UP_BACK', 'index'),
      p('CENTRE_HIGH', 'POINT', 'POINT_UP_BACK', 'index'),
    ], { pace: 1.1 }),
    { fidelity: 'approximate', note: 'The circle is four points; it is a rough loop, not a smooth one.' }),

  // --- the trunk ----------------------------------------------------------

  def('STOMACH', 'STOMACH', 'body', 'A flat hand pats the stomach.',
    tap(p('STOMACH', 'FLAT', 'PALM_IN', 'palm'), 'NEUTRAL', 2)),

  def('BODY', 'BODY', 'body', 'Both flat hands pat the chest and then the waist.',
    travel(p('CHEST', 'FLAT', 'PALM_IN', 'palm'), p('WAIST', 'FLAT', 'PALM_IN', 'palm')),
    { two: 'mirror' }),

  // --- health -------------------------------------------------------------

  def('PAIN', 'PAIN', 'health', 'Two index fingers jab toward each other, twisting.',
    twist(p('CHEST_OUT', 'POINT', 'FINGERS_ACROSS'), 'FINGERS_ACROSS', 'FINGERS_ACROSS_DOWN', 2),
    { two: 'mirror' }),

  def('MEDICINE', 'MEDICINE', 'health', 'A middle finger rubs in the other palm.',
    path([
      p('CENTRE_MID', 'OPEN_8', 'PALM_DOWN', 'middle'),
      p('NEUTRAL', 'OPEN_8', 'PALM_DOWN', 'middle'),
      p('CENTRE_MID', 'OPEN_8', 'PALM_DOWN', 'middle'),
      p('NEUTRAL', 'OPEN_8', 'PALM_DOWN', 'middle', 100),
    ]),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate',
      note: 'The rub is a short back-and-forth, not a circle.' }),

  def('HOSPITAL', 'HOSPITAL', 'health', 'An H hand draws a cross on the upper arm.',
    path([
      p('CONTRA_SHOULDER', 'H', 'PALM_IN', 'index'),
      p('CONTRA_CHEST', 'H', 'PALM_IN', 'index', 80),
      p('CONTRA_SHOULDER', 'H', 'PALM_IN', 'index', 40),
      p('CONTRA_CHEST', 'H', 'PALM_IN', 'index', 100),
    ]),
    { fidelity: 'approximate', note: 'Only one stroke of the cross is drawn.' }),

  def('PREGNANT', 'PREGNANT', 'health', 'A flat hand moves outward from the stomach, tracing its curve.',
    travel(p('STOMACH', 'FLAT', 'PALM_IN', 'palm'), p('NEUTRAL', 'FLAT', 'PALM_IN', 'palm')),
    { fidelity: 'approximate' }),

  def('DIE', 'DIE', 'health', 'Two flat hands turn over in opposite directions.',
    twist(p('NEUTRAL', 'FLAT', 'PALM_DOWN'), 'PALM_DOWN', 'PALM_UP', 1, { pace: 1.3 }),
    { two: 'alternate' }),

  def('STRONG', 'STRONG', 'health', 'A fist at the shoulder moves outward, as a flexed arm does.',
    travel(p('SHOULDER', 'S', 'PALM_IN', 'knuckles'), p('SIDE_MID', 'S', 'PALM_IN', 'knuckles')),
    { fidelity: 'approximate' }),

  // --- expressions -------------------------------------------------------

  def('SMILE', 'SMILE', 'feeling', 'Two index fingers trace the corners of the mouth upward.',
    travel(p('MOUTH', 'POINT', 'POINT_IN_FROM_SIDE', 'index'), p('CHEEK', 'POINT', 'POINT_IN_FROM_SIDE', 'index'),
      { pace: 1.4 }),
    { two: 'mirror' }),

  def('LAUGH', 'LAUGH', 'feeling', 'Two index fingers at the corners of the mouth bob up and down.',
    tap(p('CHEEK', 'POINT', 'POINT_IN_FROM_SIDE', 'index'), 'MOUTH', 3), { two: 'mirror' }),

  def('CRY', 'CRY', 'feeling', 'Two index fingers trace tears down the cheeks.',
    travel(p('BROW', 'POINT', 'POINT_IN_FROM_SIDE', 'index'), p('CHEEK', 'POINT', 'POINT_IN_FROM_SIDE', 'index')),
    { two: 'mirror' }),

  // --- feelings -----------------------------------------------------------

  def('EXCITED', 'EXCITED', 'feeling', 'Two middle fingers brush up the chest, alternating.',
    travel(p('STOMACH', 'OPEN_8', 'PALM_IN', 'middle'), p('NECK', 'OPEN_8', 'PALM_IN', 'middle')),
    { two: 'alternate', fidelity: 'approximate' }),

  def('PROUD', 'PROUD', 'feeling', 'A thumb slides up the chest.',
    travel(p('STOMACH', 'THUMB_OUT', 'PALM_IN', 'thumb'), p('NECK', 'THUMB_OUT', 'PALM_IN', 'thumb'))),

  def('SURPRISED', 'SURPRISED', 'feeling', 'Pinched fingers at the eyes spring open.',
    change('FACE_HIGH', p('FACE_HIGH', 'F', 'PALM_OUT'), p('FACE_HIGH', 'OPEN_5', 'PALM_OUT')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('SCARED', 'SCARED', 'feeling', 'Two fists at the chest spring open and draw back.',
    change('CHEST_OUT', p('CHEST_OUT', 'S', 'PALM_IN'), p('CHEST_OUT', 'OPEN_5', 'PALM_IN')),
    { two: 'mirror', fidelity: 'uncertain' }),

  def('NERVOUS', 'NERVOUS', 'feeling', 'Both open hands shake in front of the body.',
    path([
      p('NEUTRAL', 'OPEN_5', 'PALM_DOWN'),
      p('CHEST_OUT', 'OPEN_5', 'PALM_DOWN'),
      p('NEUTRAL', 'OPEN_5', 'PALM_DOWN'),
      p('CHEST_OUT', 'OPEN_5', 'PALM_DOWN', undefined, 80),
    ], { pace: 0.9 }),
    { two: 'alternate', fidelity: 'approximate', note: 'A tremble is rendered as a slow sway.' }),

  def('WORRY', 'WORRY', 'feeling', 'Two bent hands circle alternately in front of the face.',
    path([
      p('FACE_LOW', 'BENT_FLAT', 'PALM_IN'),
      p('FACE_HIGH', 'BENT_FLAT', 'PALM_IN'),
      p('FACE_LOW', 'BENT_FLAT', 'PALM_IN'),
      p('FACE_HIGH', 'BENT_FLAT', 'PALM_IN', undefined, 80),
    ], { pace: 1.1 }),
    { two: 'alternate', fidelity: 'approximate' }),

  def('HATE', 'HATE', 'feeling', 'Both hands flick their middle fingers off the thumbs, outward.',
    travel(p('CHEST_OUT', 'OPEN_8', 'PALM_OUT'), p('NEUTRAL', 'OPEN_5', 'PALM_OUT')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('BORED', 'BORED', 'feeling', 'An index finger rests at the side of the nose and twists.',
    twist(p('NOSE', 'POINT', 'POINT_IN_FROM_SIDE', 'index'), 'POINT_UP_BACK', 'ANGLED_IN', 1),
    { fidelity: 'approximate' }),
];
