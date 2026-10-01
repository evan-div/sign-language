/**
 * The vocabulary beyond the first hundred, by domain.
 *
 * One file per area keeps each short enough to read in a sitting, which is the
 * point of the template layer; a vocabulary nobody can read through is one
 * nobody can review.
 */

import type { SignDefinition } from '../definition.js';
import { PEOPLE } from './people.js';
import { BODY } from './body.js';
import { QUALITIES } from './qualities.js';
import { VERBS } from './verbs.js';
import { TIME_FOOD } from './time-food.js';
import { WORLD } from './world.js';
import { EXTRAS } from './extras.js';

export const VOCABULARY: readonly SignDefinition[] = [
  ...PEOPLE,
  ...BODY,
  ...QUALITIES,
  ...VERBS,
  ...TIME_FOOD,
  ...WORLD,
  ...EXTRAS,
];
