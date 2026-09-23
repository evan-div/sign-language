/**
 * Number incorporation.
 *
 * ASL does not sign "three weeks" as THREE then WEEK. It signs WEEK with a
 * three handshape -- one sign, carrying both meanings. That is a real piece of
 * the grammar, and it is also the clearest test this architecture gets of its
 * own central claim: if a sign really is handshape, location, orientation and
 * movement, then incorporating a number should be substituting one parameter
 * and nothing else.
 *
 * It is. The whole of incorporation is below, and it is a map over keyframes.
 *
 * Only the dominant hand takes the number. A base hand is a place, not a
 * handshape the number can occupy, and giving it the digit too would turn
 * "three weeks" into a sign made with two threes.
 */

import type { SignDefinition } from '../signs/definition.js';
import { digitHandshape } from './digits.js';

/**
 * The signs that incorporate, and the range they do it over.
 *
 * Short and conservative on purpose. English lets you say "three anything";
 * ASL incorporates numbers into a specific, smallish set of time and pronoun
 * signs, and past nine even those stop and go back to two signs. Adding a sign
 * to this set is a claim about ASL, so it should be made one sign at a time
 * with a reason.
 */
export const INCORPORATING_SIGNS: ReadonlySet<string> = new Set(['WEEK', 'DAY']);
export const MAX_INCORPORATED = 9;

export function canIncorporate(signId: string, value: number): boolean {
  return INCORPORATING_SIGNS.has(signId)
    && Number.isInteger(value) && value >= 1 && value <= MAX_INCORPORATED;
}

/** The id an incorporated sign is known by. */
export function incorporatedId(signId: string, value: number): string {
  return `${signId}+${value}`;
}

export function parseIncorporatedId(id: string): { signId: string; value: number } | undefined {
  const match = /^([A-Z_-]+)\+(\d)$/.exec(id);
  if (!match) return undefined;
  return { signId: match[1]!, value: Number(match[2]) };
}

export function incorporate(base: SignDefinition, value: number): SignDefinition | undefined {
  if (!canIncorporate(base.id, value)) return undefined;
  const handshape = digitHandshape(value);

  return {
    ...base,
    id: incorporatedId(base.id, value),
    gloss: `${value}-${base.gloss}`,
    description: `${base.description} Made with a ${value} handshape: "${value} ${base.gloss.toLowerCase()}s".`,
    dominant: base.dominant.map((k) => ({ ...k, handshape })),
    provenance: {
      ...base.provenance,
      source: 'generated',
      note: `Number incorporation over ${base.id}, which substitutes the handshape and `
        + 'nothing else. The base sign is hand-authored and unvalidated.',
    },
  };
}
