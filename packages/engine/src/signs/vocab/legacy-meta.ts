/**
 * Category and fidelity for the first hundred signs.
 *
 * They were authored before either field existed, in the verbose notation, and
 * are left exactly as written; this overlays the two fields rather than editing
 * a hundred entries. The ratings follow the same rule as every later sign:
 * `approximate` where the real sign involves something the notation cannot say
 * -- contact between the hands, movement inside the hand -- and `citation`
 * where the author understands the form and the notation can express it.
 *
 * None is `uncertain`. That is not a claim that all hundred are right; it is a
 * statement about the author's own state of knowledge, made by someone who is
 * not a fluent signer.
 */

import type { SignCategory } from '../definition.js';

type Fidelity = 'citation' | 'approximate' | 'uncertain';

const C = 'citation' as const;
const A = 'approximate' as const;

export const LEGACY_META: Readonly<Record<string, readonly [SignCategory, Fidelity]>> = Object.freeze({
  HELLO: ['greeting', C], MY: ['pronoun', C], NAME: ['communication', A], 'THANK-YOU': ['greeting', C],
  YOU: ['pronoun', C], ME: ['pronoun', C], YOUR: ['pronoun', C], WHAT: ['question', C],
  YES: ['grammar', C], NO: ['grammar', C], PLEASE: ['greeting', C], SORRY: ['greeting', C],
  GOOD: ['quality', A], LOVE: ['feeling', C], LEARN: ['school', A], DEAF: ['person', C],
  HELP: ['verb', A], SIGN: ['communication', C], RIGHT_CORRECT: ['quality', A], RIGHT_DIRECTION: ['motion', C],
  WE: ['pronoun', C], THEY: ['pronoun', C], HE_SHE: ['pronoun', C], ALL: ['quantity', A],
  WHO: ['question', C], WHERE: ['question', C], WHEN: ['question', A], WHY: ['question', C], HOW: ['question', A],
  PERSON: ['person', C], FRIEND: ['person', A], FAMILY: ['family', C], MOTHER: ['family', C],
  FATHER: ['family', C], CHILD: ['person', C], MAN: ['person', C], WOMAN: ['person', C],
  GOODBYE: ['greeting', A], WELCOME: ['greeting', C], EXCUSE_ME: ['greeting', A],
  GO: ['motion', C], COME: ['motion', C], WANT: ['verb', C], NEED: ['verb', C], LIKE: ['feeling', C],
  KNOW: ['verb', C], THINK: ['verb', C], UNDERSTAND: ['verb', A], SEE: ['verb', C], SAY: ['communication', C],
  ASK: ['communication', C], GIVE: ['verb', C], MAKE: ['verb', A], WORK: ['work', A], PLAY: ['verb', C],
  EAT: ['food', C], DRINK: ['food', C], SLEEP: ['verb', C], LIVE: ['verb', C], FINISH: ['verb', C],
  BAD: ['quality', C], HAPPY: ['feeling', C], SAD: ['feeling', C], ANGRY: ['feeling', C], TIRED: ['feeling', C],
  SICK: ['health', A], HUNGRY: ['feeling', C], BEAUTIFUL: ['quality', C], BIG: ['quality', C], SMALL: ['quality', C],
  NOW: ['time', C], TODAY: ['time', C], TOMORROW: ['time', C], YESTERDAY: ['time', C], DAY: ['time', A],
  NIGHT: ['time', A], MORNING: ['time', A], WEEK: ['time', A], YEAR: ['time', A], TIME: ['time', A],
  HOME: ['place', C], SCHOOL: ['school', A], HOUSE: ['place', C], CITY: ['place', A], CAR: ['transport', C],
  BOOK: ['school', C], WATER: ['food', C], MONEY: ['society', A], PHONE: ['technology', C], NEW: ['quality', A],
  CAN: ['verb', C], WILL: ['grammar', C], AGAIN: ['grammar', A], MORE: ['quantity', C], STOP: ['verb', A],
  WAIT: ['verb', A], MAYBE: ['grammar', C], SAME: ['quality', C], DIFFERENT: ['quality', C], TRUE: ['quality', C],
});
