/**
 * Turning an English concept into a sign, or deciding there isn't one.
 *
 * The fallback chain is the product requirement in code form: prefer an exact
 * sign, ask when the meaning genuinely forks, substitute only when we can say
 * so out loud, and fingerspell rather than guess.
 */

import { LEXICON, SYNONYMS, type LexiconEntry } from './entries.js';

export type Resolution = 'direct' | 'synonym' | 'ambiguous' | 'fingerspelled';

export interface ResolvedConcept {
  readonly resolution: Resolution;
  /** Absent only when the word will be fingerspelled. */
  readonly signId?: string;
  /** Every candidate, when the lemma has more than one sense. */
  readonly senses?: readonly LexiconEntry[];
  /** The English the sign actually means, when it differs from what was typed. */
  readonly substitutedFrom?: string;
}

/** Lemmas indexed for lookup, longest phrase first. */
const BY_LEMMA = new Map<string, LexiconEntry[]>();
for (const entry of LEXICON) {
  const existing = BY_LEMMA.get(entry.lemma);
  if (existing) existing.push(entry);
  else BY_LEMMA.set(entry.lemma, [entry]);
}

/** The longest phrase in the lexicon, in words. Bounds the phrase matcher. */
export const MAX_PHRASE_WORDS = Math.max(...LEXICON.map((e) => e.lemma.split(' ').length));

export function lookupLemma(lemma: string): readonly LexiconEntry[] {
  return BY_LEMMA.get(lemma) ?? [];
}

export function hasLemma(lemma: string): boolean {
  return BY_LEMMA.has(lemma);
}

/**
 * @param lemma    the lemmatised form, tried first
 * @param surface  the word as typed, lowercased. Lemmatising can move a word
 *                 out of the synonym table -- "greetings" stems to "greeting" --
 *                 so both forms are tried before giving up and spelling it.
 */
export function resolveConcept(lemma: string, chosenSignId?: string, surface?: string): ResolvedConcept {
  const direct = lookupLemma(lemma);

  if (direct.length === 1) {
    return { resolution: 'direct', signId: direct[0]!.signId };
  }

  if (direct.length > 1) {
    // The user may already have picked a sense for this word.
    const chosen = chosenSignId && direct.find((e) => e.signId === chosenSignId);
    if (chosen) return { resolution: 'direct', signId: chosen.signId, senses: direct };
    // Otherwise we play something so the sentence still runs, but say plainly
    // that it was not our call to make.
    return { resolution: 'ambiguous', signId: direct[0]!.signId, senses: direct };
  }

  for (const form of surface && surface !== lemma ? [lemma, surface] : [lemma]) {
    const synonym = SYNONYMS[form];
    if (!synonym) continue;
    const viaSynonym = lookupLemma(synonym);
    if (viaSynonym.length > 0) {
      return { resolution: 'synonym', signId: viaSynonym[0]!.signId, substitutedFrom: synonym };
    }
  }

  // A surface form may also be a lexicon entry the stemmer stepped past.
  if (surface && surface !== lemma) {
    const direct2 = lookupLemma(surface);
    if (direct2.length === 1) return { resolution: 'direct', signId: direct2[0]!.signId };
  }

  return { resolution: 'fingerspelled' };
}
