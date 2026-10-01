/**
 * Animals, nature, places and things.
 *
 * Many animal signs depict a feature of the animal -- whiskers, horns, a beak --
 * and so depend on contact at the face. Many of the object signs are produced
 * ON the other hand, where contact is positional here and not physical.
 *
 * Hand-authored from written descriptions, not reviewed by a Deaf signer.
 */

import type { SignDefinition } from '../definition.js';
import { arc, change, def, loop, path, tap, touch, travel, twist, p } from '../templates.js';

export const WORLD: readonly SignDefinition[] = [
  // --- animals ------------------------------------------------------------

  def('DOG', 'DOG', 'animal', 'A hand pats the thigh, as when calling a dog.',
    tap(p('WAIST', 'FLAT', 'PALM_DOWN', 'palm'), 'NEUTRAL_LOW', 2, { pace: 1.6 }), { fidelity: 'approximate', note: 'The snap that follows the pat is not rendered.' }),

  def('CAT', 'CAT', 'animal', 'Two pinched hands at the cheeks draw outward, as whiskers.',
    travel(p('CHEEK', 'F', 'POINT_IN_FROM_SIDE', 'index'), p('SIDE_HIGH', 'F', 'POINT_IN_FROM_SIDE', 'index')),
    { two: 'mirror' }),

  def('BIRD', 'BIRD', 'animal', 'A beak opens and closes at the mouth.',
    path([
      p('MOUTH', 'L', 'POINT_IN_FROM_SIDE', 'index'), p('MOUTH', 'F', 'POINT_IN_FROM_SIDE', 'index'),
      p('MOUTH', 'L', 'POINT_IN_FROM_SIDE', 'index'), p('MOUTH', 'F', 'POINT_IN_FROM_SIDE', 'index', 100),
    ]),
    { fidelity: 'approximate' }),

  def('DUCK', 'DUCK', 'animal', 'Fingers open and close at the mouth like a bill.',
    path([
      p('MOUTH', 'U', 'POINT_IN_FROM_SIDE', 'index'), p('MOUTH', 'H', 'POINT_IN_FROM_SIDE', 'index'),
      p('MOUTH', 'U', 'POINT_IN_FROM_SIDE', 'index'), p('MOUTH', 'H', 'POINT_IN_FROM_SIDE', 'index', 100),
    ]),
    { fidelity: 'approximate' }),

  def('HORSE', 'HORSE', 'animal', 'A U hand, thumb at the temple, with the fingers flapping like ears.',
    twist(p('TEMPLE', 'U', 'PALM_OUT', 'thumb'), 'PALM_OUT', 'PALM_ACROSS', 2),
    { fidelity: 'approximate' }),

  def('COW', 'COW', 'animal', 'A Y hand, thumb at the temple, twists like a horn.',
    twist(p('TEMPLE', 'Y', 'PALM_ACROSS', 'thumb'), 'PALM_ACROSS', 'PALM_OUT', 1)),

  def('PIG', 'PIG', 'animal', 'The back of a hand under the chin, fingers flapping.',
    tap(p('CHIN', 'FLAT', 'PALM_DOWN', 'knuckles'), 'FACE_LOW', 2), { fidelity: 'approximate' }),

  def('MOUSE', 'MOUSE', 'animal', 'An index finger brushes up the nose, twice.',
    travel(p('NOSE', 'POINT', 'POINT_IN_FROM_SIDE', 'index'), p('BROW', 'POINT', 'POINT_IN_FROM_SIDE', 'index')),
    { fidelity: 'approximate' }),

  def('ELEPHANT', 'ELEPHANT', 'animal', 'A hand swings out from the nose like a trunk.',
    arc(
      p('NOSE', 'BENT_FLAT', 'POINT_UP_BACK', 'middle'),
      p('OUT_FAR', 'BENT_FLAT', 'POINT_UP_BACK', 'middle'),
      p('NEUTRAL_LOW', 'BENT_FLAT', 'POINT_UP_BACK', 'middle'),
    ),
    { fidelity: 'approximate' }),

  def('BEAR', 'BEAR', 'animal', 'Both clawed hands scratch down the chest, arms crossed.',
    travel(p('CONTRA_SHOULDER', 'CLAW', 'PALM_IN', 'middle'), p('CONTRA_CHEST', 'CLAW', 'PALM_IN', 'middle'),
      { from: 'CONTRA_SHOULDER' }),
    { two: 'mirror', fidelity: 'approximate',
      note: 'Starts with the arms already crossed: mirrored hands cannot cross each other on the way in without passing through.' }),

  def('SNAKE', 'SNAKE', 'animal', 'A bent V hand, as fangs, weaves forward.',
    arc(p('NEUTRAL', 'BENT_V', 'FINGERS_FORWARD'), p('SIDE_MID', 'BENT_V', 'FINGERS_FORWARD'), p('OUT_FAR', 'BENT_V', 'FINGERS_FORWARD')),
    { fidelity: 'approximate' }),

  def('DEER', 'DEER', 'animal', 'Both open hands at the temples, as antlers.',
    touch(p('TEMPLE', 'OPEN_5', 'PALM_OUT', 'thumb')), { two: 'mirror', fidelity: 'approximate' }),

  def('FISH', 'FISH', 'animal', 'A flat hand swims forward, wriggling.',
    arc(p('NEUTRAL', 'FLAT', 'FINGERS_FORWARD'), p('SIDE_MID', 'FLAT', 'FINGERS_FORWARD'), p('OUT_FAR', 'FLAT', 'FINGERS_FORWARD')),
    { fidelity: 'approximate', note: 'The wriggle is a sway; one sign for the animal and the food.' }),

  def('ANIMAL', 'ANIMAL', 'animal', 'Both bent hands pat the chest alternately.',
    tap(p('CHEST', 'BENT_FLAT', 'PALM_IN', 'middle'), 'CHEST_OUT', 3), { two: 'alternate', fidelity: 'approximate' }),

  // --- nature -------------------------------------------------------------

  def('SUN', 'SUN', 'nature', 'A hand held up and to the side, opening its fingers like rays.',
    change('SIDE_HIGH', p('SIDE_HIGH', 'O', 'PALM_OUT'), p('SIDE_HIGH', 'OPEN_5', 'PALM_OUT')),
    { fidelity: 'approximate' }),

  def('MOON', 'MOON', 'nature', 'A C hand held up beside the head.',
    touch(p('SIDE_HIGH', 'C', 'PALM_ACROSS')), { held: true, fidelity: 'approximate' }),

  def('STAR', 'STAR', 'nature', 'Two index fingers brush past each other going up, alternately.',
    path([
      p('NEUTRAL', 'POINT', 'PALM_OUT'), p('NEUTRAL_HIGH', 'POINT', 'PALM_OUT'),
      p('NEUTRAL', 'POINT', 'PALM_OUT'), p('NEUTRAL_HIGH', 'POINT', 'PALM_OUT', undefined, 80),
    ], { pace: 1.1 }),
    { two: 'alternate', fidelity: 'approximate' }),

  def('SKY', 'SKY', 'nature', 'A flat hand sweeps in an arc overhead.',
    arc(p('NEUTRAL_HIGH', 'FLAT', 'PALM_DOWN'), p('ABOVE_HEAD', 'FLAT', 'PALM_DOWN'), p('SIDE_HIGH', 'FLAT', 'PALM_DOWN'), { pace: 1.1 })),

  def('RAIN', 'RAIN', 'nature', 'Both hands, fingers wiggling, move down like falling rain.',
    travel(p('NEUTRAL_HIGH', 'CLAW', 'PALM_DOWN'), p('NEUTRAL_LOW', 'CLAW', 'PALM_DOWN'), { pace: 1.2 }),
    { two: 'mirror', fidelity: 'approximate', note: 'The finger wiggle is not rendered.' }),

  def('SNOW', 'SNOW', 'nature', 'Both hands, fingers fluttering, drift gently down.',
    travel(p('NEUTRAL_HIGH', 'BENT_FLAT', 'PALM_DOWN'), p('NEUTRAL_LOW', 'BENT_FLAT', 'PALM_DOWN'), { pace: 1.6 }),
    { two: 'mirror', fidelity: 'approximate', note: 'The flutter is not rendered.' }),

  def('WIND', 'WIND', 'nature', 'Both flat hands sway from side to side.',
    path([
      p('NEUTRAL', 'FLAT', 'PALM_ACROSS'), p('SIDE_MID', 'FLAT', 'PALM_ACROSS'),
      p('NEUTRAL', 'FLAT', 'PALM_ACROSS'), p('SIDE_MID', 'FLAT', 'PALM_ACROSS', undefined, 80),
    ], { pace: 1.2 }),
    { two: 'mirror' }),

  def('FIRE', 'FIRE', 'nature', 'Both hands, fingers wiggling, rise like flames.',
    travel(p('NEUTRAL_LOW', 'OPEN_5', 'PALM_IN'), p('NEUTRAL_HIGH', 'OPEN_5', 'PALM_IN'), { pace: 1.2 }),
    { two: 'mirror', fidelity: 'approximate', note: 'The flicker is not rendered.' }),

  def('TREE', 'TREE', 'nature', 'An open hand on the forearm, twisting, like a tree on a trunk.',
    twist(p('CENTRE_HIGH', 'OPEN_5', 'PALM_IN'), 'PALM_IN', 'PALM_OUT', 2),
    { base: p('CENTRE_LOW', 'FLAT', 'FINGERS_ACROSS_UP'), fidelity: 'approximate' }),

  def('FLOWER', 'FLOWER', 'nature', 'A flattened O touches one side of the nose, then the other.',
    travel(p('NOSE', 'FLAT_O', 'POINT_UP_BACK', 'middle'), p('CHEEK', 'FLAT_O', 'POINT_UP_BACK', 'middle')),
    { fidelity: 'approximate' }),

  def('WEATHER', 'WEATHER', 'nature', 'Two W hands tap together.',
    tap(p('CHEST_OUT', 'W', 'PALM_ACROSS'), 'NEUTRAL', 2), { two: 'mirror', fidelity: 'approximate' }),

  def('WORLD', 'WORLD', 'nature', 'A W hand circles around a fist.',
    loop([
      p('CENTRE_HIGH', 'W', 'PALM_ACROSS'), p('NEUTRAL_HIGH', 'W', 'PALM_ACROSS'),
      p('OUT_FAR', 'W', 'PALM_ACROSS'),
    ], { pace: 1.2 }),
    { base: p('CENTRE_LOW', 'S', 'PALM_DOWN'), fidelity: 'approximate' }),

  // --- places and things --------------------------------------------------

  def('ROOM', 'ROOM', 'place', 'Two R hands, palms facing, outline the walls of a room.',
    travel(p('CHEST_OUT', 'R', 'PALM_ACROSS'), p('SIDE_MID', 'R', 'PALM_ACROSS')),
    { two: 'mirror', fidelity: 'approximate', note: 'Differs from READY only in palm orientation.' }),

  def('DOOR', 'DOOR', 'place', 'A flat hand swings on the edge of the other, like a door on its hinge.',
    twist(p('CENTRE_MID', 'FLAT', 'PALM_ACROSS'), 'PALM_ACROSS', 'PALM_OUT', 1),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_ACROSS'), fidelity: 'approximate' }),

  def('BED', 'BED', 'place', 'A flat hand against the cheek, as a head on a pillow.',
    touch(p('CHEEK', 'FLAT', 'POINT_IN_FROM_SIDE', 'palm')), { fidelity: 'approximate', note: 'Angled so the thumb clears the head; the head tilt is not rendered.' }),

  def('TABLE', 'TABLE', 'thing', 'A flat hand taps down on the other flat hand, as on a tabletop.',
    tap(p('CENTRE_MID', 'FLAT', 'PALM_DOWN', 'palm'), 'CENTRE_HIGH', 2),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_DOWN'), fidelity: 'approximate' }),

  def('CHAIR', 'CHAIR', 'thing', 'A bent V hand taps twice on another, as a seat.',
    tap(p('CENTRE_MID', 'BENT_V', 'FINGERS_ACROSS_DOWN', 'middle'), 'CENTRE_HIGH', 2),
    { base: p('CENTRE_LOW', 'BENT_V', 'FINGERS_FORWARD'), fidelity: 'approximate',
      note: 'Differs from SIT only in tapping twice.' }),

  def('CHURCH', 'CHURCH', 'place', 'A C hand taps on the back of a fist.',
    tap(p('CENTRE_MID', 'C', 'PALM_DOWN', 'thumb'), 'CENTRE_HIGH', 2),
    { base: p('CENTRE_LOW', 'S', 'PALM_DOWN'), fidelity: 'approximate' }),

  def('ROAD', 'ROAD', 'place', 'Two flat hands, palms facing, move forward together, as the sides of a road.',
    travel(p('CHEST_OUT', 'FLAT', 'PALM_ACROSS'), p('OUT_FAR', 'FLAT', 'PALM_ACROSS')), { two: 'mirror' }),

  def('THING', 'THING', 'thing', 'A flat hand, palm up, moves out to the side.',
    travel(p('NEUTRAL', 'FLAT', 'PALM_UP'), p('SIDE_MID', 'FLAT', 'PALM_UP'))),

  def('PAPER', 'PAPER', 'thing', 'The heel of one hand brushes across the other, twice.',
    path([
      p('CENTRE_MID', 'FLAT', 'PALM_DOWN', 'palm'), p('NEUTRAL', 'FLAT', 'PALM_DOWN', 'palm'),
      p('CENTRE_MID', 'FLAT', 'PALM_DOWN', 'palm'), p('NEUTRAL', 'FLAT', 'PALM_DOWN', 'palm', 80),
    ]),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_UP'), fidelity: 'approximate' }),

  def('GAME', 'GAME', 'thing', 'Two fists knock together, twice.',
    tap(p('CHEST_OUT', 'A', 'PALM_IN'), 'NEUTRAL', 2), { two: 'mirror', fidelity: 'approximate' }),

  def('CLOTHES', 'CLOTHES', 'clothing', 'Both hands brush down the chest.',
    travel(p('CHEST', 'OPEN_5', 'PALM_IN', 'palm'), p('STOMACH', 'OPEN_5', 'PALM_IN', 'palm')), { two: 'mirror' }),

  def('LANGUAGE', 'LANGUAGE', 'communication', 'Two L hands draw apart.',
    travel(p('CHEST_OUT', 'L', 'PALM_OUT'), p('SIDE_MID', 'L', 'PALM_OUT')), { two: 'mirror', fidelity: 'approximate' }),

  def('ANSWER', 'ANSWER', 'communication', 'Two index fingers move forward from the lips.',
    travel(p('MOUTH', 'POINT', 'FINGERS_FORWARD', 'index'), p('OUT_FAR', 'POINT', 'FINGERS_FORWARD', 'index')),
    { two: 'mirror', fidelity: 'approximate' }),

  def('PROBLEM', 'PROBLEM', 'thing', 'Bent V knuckles twist against each other.',
    twist(p('CENTRE_MID', 'BENT_V', 'PALM_DOWN', 'knuckles'), 'PALM_DOWN', 'PALM_ACROSS', 2),
    { base: p('CENTRE_LOW', 'BENT_V', 'PALM_DOWN'), fidelity: 'approximate', note: 'Differs from HARD in twisting rather than tapping.' }),

  def('IDEA', 'IDEA', 'thing', 'An I hand rises from the forehead.',
    travel(p('FOREHEAD', 'I', 'PALM_ACROSS', 'pinky'), p('ABOVE_HEAD', 'I', 'PALM_ACROSS', 'pinky'))),

  def('LIFE', 'LIFE', 'thing', 'Both L hands move up the body.',
    path([p('WAIST', 'L', 'PALM_IN'), p('NEUTRAL', 'L', 'PALM_IN'), p('CHEST_OUT', 'L', 'PALM_IN', undefined, 100)], { pace: 1.1 }),
    { two: 'mirror', fidelity: 'approximate', note: 'The same movement as LIVE with an L handshape.' }),

  def('GOD', 'GOD', 'religion', 'A flat hand starts above the head and lowers.',
    travel(p('ABOVE_HEAD', 'FLAT', 'PALM_ACROSS'), p('NEUTRAL_HIGH', 'FLAT', 'PALM_ACROSS')), { fidelity: 'approximate' }),

  def('LAW', 'LAW', 'society', 'An L hand taps on the palm of the other hand.',
    tap(p('CENTRE_MID', 'L', 'PALM_ACROSS', 'thumb'), 'CENTRE_HIGH', 2),
    { base: p('CENTRE_LOW', 'FLAT', 'PALM_ACROSS'), fidelity: 'approximate' }),

  def('TRAIN', 'TRAIN', 'transport', 'Two fingers slide along two fingers, as a train on its track.',
    travel(p('CENTRE_MID', 'H', 'FINGERS_ACROSS_DOWN', 'middle'), p('NEUTRAL', 'H', 'FINGERS_ACROSS_DOWN', 'middle'), { pace: 1.3 }),
    { base: p('CENTRE_LOW', 'H', 'FINGERS_FORWARD'), fidelity: 'approximate' }),

  def('BIKE', 'BIKE', 'transport', 'Two fists pedal in alternating circles.',
    path([
      p('NEUTRAL_LOW', 'S', 'PALM_DOWN'), p('NEUTRAL', 'S', 'PALM_DOWN'),
      p('NEUTRAL_LOW', 'S', 'PALM_DOWN'), p('NEUTRAL', 'S', 'PALM_DOWN', undefined, 80),
    ], { pace: 1.3 }),
    { two: 'alternate', fidelity: 'approximate' }),

  // --- quantity -----------------------------------------------------------

  def('MANY', 'MANY', 'quantity', 'Both fists spring open, again and again.',
    path([
      p('NEUTRAL', 'S', 'PALM_UP'), p('NEUTRAL', 'OPEN_5', 'PALM_UP'),
      p('NEUTRAL', 'S', 'PALM_UP'), p('NEUTRAL', 'OPEN_5', 'PALM_UP', undefined, 80),
    ]),
    { two: 'mirror', fidelity: 'approximate' }),

  def('MUCH', 'MUCH', 'quantity', 'Both hands, curved, draw apart as if around something large.',
    travel(p('CHEST_OUT', 'CLAW', 'PALM_UP'), p('SIDE_MID', 'CLAW', 'PALM_UP')), { two: 'mirror' }),

  def('NOTHING', 'NOTHING', 'quantity', 'Both O hands open and move apart.',
    travel(p('CHEST_OUT', 'O', 'PALM_DOWN'), p('SIDE_MID', 'FLAT', 'PALM_DOWN')), { two: 'mirror', fidelity: 'approximate' }),

  def('ANOTHER', 'ANOTHER', 'quantity', 'A thumb, held out, swings to the side.',
    twist(p('NEUTRAL', 'THUMB_OUT', 'PALM_ACROSS'), 'PALM_ACROSS', 'PALM_UP', 1), { fidelity: 'approximate' }),

  // --- the sign for "I love you" -----------------------------------------

  def('I_LOVE_YOU', 'I-LOVE-YOU', 'greeting', 'The I-L-Y handshape, held up.',
    touch(p('NEUTRAL_HIGH', 'ILY', 'PALM_OUT', undefined, 300)), { held: true }),

  def('DONT_KNOW', 'DON’T-KNOW', 'verb', 'A flat hand at the forehead turns outward and away.',
    travel(p('FOREHEAD', 'FLAT', 'PALM_IN', 'middle'), p('NEUTRAL_HIGH', 'FLAT', 'PALM_OUT', 'middle')),
    { fidelity: 'approximate' }),
];
