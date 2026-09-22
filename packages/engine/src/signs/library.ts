/**
 * The authored sign library.
 *
 * READ THIS BEFORE TRUSTING ANYTHING HERE. Every sign below is hand-authored
 * from written descriptions by someone who is not a fluent signer, and none has
 * been checked by a Deaf reviewer. They are placeholders whose job is to prove
 * the pipeline -- lexicon lookup, sequencing, transitions, timeline, the sentence
 * UI -- not to teach ASL. Several are certainly wrong in detail, and the
 * two-handed ones are the least reliable because contact between the hands is
 * positional rather than physical.
 *
 * This is the shape the architecture expects: provisional motion behind a stable
 * SignID, carrying provenance that says exactly what it is, so replacing it with
 * extracted or captured motion is a data change and not a code change.
 */

import type { SignDefinition, SignProvenance } from './definition.js';

const PLACEHOLDER: SignProvenance = {
  source: 'hand-authored',
  validation: 'unvalidated',
  note: 'Authored from written descriptions; not reviewed by a Deaf signer.',
};

export const SIGNS: Readonly<Record<string, SignDefinition>> = Object.freeze({
  HELLO: {
    id: 'HELLO', gloss: 'HELLO',
    description: 'Flat hand at the temple, moving out and away in a salute.',
    durationMs: 640, strokeStartMs: 120, strokeEndMs: 520, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'FLAT', orientation: 'ANGLED_OUT' },
      { atMs: 180, location: 'TEMPLE', handshape: 'FLAT', orientation: 'ANGLED_IN', contact: 'middle' },
      { atMs: 300, location: 'TEMPLE', handshape: 'FLAT', orientation: 'ANGLED_IN', contact: 'middle' },
      { atMs: 560, location: 'OUT_HIGH', handshape: 'FLAT', orientation: 'ANGLED_OUT' },
      { atMs: 640, location: 'OUT_HIGH', handshape: 'FLAT', orientation: 'ANGLED_OUT' },
    ],
  },

  MY: {
    id: 'MY', gloss: 'MY',
    description: 'Flat hand laid against the chest, palm inward.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 470, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_IN' },
      { atMs: 300, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
      { atMs: 560, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
    ],
  },

  NAME: {
    id: 'NAME', gloss: 'NAME',
    description: 'Two H hands; the dominant taps twice across the non-dominant.',
    durationMs: 860, strokeStartMs: 120, strokeEndMs: 780, provenance: PLACEHOLDER,
    repeat: { fromMs: 200, toMs: 540, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'H', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 200, location: 'CENTRE_MID', handshape: 'H', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 370, location: 'CENTRE_LOW', handshape: 'H', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 540, location: 'CENTRE_MID', handshape: 'H', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 860, location: 'CENTRE_LOW', handshape: 'H', orientation: 'FINGERS_ACROSS_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'H', orientation: 'FINGERS_FORWARD' },
  },

  'THANK-YOU': {
    id: 'THANK-YOU', gloss: 'THANK-YOU',
    description: 'Flat hand from the chin, moving forward and down.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'FLAT', orientation: 'PALM_IN' },
      { atMs: 200, location: 'MOUTH', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 320, location: 'MOUTH', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 560, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 620, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
  },

  YOU: {
    id: 'YOU', gloss: 'YOU',
    description: 'Index finger pointing forward at the addressee.',
    durationMs: 440, strokeStartMs: 90, strokeEndMs: 380, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 240, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 440, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
    ],
  },

  ME: {
    id: 'ME', gloss: 'ME',
    description: 'Index finger pointing at the signer’s own chest.',
    durationMs: 440, strokeStartMs: 90, strokeEndMs: 380, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 240, location: 'CHEST', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 440, location: 'CHEST', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
    ],
  },

  YOUR: {
    id: 'YOUR', gloss: 'YOUR',
    description: 'Flat hand pushed forward, palm toward the addressee.',
    durationMs: 460, strokeStartMs: 90, strokeEndMs: 400, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_OUT' },
      { atMs: 260, location: 'NEUTRAL_HIGH', handshape: 'FLAT', orientation: 'PALM_OUT' },
      { atMs: 460, location: 'NEUTRAL_HIGH', handshape: 'FLAT', orientation: 'PALM_OUT' },
    ],
  },

  WHAT: {
    id: 'WHAT', gloss: 'WHAT',
    description: 'Both hands open and palms up, shaken slightly.',
    durationMs: 640, strokeStartMs: 110, strokeEndMs: 580, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'OPEN_5', orientation: 'PALM_UP' },
      { atMs: 220, location: 'SIDE_MID', handshape: 'OPEN_5', orientation: 'PALM_UP' },
      { atMs: 380, location: 'NEUTRAL', handshape: 'OPEN_5', orientation: 'PALM_UP' },
      { atMs: 540, location: 'SIDE_MID', handshape: 'OPEN_5', orientation: 'PALM_UP' },
      { atMs: 640, location: 'SIDE_MID', handshape: 'OPEN_5', orientation: 'PALM_UP' },
    ],
    symmetry: 'mirror',
  },

  YES: {
    id: 'YES', gloss: 'YES',
    description: 'Fist nodding at the wrist.',
    durationMs: 520, strokeStartMs: 90, strokeEndMs: 460, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'PALM_OUT' },
      { atMs: 160, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'ANGLED_DOWN' },
      { atMs: 300, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'PALM_OUT' },
      { atMs: 440, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'ANGLED_DOWN' },
      { atMs: 520, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'ANGLED_DOWN' },
    ],
  },

  NO: {
    id: 'NO', gloss: 'NO',
    description: 'Index and middle finger closing onto the thumb.',
    durationMs: 460, strokeStartMs: 80, strokeEndMs: 400, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'U', orientation: 'PALM_OUT' },
      { atMs: 260, location: 'NEUTRAL_HIGH', handshape: 'FLAT_O', orientation: 'PALM_OUT' },
      { atMs: 460, location: 'NEUTRAL_HIGH', handshape: 'FLAT_O', orientation: 'PALM_OUT' },
    ],
  },

  PLEASE: {
    id: 'PLEASE', gloss: 'PLEASE',
    description: 'Flat hand circling on the chest.',
    durationMs: 700, strokeStartMs: 110, strokeEndMs: 640, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_IN' },
      { atMs: 200, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
      { atMs: 360, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
      { atMs: 520, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
      { atMs: 700, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
    ],
  },

  SORRY: {
    id: 'SORRY', gloss: 'SORRY',
    description: 'Fist circling on the chest.',
    durationMs: 700, strokeStartMs: 110, strokeEndMs: 640, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'A', orientation: 'PALM_IN' },
      { atMs: 200, location: 'CHEST', handshape: 'A', orientation: 'PALM_IN', contact: 'knuckles' },
      { atMs: 360, location: 'CENTRE_MID', handshape: 'A', orientation: 'PALM_IN', contact: 'knuckles' },
      { atMs: 520, location: 'CHEST', handshape: 'A', orientation: 'PALM_IN', contact: 'knuckles' },
      { atMs: 700, location: 'CHEST', handshape: 'A', orientation: 'PALM_IN', contact: 'knuckles' },
    ],
  },

  GOOD: {
    id: 'GOOD', gloss: 'GOOD',
    description: 'Flat hand from the chin, lowered forward onto the other palm.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'FLAT', orientation: 'PALM_IN' },
      { atMs: 200, location: 'MOUTH', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 460, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 600, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  LOVE: {
    id: 'LOVE', gloss: 'LOVE',
    description: 'Both fists crossed over the chest.',
    durationMs: 620, strokeStartMs: 110, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 300, location: 'CHEST_OUT', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 620, location: 'CHEST_OUT', handshape: 'S', orientation: 'PALM_IN' },
    ],
    nonDominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 300, location: 'CENTRE_MID', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 620, location: 'CENTRE_MID', handshape: 'S', orientation: 'PALM_IN' },
    ],
  },

  LEARN: {
    id: 'LEARN', gloss: 'LEARN',
    description: 'Dominant hand lifts from the other palm to the forehead.',
    durationMs: 700, strokeStartMs: 110, strokeEndMs: 640, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'OPEN_5', orientation: 'PALM_DOWN' },
      { atMs: 220, location: 'CENTRE_MID', handshape: 'OPEN_5', orientation: 'PALM_DOWN' },
      { atMs: 380, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'PALM_DOWN' },
      { atMs: 620, location: 'FOREHEAD', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 700, location: 'FOREHEAD', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  DEAF: {
    id: 'DEAF', gloss: 'DEAF',
    description: 'Index finger touching near the ear, then near the mouth.',
    durationMs: 640, strokeStartMs: 110, strokeEndMs: 580, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 240, location: 'EAR', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 400, location: 'CHEEK', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 520, location: 'MOUTH', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 640, location: 'MOUTH', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
    ],
  },

  HELP: {
    id: 'HELP', gloss: 'HELP',
    description: 'Dominant fist resting on the open non-dominant palm, both lifting.',
    durationMs: 620, strokeStartMs: 110, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'A', orientation: 'PALM_ACROSS' },
      { atMs: 260, location: 'CENTRE_MID', handshape: 'A', orientation: 'PALM_ACROSS' },
      { atMs: 520, location: 'NEUTRAL_HIGH', handshape: 'A', orientation: 'PALM_ACROSS' },
      { atMs: 620, location: 'NEUTRAL_HIGH', handshape: 'A', orientation: 'PALM_ACROSS' },
    ],
    nonDominant: [
      { atMs: 0, location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 260, location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 520, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 620, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
  },

  SIGN: {
    id: 'SIGN', gloss: 'SIGN',
    description: 'Both index fingers circling alternately in front of the body.',
    durationMs: 720, strokeStartMs: 120, strokeEndMs: 660, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'POINT', orientation: 'PALM_IN' },
      { atMs: 240, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_IN' },
      { atMs: 480, location: 'NEUTRAL', handshape: 'POINT', orientation: 'PALM_IN' },
      { atMs: 720, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_IN' },
    ],
    symmetry: 'alternate',
  },

  RIGHT_CORRECT: {
    id: 'RIGHT_CORRECT', gloss: 'RIGHT',
    description: 'Dominant index hand brought down onto the non-dominant index hand.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 300, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 560, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'PALM_ACROSS' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'POINT', orientation: 'PALM_ACROSS' },
  },

  RIGHT_DIRECTION: {
    id: 'RIGHT_DIRECTION', gloss: 'RIGHT(direction)',
    description: 'R handshape moving toward the dominant side.',
    durationMs: 520, strokeStartMs: 90, strokeEndMs: 470, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'R', orientation: 'PALM_OUT' },
      { atMs: 160, location: 'NEUTRAL', handshape: 'R', orientation: 'PALM_OUT' },
      { atMs: 440, location: 'SIDE_MID', handshape: 'R', orientation: 'PALM_OUT' },
      { atMs: 520, location: 'SIDE_MID', handshape: 'R', orientation: 'PALM_OUT' },
    ],
  },

  // --- pronouns and pointing -------------------------------------------

  WE: {
    id: 'WE', gloss: 'WE',
    description: 'Index points at the signer’s chest and arcs across to the other side.',
    durationMs: 700, strokeStartMs: 110, strokeEndMs: 640, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 220, location: 'CHEST', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 460, location: 'CONTRA_CHEST', handshape: 'POINT', orientation: 'FINGERS_ACROSS' },
      { atMs: 700, location: 'CONTRA_CHEST', handshape: 'POINT', orientation: 'FINGERS_ACROSS' },
    ],
  },

  THEY: {
    id: 'THEY', gloss: 'THEY',
    description: 'Index points away from the signer and sweeps to the side.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 240, location: 'OUT_FAR', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 480, location: 'SIDE_HIGH', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 600, location: 'SIDE_HIGH', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
    ],
  },

  HE_SHE: {
    id: 'HE_SHE', gloss: 'HE/SHE',
    description: 'Index points off to one side, at a person in the signing space.',
    durationMs: 460, strokeStartMs: 90, strokeEndMs: 400, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 260, location: 'SIDE_HIGH', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 460, location: 'SIDE_HIGH', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
    ],
  },

  ALL: {
    id: 'ALL', gloss: 'ALL',
    description: 'Dominant open hand sweeps around and settles into the other palm.',
    durationMs: 880, strokeStartMs: 120, strokeEndMs: 820, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 300, location: 'CONTRA_CHEST', handshape: 'OPEN_5', orientation: 'PALM_OUT' },
      { atMs: 640, location: 'SIDE_MID', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 880, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  // --- question words ----------------------------------------------------

  WHO: {
    id: 'WHO', gloss: 'WHO',
    description: 'Index circles at the lips.',
    durationMs: 620, strokeStartMs: 110, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 240, location: 'MOUTH', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 420, location: 'CHIN', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 620, location: 'MOUTH', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
    ],
  },

  WHERE: {
    id: 'WHERE', gloss: 'WHERE',
    description: 'Index held up and shaken from side to side.',
    durationMs: 520, strokeStartMs: 110, strokeEndMs: 520, provenance: PLACEHOLDER,
    repeat: { fromMs: 160, toMs: 400, times: 3 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_OUT' },
      { atMs: 160, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_OUT' },
      { atMs: 280, location: 'CENTRE_HIGH', handshape: 'POINT', orientation: 'PALM_OUT' },
      { atMs: 400, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_OUT' },
      { atMs: 520, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_OUT' },
    ],
  },

  WHEN: {
    id: 'WHEN', gloss: 'WHEN',
    description: 'Dominant index circles the other index and lands on it.',
    durationMs: 740, strokeStartMs: 120, strokeEndMs: 680, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'POINT', orientation: 'FINGERS_DOWN' },
      { atMs: 240, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'FINGERS_DOWN' },
      { atMs: 480, location: 'CENTRE_HIGH', handshape: 'POINT', orientation: 'FINGERS_DOWN' },
      { atMs: 740, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'FINGERS_DOWN', contact: 'index' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'POINT', orientation: 'PALM_ACROSS' },
  },

  WHY: {
    id: 'WHY', gloss: 'WHY',
    description: 'Fingers leave the forehead and turn into a Y hand.',
    durationMs: 680, strokeStartMs: 110, strokeEndMs: 620, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'FLAT', orientation: 'PALM_IN' },
      { atMs: 240, location: 'FOREHEAD', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 520, location: 'NEUTRAL_HIGH', handshape: 'Y', orientation: 'PALM_IN' },
      { atMs: 680, location: 'NEUTRAL_HIGH', handshape: 'Y', orientation: 'PALM_IN' },
    ],
  },

  HOW: {
    id: 'HOW', gloss: 'HOW',
    description: 'Two bent hands back to back, rolling up to face the viewer.',
    durationMs: 660, strokeStartMs: 110, strokeEndMs: 600, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 340, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS' },
      { atMs: 660, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
    symmetry: 'mirror',
  },

  // --- people ------------------------------------------------------------

  PERSON: {
    id: 'PERSON', gloss: 'PERSON',
    description: 'Two flat hands trace down the sides of the body.',
    durationMs: 640, strokeStartMs: 110, strokeEndMs: 580, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'SHOULDER', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
      { atMs: 360, location: 'SIDE_MID', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
      { atMs: 640, location: 'SIDE_LOW', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
    ],
    symmetry: 'mirror',
  },

  FRIEND: {
    id: 'FRIEND', gloss: 'FRIEND',
    description: 'Two hooked index fingers link, release and link the other way.',
    durationMs: 720, strokeStartMs: 120, strokeEndMs: 660, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'X', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 260, location: 'CENTRE_MID', handshape: 'X', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 460, location: 'CENTRE_HIGH', handshape: 'X', orientation: 'FINGERS_ACROSS' },
      { atMs: 720, location: 'CENTRE_MID', handshape: 'X', orientation: 'FINGERS_ACROSS' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'X', orientation: 'FINGERS_ACROSS_DOWN' },
  },

  FAMILY: {
    id: 'FAMILY', gloss: 'FAMILY',
    description: 'Two F hands circle outward and come together again in front.',
    durationMs: 760, strokeStartMs: 120, strokeEndMs: 700, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'F', orientation: 'PALM_OUT' },
      { atMs: 300, location: 'SIDE_MID', handshape: 'F', orientation: 'PALM_SIDE' },
      { atMs: 560, location: 'NEUTRAL', handshape: 'F', orientation: 'PALM_IN' },
      { atMs: 760, location: 'CENTRE_MID', handshape: 'F', orientation: 'PALM_IN' },
    ],
    symmetry: 'mirror',
  },

  MOTHER: {
    id: 'MOTHER', gloss: 'MOTHER',
    description: 'Thumb of the open hand taps the chin.',
    durationMs: 740, strokeStartMs: 110, strokeEndMs: 680, provenance: PLACEHOLDER,
    repeat: { fromMs: 260, toMs: 560, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_ACROSS' },
      { atMs: 260, location: 'CHIN', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 410, location: 'NOSE', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 560, location: 'CHIN', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 740, location: 'CHIN', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
    ],
  },

  FATHER: {
    id: 'FATHER', gloss: 'FATHER',
    description: 'Thumb of the open hand taps the forehead.',
    durationMs: 640, strokeStartMs: 110, strokeEndMs: 580, provenance: PLACEHOLDER,
    repeat: { fromMs: 260, toMs: 460, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_ACROSS' },
      { atMs: 260, location: 'FOREHEAD', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 360, location: 'BROW', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 460, location: 'FOREHEAD', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 640, location: 'FOREHEAD', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
    ],
  },

  CHILD: {
    id: 'CHILD', gloss: 'CHILD',
    description: 'Flat hand pats downward at a child’s height.',
    durationMs: 720, strokeStartMs: 100, strokeEndMs: 660, provenance: PLACEHOLDER,
    repeat: { fromMs: 240, toMs: 520, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 240, location: 'NEUTRAL_LOW', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 380, location: 'WAIST', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 520, location: 'NEUTRAL_LOW', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 720, location: 'NEUTRAL_LOW', handshape: 'FLAT', orientation: 'PALM_DOWN' },
    ],
  },

  MAN: {
    id: 'MAN', gloss: 'MAN',
    description: 'Thumb from the forehead down to the chest.',
    durationMs: 680, strokeStartMs: 110, strokeEndMs: 620, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_ACROSS' },
      { atMs: 260, location: 'FOREHEAD', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 560, location: 'CHEST_OUT', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 680, location: 'CHEST_OUT', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
    ],
  },

  WOMAN: {
    id: 'WOMAN', gloss: 'WOMAN',
    description: 'Thumb from the chin down to the chest.',
    durationMs: 680, strokeStartMs: 110, strokeEndMs: 620, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_ACROSS' },
      { atMs: 260, location: 'CHIN', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 560, location: 'CHEST_OUT', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 680, location: 'CHEST_OUT', handshape: 'OPEN_5', orientation: 'PALM_ACROSS', contact: 'thumb' },
    ],
  },

  GOODBYE: {
    id: 'GOODBYE', gloss: 'GOODBYE',
    description: 'Open hand raised, fingers folding and opening in a wave.',
    durationMs: 540, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    repeat: { fromMs: 180, toMs: 420, times: 3 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_OUT' },
      { atMs: 180, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_OUT' },
      { atMs: 300, location: 'NEUTRAL_HIGH', handshape: 'BENT_FLAT', orientation: 'PALM_OUT' },
      { atMs: 420, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_OUT' },
      { atMs: 540, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_OUT' },
    ],
  },

  WELCOME: {
    id: 'WELCOME', gloss: 'WELCOME',
    description: 'Open palm-up hand sweeps in toward the body.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'SIDE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 300, location: 'OUT_FAR', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 560, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 620, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
  },

  EXCUSE_ME: {
    id: 'EXCUSE_ME', gloss: 'EXCUSE-ME',
    description: 'Fingertips brush forward across the other open palm.',
    durationMs: 720, strokeStartMs: 110, strokeEndMs: 660, provenance: PLACEHOLDER,
    repeat: { fromMs: 240, toMs: 540, times: 2 },
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 240, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 390, location: 'NEUTRAL', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 540, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 720, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  // --- verbs -------------------------------------------------------------

  GO: {
    id: 'GO', gloss: 'GO',
    description: 'Both index fingers swing forward and away.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_IN' },
      { atMs: 320, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'ANGLED_DOWN' },
      { atMs: 620, location: 'OUT_FAR', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
    ],
    symmetry: 'mirror',
  },

  COME: {
    id: 'COME', gloss: 'COME',
    description: 'Both index fingers draw in toward the signer.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'OUT_FAR', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 320, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'ANGLED_DOWN' },
      { atMs: 620, location: 'CHEST_OUT', handshape: 'POINT', orientation: 'PALM_IN' },
    ],
    symmetry: 'mirror',
  },

  WANT: {
    id: 'WANT', gloss: 'WANT',
    description: 'Two clawed hands, palms up, pull in toward the body.',
    durationMs: 640, strokeStartMs: 110, strokeEndMs: 580, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'OUT_FAR', handshape: 'CLAW', orientation: 'PALM_UP' },
      { atMs: 360, location: 'NEUTRAL', handshape: 'CLAW', orientation: 'PALM_UP' },
      { atMs: 640, location: 'CHEST_OUT', handshape: 'CLAW', orientation: 'PALM_UP' },
    ],
    symmetry: 'mirror',
  },

  NEED: {
    id: 'NEED', gloss: 'NEED',
    description: 'A hooked index bends down sharply, twice.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    repeat: { fromMs: 200, toMs: 440, times: 2 },
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'X', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 200, location: 'CENTRE_HIGH', handshape: 'X', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 320, location: 'CENTRE_MID', handshape: 'X', orientation: 'PALM_DOWN' },
      { atMs: 440, location: 'CENTRE_HIGH', handshape: 'X', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 560, location: 'CENTRE_HIGH', handshape: 'X', orientation: 'FINGERS_ACROSS_DOWN' },
    ],
  },

  LIKE: {
    id: 'LIKE', gloss: 'LIKE',
    description: 'Thumb and middle finger draw out from the chest and close.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 240, location: 'CHEST', handshape: 'OPEN_5', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 560, location: 'CENTRE_MID', handshape: 'OPEN_8', orientation: 'PALM_IN' },
      { atMs: 620, location: 'CENTRE_MID', handshape: 'OPEN_8', orientation: 'PALM_IN' },
    ],
  },

  KNOW: {
    id: 'KNOW', gloss: 'KNOW',
    description: 'Bent fingertips tap the forehead.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    repeat: { fromMs: 240, toMs: 420, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'BENT_FLAT', orientation: 'PALM_IN' },
      { atMs: 240, location: 'FOREHEAD', handshape: 'BENT_FLAT', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 330, location: 'BROW', handshape: 'BENT_FLAT', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 420, location: 'FOREHEAD', handshape: 'BENT_FLAT', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 560, location: 'FOREHEAD', handshape: 'BENT_FLAT', orientation: 'PALM_IN', contact: 'middle' },
    ],
  },

  THINK: {
    id: 'THINK', gloss: 'THINK',
    description: 'Index finger touches the forehead.',
    durationMs: 520, strokeStartMs: 100, strokeEndMs: 460, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 300, location: 'FOREHEAD', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 520, location: 'FOREHEAD', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
    ],
  },

  UNDERSTAND: {
    id: 'UNDERSTAND', gloss: 'UNDERSTAND',
    description: 'A closed hand at the forehead flicks the index up.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'PALM_ACROSS' },
      { atMs: 260, location: 'TEMPLE', handshape: 'S', orientation: 'PALM_ACROSS', contact: 'knuckles' },
      { atMs: 460, location: 'TEMPLE', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 560, location: 'TEMPLE', handshape: 'POINT', orientation: 'PALM_ACROSS' },
    ],
  },

  SEE: {
    id: 'SEE', gloss: 'SEE',
    description: 'A V hand leaves the eyes and moves forward.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'V', orientation: 'PALM_IN' },
      { atMs: 240, location: 'CHEEK', handshape: 'V', orientation: 'PALM_IN', contact: 'index' },
      { atMs: 540, location: 'OUT_FAR', handshape: 'V', orientation: 'PALM_DOWN' },
      { atMs: 600, location: 'OUT_FAR', handshape: 'V', orientation: 'PALM_DOWN' },
    ],
  },

  SAY: {
    id: 'SAY', gloss: 'SAY',
    description: 'Index circles forward from the chin.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'POINT', orientation: 'PALM_IN' },
      { atMs: 240, location: 'CHIN', handshape: 'POINT', orientation: 'PALM_IN', contact: 'index' },
      { atMs: 440, location: 'CENTRE_HIGH', handshape: 'POINT', orientation: 'ANGLED_DOWN' },
      { atMs: 620, location: 'CHIN', handshape: 'POINT', orientation: 'PALM_IN', contact: 'index' },
    ],
  },

  ASK: {
    id: 'ASK', gloss: 'ASK',
    description: 'An extended index draws back and hooks toward the signer.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'OUT_FAR', handshape: 'POINT', orientation: 'PALM_OUT' },
      { atMs: 300, location: 'CENTRE_HIGH', handshape: 'POINT', orientation: 'PALM_OUT' },
      { atMs: 560, location: 'CENTRE_HIGH', handshape: 'X', orientation: 'PALM_OUT' },
    ],
  },

  GIVE: {
    id: 'GIVE', gloss: 'GIVE',
    description: 'Flattened O hands move forward and open out.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'PALM_UP' },
      { atMs: 320, location: 'NEUTRAL_HIGH', handshape: 'FLAT_O', orientation: 'PALM_UP' },
      { atMs: 620, location: 'OUT_FAR', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
    symmetry: 'mirror',
  },

  MAKE: {
    id: 'MAKE', gloss: 'MAKE',
    description: 'One fist rests on the other and both twist.',
    durationMs: 660, strokeStartMs: 110, strokeEndMs: 600, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'S', orientation: 'PALM_DOWN' },
      { atMs: 300, location: 'CENTRE_MID', handshape: 'S', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 660, location: 'CENTRE_MID', handshape: 'S', orientation: 'PALM_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'S', orientation: 'PALM_DOWN' },
  },

  WORK: {
    id: 'WORK', gloss: 'WORK',
    description: 'One fist taps the back of the other wrist.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    repeat: { fromMs: 240, toMs: 440, times: 2 },
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'S', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 240, location: 'CENTRE_MID', handshape: 'S', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 340, location: 'CENTRE_HIGH', handshape: 'S', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 440, location: 'CENTRE_MID', handshape: 'S', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 600, location: 'CENTRE_MID', handshape: 'S', orientation: 'FINGERS_ACROSS_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'S', orientation: 'PALM_DOWN' },
  },

  PLAY: {
    id: 'PLAY', gloss: 'PLAY',
    description: 'Two Y hands twist back and forth.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    repeat: { fromMs: 180, toMs: 420, times: 3 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_IN' },
      { atMs: 180, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_IN' },
      { atMs: 300, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_DOWN' },
      { atMs: 420, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_IN' },
      { atMs: 560, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_IN' },
    ],
    symmetry: 'mirror',
  },

  EAT: {
    id: 'EAT', gloss: 'EAT',
    description: 'A flattened O hand taps the mouth.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    repeat: { fromMs: 240, toMs: 420, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'FLAT_O', orientation: 'PALM_IN' },
      { atMs: 240, location: 'MOUTH', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 330, location: 'CENTRE_HIGH', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 420, location: 'MOUTH', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 560, location: 'MOUTH', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
    ],
  },

  DRINK: {
    id: 'DRINK', gloss: 'DRINK',
    description: 'A C hand at the mouth tips upward.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'C', orientation: 'PALM_ACROSS' },
      { atMs: 280, location: 'CHIN', handshape: 'C', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 540, location: 'MOUTH', handshape: 'C', orientation: 'ANGLED_IN', contact: 'thumb' },
      { atMs: 600, location: 'MOUTH', handshape: 'C', orientation: 'ANGLED_IN', contact: 'thumb' },
    ],
  },

  SLEEP: {
    id: 'SLEEP', gloss: 'SLEEP',
    description: 'An open hand draws down over the face, closing as it goes.',
    durationMs: 680, strokeStartMs: 110, strokeEndMs: 620, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 280, location: 'BROW', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 620, location: 'CHIN', handshape: 'FLAT_O', orientation: 'PALM_IN' },
      { atMs: 680, location: 'CHIN', handshape: 'FLAT_O', orientation: 'PALM_IN' },
    ],
  },

  LIVE: {
    id: 'LIVE', gloss: 'LIVE',
    description: 'Two A hands travel up the front of the body.',
    durationMs: 660, strokeStartMs: 110, strokeEndMs: 600, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'WAIST', handshape: 'A', orientation: 'PALM_IN' },
      { atMs: 360, location: 'NEUTRAL', handshape: 'A', orientation: 'PALM_IN' },
      { atMs: 660, location: 'CHEST_OUT', handshape: 'A', orientation: 'PALM_IN' },
    ],
    symmetry: 'mirror',
  },

  FINISH: {
    id: 'FINISH', gloss: 'FINISH',
    description: 'Two open hands turn over from facing in to facing down.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 300, location: 'NEUTRAL', handshape: 'OPEN_5', orientation: 'PALM_DOWN' },
      { atMs: 560, location: 'SIDE_MID', handshape: 'OPEN_5', orientation: 'PALM_DOWN' },
    ],
    symmetry: 'mirror',
  },

  // --- feelings and qualities -------------------------------------------

  BAD: {
    id: 'BAD', gloss: 'BAD',
    description: 'Flat hand leaves the mouth and turns over, downward.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'FLAT', orientation: 'PALM_IN' },
      { atMs: 240, location: 'MOUTH', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 540, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 600, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_DOWN' },
    ],
  },

  HAPPY: {
    id: 'HAPPY', gloss: 'HAPPY',
    description: 'Flat hand brushes upward on the chest, over and over.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    repeat: { fromMs: 180, toMs: 420, times: 3 },
    dominant: [
      { atMs: 0, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
      { atMs: 180, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
      { atMs: 300, location: 'CHEST_OUT', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 420, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
      { atMs: 560, location: 'CHEST', handshape: 'FLAT', orientation: 'PALM_IN', contact: 'palm' },
    ],
  },

  SAD: {
    id: 'SAD', gloss: 'SAD',
    description: 'Two open hands draw down over the face.',
    durationMs: 660, strokeStartMs: 110, strokeEndMs: 600, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'FACE_HIGH', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 360, location: 'FACE_LOW', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 660, location: 'CHEST_OUT', handshape: 'OPEN_5', orientation: 'PALM_IN' },
    ],
    symmetry: 'mirror',
  },

  ANGRY: {
    id: 'ANGRY', gloss: 'ANGRY',
    description: 'A clawed hand pulls sharply out from the chest.',
    durationMs: 580, strokeStartMs: 100, strokeEndMs: 520, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CHEST', handshape: 'OPEN_5', orientation: 'PALM_IN', contact: 'palm' },
      { atMs: 280, location: 'CHEST_OUT', handshape: 'CLAW', orientation: 'PALM_IN' },
      { atMs: 580, location: 'NEUTRAL', handshape: 'CLAW', orientation: 'PALM_IN' },
    ],
  },

  TIRED: {
    id: 'TIRED', gloss: 'TIRED',
    description: 'Two bent hands on the chest roll downward.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CHEST_OUT', handshape: 'BENT_FLAT', orientation: 'PALM_IN' },
      { atMs: 320, location: 'CHEST_OUT', handshape: 'BENT_FLAT', orientation: 'ANGLED_DOWN' },
      { atMs: 620, location: 'NEUTRAL_LOW', handshape: 'BENT_FLAT', orientation: 'PALM_DOWN' },
    ],
    symmetry: 'mirror',
  },

  SICK: {
    id: 'SICK', gloss: 'SICK',
    description: 'The middle finger touches the forehead.',
    durationMs: 540, strokeStartMs: 100, strokeEndMs: 480, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'OPEN_8', orientation: 'PALM_IN' },
      { atMs: 300, location: 'FOREHEAD', handshape: 'OPEN_8', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 540, location: 'FOREHEAD', handshape: 'OPEN_8', orientation: 'PALM_IN', contact: 'middle' },
    ],
  },

  HUNGRY: {
    id: 'HUNGRY', gloss: 'HUNGRY',
    description: 'A C hand draws down the middle of the chest.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'FACE_LOW', handshape: 'C', orientation: 'PALM_IN' },
      { atMs: 340, location: 'CHEST_OUT', handshape: 'C', orientation: 'PALM_IN' },
      { atMs: 620, location: 'WAIST', handshape: 'C', orientation: 'PALM_IN' },
    ],
  },

  BEAUTIFUL: {
    id: 'BEAUTIFUL', gloss: 'BEAUTIFUL',
    description: 'An open hand circles the face and closes.',
    durationMs: 740, strokeStartMs: 120, strokeEndMs: 680, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CHIN', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 240, location: 'BROW', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 480, location: 'CHEEK', handshape: 'OPEN_5', orientation: 'PALM_IN' },
      { atMs: 740, location: 'CHIN', handshape: 'FLAT_O', orientation: 'PALM_IN' },
    ],
  },

  BIG: {
    id: 'BIG', gloss: 'BIG',
    description: 'Two bent L hands pull apart.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'BENT_L', orientation: 'PALM_OUT' },
      { atMs: 300, location: 'NEUTRAL', handshape: 'BENT_L', orientation: 'PALM_OUT' },
      { atMs: 560, location: 'SIDE_MID', handshape: 'BENT_L', orientation: 'PALM_OUT' },
    ],
    symmetry: 'mirror',
  },

  SMALL: {
    id: 'SMALL', gloss: 'SMALL',
    description: 'Two flat hands come in toward each other.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'SIDE_MID', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
      { atMs: 300, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
      { atMs: 560, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
    ],
    symmetry: 'mirror',
  },

  // --- time --------------------------------------------------------------

  NOW: {
    id: 'NOW', gloss: 'NOW',
    description: 'Two bent hands drop sharply, palms up.',
    durationMs: 480, strokeStartMs: 90, strokeEndMs: 420, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'BENT_FLAT', orientation: 'PALM_UP' },
      { atMs: 280, location: 'NEUTRAL_LOW', handshape: 'BENT_FLAT', orientation: 'PALM_UP' },
      { atMs: 480, location: 'NEUTRAL_LOW', handshape: 'BENT_FLAT', orientation: 'PALM_UP' },
    ],
    symmetry: 'mirror',
  },

  TODAY: {
    id: 'TODAY', gloss: 'TODAY',
    description: 'Two Y hands drop, palms up, in the present space.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    repeat: { fromMs: 200, toMs: 420, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_UP' },
      { atMs: 200, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_UP' },
      { atMs: 310, location: 'NEUTRAL_LOW', handshape: 'Y', orientation: 'PALM_UP' },
      { atMs: 420, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_UP' },
      { atMs: 560, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_UP' },
    ],
    symmetry: 'mirror',
  },

  TOMORROW: {
    id: 'TOMORROW', gloss: 'TOMORROW',
    description: 'Thumb at the cheek arcs forward, into the space ahead.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'THUMB_OUT', orientation: 'PALM_ACROSS' },
      { atMs: 260, location: 'CHEEK', handshape: 'THUMB_OUT', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 560, location: 'CENTRE_HIGH', handshape: 'THUMB_OUT', orientation: 'ANGLED_DOWN' },
      { atMs: 600, location: 'CENTRE_HIGH', handshape: 'THUMB_OUT', orientation: 'ANGLED_DOWN' },
    ],
  },

  YESTERDAY: {
    id: 'YESTERDAY', gloss: 'YESTERDAY',
    description: 'Thumb at the chin arcs back toward the ear.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'THUMB_OUT', orientation: 'PALM_ACROSS' },
      { atMs: 260, location: 'CHIN', handshape: 'THUMB_OUT', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 560, location: 'CHEEK', handshape: 'THUMB_OUT', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 600, location: 'CHEEK', handshape: 'THUMB_OUT', orientation: 'PALM_ACROSS', contact: 'thumb' },
    ],
  },

  DAY: {
    id: 'DAY', gloss: 'DAY',
    description: 'An upright index arm sweeps down across the other forearm.',
    durationMs: 700, strokeStartMs: 110, strokeEndMs: 640, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'ABOVE_HEAD', handshape: 'POINT', orientation: 'PALM_OUT' },
      { atMs: 360, location: 'CENTRE_HIGH', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 700, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'FINGERS_ACROSS' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'FINGERS_ACROSS_DOWN' },
  },

  NIGHT: {
    id: 'NIGHT', gloss: 'NIGHT',
    description: 'A bent hand drops over the back of the other flat hand.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'BENT_FLAT', orientation: 'PALM_OUT' },
      { atMs: 320, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'ANGLED_DOWN' },
      { atMs: 600, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'PALM_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_DOWN' },
  },

  MORNING: {
    id: 'MORNING', gloss: 'MORNING',
    description: 'A flat hand rises from under the other forearm.',
    durationMs: 640, strokeStartMs: 110, strokeEndMs: 580, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'WAIST', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 340, location: 'NEUTRAL_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 640, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_DOWN' },
  },

  WEEK: {
    id: 'WEEK', gloss: 'WEEK',
    description: 'An index hand slides forward across the other palm.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 320, location: 'NEUTRAL', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
      { atMs: 620, location: 'OUT_FAR', handshape: 'POINT', orientation: 'FINGERS_FORWARD' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  YEAR: {
    id: 'YEAR', gloss: 'YEAR',
    description: 'One fist circles all the way round the other and lands on it.',
    durationMs: 760, strokeStartMs: 120, strokeEndMs: 700, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'S', orientation: 'PALM_DOWN' },
      { atMs: 240, location: 'CENTRE_HIGH', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 480, location: 'OUT_FAR', handshape: 'S', orientation: 'PALM_UP' },
      { atMs: 760, location: 'CENTRE_MID', handshape: 'S', orientation: 'PALM_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'S', orientation: 'PALM_DOWN' },
  },

  TIME: {
    id: 'TIME', gloss: 'TIME',
    description: 'An index finger taps the back of the other wrist.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    repeat: { fromMs: 240, toMs: 420, times: 2 },
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'POINT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 240, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 330, location: 'CENTRE_HIGH', handshape: 'POINT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 420, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 560, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'FINGERS_ACROSS_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'S', orientation: 'PALM_DOWN' },
  },

  // --- places and things --------------------------------------------------

  HOME: {
    id: 'HOME', gloss: 'HOME',
    description: 'A flattened O touches the mouth, then the cheek.',
    durationMs: 640, strokeStartMs: 110, strokeEndMs: 580, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'FLAT_O', orientation: 'PALM_IN' },
      { atMs: 260, location: 'MOUTH', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 560, location: 'CHEEK', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
      { atMs: 640, location: 'CHEEK', handshape: 'FLAT_O', orientation: 'PALM_IN', contact: 'middle' },
    ],
  },

  SCHOOL: {
    id: 'SCHOOL', gloss: 'SCHOOL',
    description: 'One flat hand claps down onto the other palm.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    repeat: { fromMs: 240, toMs: 440, times: 2 },
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 240, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 340, location: 'CENTRE_HIGH', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 440, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_DOWN' },
      { atMs: 600, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  HOUSE: {
    id: 'HOUSE', gloss: 'HOUSE',
    description: 'Two flat hands trace a roof, then come down as walls.',
    durationMs: 740, strokeStartMs: 120, strokeEndMs: 680, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'FACE_HIGH', handshape: 'FLAT', orientation: 'ANGLED_DOWN' },
      { atMs: 300, location: 'FACE_LOW', handshape: 'FLAT', orientation: 'ANGLED_OUT' },
      { atMs: 520, location: 'SIDE_MID', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
      { atMs: 740, location: 'SIDE_LOW', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
    ],
    symmetry: 'mirror',
  },

  CITY: {
    id: 'CITY', gloss: 'CITY',
    description: 'Two bent hands meet as rooftops, again and again.',
    durationMs: 700, strokeStartMs: 100, strokeEndMs: 700, provenance: PLACEHOLDER,
    repeat: { fromMs: 200, toMs: 540, times: 3 },
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'ANGLED_DOWN' },
      { atMs: 200, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'ANGLED_DOWN' },
      { atMs: 370, location: 'FACE_LOW', handshape: 'BENT_FLAT', orientation: 'ANGLED_DOWN' },
      { atMs: 540, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'ANGLED_DOWN' },
      { atMs: 700, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'ANGLED_DOWN' },
    ],
    symmetry: 'mirror',
  },

  CAR: {
    id: 'CAR', gloss: 'CAR',
    description: 'Two fists hold a wheel and pull it round, one then the other.',
    durationMs: 660, strokeStartMs: 110, strokeEndMs: 660, provenance: PLACEHOLDER,
    repeat: { fromMs: 200, toMs: 480, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 200, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 340, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 480, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_IN' },
      { atMs: 660, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_IN' },
    ],
    symmetry: 'alternate',
  },

  BOOK: {
    id: 'BOOK', gloss: 'BOOK',
    description: 'Two flat palms together open like a book.',
    durationMs: 600, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
      { atMs: 320, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'ANGLED_IN' },
      { atMs: 600, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
    symmetry: 'mirror',
  },

  WATER: {
    id: 'WATER', gloss: 'WATER',
    description: 'A W hand taps the chin.',
    durationMs: 660, strokeStartMs: 100, strokeEndMs: 600, provenance: PLACEHOLDER,
    repeat: { fromMs: 240, toMs: 520, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'W', orientation: 'PALM_ACROSS' },
      { atMs: 240, location: 'CHIN', handshape: 'W', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 380, location: 'FACE_LOW', handshape: 'W', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 520, location: 'CHIN', handshape: 'W', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 660, location: 'CHIN', handshape: 'W', orientation: 'PALM_ACROSS', contact: 'index' },
    ],
  },

  MONEY: {
    id: 'MONEY', gloss: 'MONEY',
    description: 'The back of a flattened O taps the other open palm.',
    durationMs: 580, strokeStartMs: 100, strokeEndMs: 520, provenance: PLACEHOLDER,
    repeat: { fromMs: 220, toMs: 420, times: 2 },
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'FLAT_O', orientation: 'PALM_UP' },
      { atMs: 220, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'PALM_UP' },
      { atMs: 320, location: 'CENTRE_HIGH', handshape: 'FLAT_O', orientation: 'PALM_UP' },
      { atMs: 420, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'PALM_UP' },
      { atMs: 580, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'PALM_UP' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  PHONE: {
    id: 'PHONE', gloss: 'PHONE',
    description: 'A Y hand held to the ear and chin.',
    durationMs: 520, strokeStartMs: 100, strokeEndMs: 460, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'Y', orientation: 'PALM_ACROSS' },
      { atMs: 300, location: 'CHEEK', handshape: 'Y', orientation: 'PALM_ACROSS', contact: 'thumb' },
      { atMs: 520, location: 'CHEEK', handshape: 'Y', orientation: 'PALM_ACROSS', contact: 'thumb' },
    ],
  },

  NEW: {
    id: 'NEW', gloss: 'NEW',
    description: 'The back of one hand sweeps up off the other palm.',
    durationMs: 580, strokeStartMs: 100, strokeEndMs: 520, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'SIDE_LOW', handshape: 'BENT_FLAT', orientation: 'PALM_UP' },
      { atMs: 300, location: 'CENTRE_LOW', handshape: 'BENT_FLAT', orientation: 'PALM_UP' },
      { atMs: 580, location: 'CENTRE_HIGH', handshape: 'BENT_FLAT', orientation: 'PALM_UP' },
    ],
    base: { location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  // --- modals and connectives ---------------------------------------------

  CAN: {
    id: 'CAN', gloss: 'CAN',
    description: 'Two fists press firmly downward.',
    durationMs: 520, strokeStartMs: 90, strokeEndMs: 460, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'NEUTRAL_HIGH', handshape: 'S', orientation: 'PALM_OUT' },
      { atMs: 300, location: 'NEUTRAL', handshape: 'S', orientation: 'PALM_OUT' },
      { atMs: 520, location: 'NEUTRAL_LOW', handshape: 'S', orientation: 'PALM_OUT' },
    ],
    symmetry: 'mirror',
  },

  WILL: {
    id: 'WILL', gloss: 'WILL',
    description: 'A flat hand beside the cheek moves forward into the space ahead.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'FACE_HIGH', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
      { atMs: 300, location: 'FACE_LOW', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
      { atMs: 560, location: 'OUT_FAR', handshape: 'FLAT', orientation: 'PALM_ACROSS' },
    ],
  },

  AGAIN: {
    id: 'AGAIN', gloss: 'AGAIN',
    description: 'A bent hand turns over and lands in the other palm.',
    durationMs: 620, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'SIDE_MID', handshape: 'BENT_FLAT', orientation: 'PALM_UP' },
      { atMs: 320, location: 'CENTRE_HIGH', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS' },
      { atMs: 620, location: 'CENTRE_MID', handshape: 'BENT_FLAT', orientation: 'FINGERS_ACROSS_DOWN' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  MORE: {
    id: 'MORE', gloss: 'MORE',
    description: 'Two flattened O hands tap their fingertips together.',
    durationMs: 540, strokeStartMs: 100, strokeEndMs: 540, provenance: PLACEHOLDER,
    repeat: { fromMs: 180, toMs: 400, times: 3 },
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'FINGERS_ACROSS' },
      { atMs: 180, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'FINGERS_ACROSS' },
      { atMs: 290, location: 'NEUTRAL', handshape: 'FLAT_O', orientation: 'FINGERS_ACROSS' },
      { atMs: 400, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'FINGERS_ACROSS' },
      { atMs: 540, location: 'CENTRE_MID', handshape: 'FLAT_O', orientation: 'FINGERS_ACROSS' },
    ],
    symmetry: 'mirror',
  },

  STOP: {
    id: 'STOP', gloss: 'STOP',
    description: 'The edge of a flat hand chops down onto the other palm.',
    durationMs: 520, strokeStartMs: 90, strokeEndMs: 460, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_HIGH', handshape: 'FLAT', orientation: 'FINGERS_FORWARD' },
      { atMs: 300, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'FINGERS_FORWARD' },
      { atMs: 520, location: 'CENTRE_MID', handshape: 'FLAT', orientation: 'FINGERS_FORWARD' },
    ],
    base: { location: 'CENTRE_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
  },

  WAIT: {
    id: 'WAIT', gloss: 'WAIT',
    description: 'Two hands held palms up, fingers fluttering.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 560, provenance: PLACEHOLDER,
    repeat: { fromMs: 180, toMs: 420, times: 3 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'CLAW', orientation: 'PALM_UP' },
      { atMs: 180, location: 'NEUTRAL', handshape: 'CLAW', orientation: 'PALM_UP' },
      { atMs: 300, location: 'NEUTRAL', handshape: 'OPEN_5', orientation: 'PALM_UP' },
      { atMs: 420, location: 'NEUTRAL', handshape: 'CLAW', orientation: 'PALM_UP' },
      { atMs: 560, location: 'NEUTRAL', handshape: 'CLAW', orientation: 'PALM_UP' },
    ],
    symmetry: 'mirror',
  },

  MAYBE: {
    id: 'MAYBE', gloss: 'MAYBE',
    description: 'Two palms up, rising and falling against each other.',
    durationMs: 640, strokeStartMs: 110, strokeEndMs: 640, provenance: PLACEHOLDER,
    repeat: { fromMs: 200, toMs: 460, times: 2 },
    dominant: [
      { atMs: 0, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 200, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 330, location: 'NEUTRAL_LOW', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 460, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
      { atMs: 640, location: 'NEUTRAL', handshape: 'FLAT', orientation: 'PALM_UP' },
    ],
    symmetry: 'alternate',
  },

  SAME: {
    id: 'SAME', gloss: 'SAME',
    description: 'A Y hand moves between two points, linking them.',
    durationMs: 640, strokeStartMs: 100, strokeEndMs: 640, provenance: PLACEHOLDER,
    repeat: { fromMs: 180, toMs: 500, times: 2 },
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'Y', orientation: 'PALM_DOWN' },
      { atMs: 180, location: 'CENTRE_MID', handshape: 'Y', orientation: 'PALM_DOWN' },
      { atMs: 340, location: 'NEUTRAL', handshape: 'Y', orientation: 'PALM_DOWN' },
      { atMs: 500, location: 'CENTRE_MID', handshape: 'Y', orientation: 'PALM_DOWN' },
      { atMs: 640, location: 'CENTRE_MID', handshape: 'Y', orientation: 'PALM_DOWN' },
    ],
  },

  DIFFERENT: {
    id: 'DIFFERENT', gloss: 'DIFFERENT',
    description: 'Two crossed index fingers pull sharply apart.',
    durationMs: 540, strokeStartMs: 90, strokeEndMs: 480, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'CENTRE_MID', handshape: 'POINT', orientation: 'FINGERS_ACROSS_DOWN' },
      { atMs: 260, location: 'NEUTRAL', handshape: 'POINT', orientation: 'ANGLED_OUT' },
      { atMs: 540, location: 'SIDE_MID', handshape: 'POINT', orientation: 'PALM_OUT' },
    ],
    symmetry: 'mirror',
  },

  TRUE: {
    id: 'TRUE', gloss: 'TRUE',
    description: 'An index finger at the lips moves straight forward.',
    durationMs: 560, strokeStartMs: 100, strokeEndMs: 500, provenance: PLACEHOLDER,
    dominant: [
      { atMs: 0, location: 'MOUTH', handshape: 'POINT', orientation: 'PALM_ACROSS', contact: 'index' },
      { atMs: 300, location: 'FACE_LOW', handshape: 'POINT', orientation: 'PALM_ACROSS' },
      { atMs: 560, location: 'OUT_FAR', handshape: 'POINT', orientation: 'PALM_ACROSS' },
    ],
  },
});

export function signDefinition(id: string): SignDefinition | undefined {
  return SIGNS[id];
}

export const SIGN_IDS: readonly string[] = Object.keys(SIGNS);
