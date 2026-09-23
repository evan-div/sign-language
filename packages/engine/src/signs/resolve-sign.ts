/**
 * Finding a sign by id, authored or generated.
 *
 * Numbers and incorporated numbers are not in the library -- there are too many
 * of them and they follow rules -- but everything downstream wants to ask for a
 * sign by id and get one. This is the single place that knows a sign can be
 * built rather than looked up.
 */

import type { SignDefinition } from './definition.js';
import { SIGNS } from './library.js';
import { numberSignCached } from '../numbers/compose.js';
import { incorporate, parseIncorporatedId } from '../numbers/incorporate.js';

/** The id a composed number is known by. */
export function numberSignId(value: number): string {
  return `NUMBER_${value}`;
}

const generated = new Map<string, SignDefinition | undefined>();

export function resolveSign(id: string): SignDefinition | undefined {
  const authored = SIGNS[id];
  if (authored) return authored;
  if (generated.has(id)) return generated.get(id);

  let built: SignDefinition | undefined;

  const number = /^NUMBER_(\d+)$/.exec(id);
  if (number) built = numberSignCached(Number(number[1]));

  const incorporated = parseIncorporatedId(id);
  if (!built && incorporated) {
    const base = SIGNS[incorporated.signId];
    if (base) built = incorporate(base, incorporated.value);
  }

  generated.set(id, built);
  return built;
}
