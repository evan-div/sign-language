/**
 * Tokenising and lemmatising English, keeping track of where each word came
 * from in the original string.
 *
 * The character offsets are the reason this exists rather than a `split(' ')`.
 * Every downstream feature the user sees -- highlighting the current word,
 * clicking a word to replay its sign, saying which words were dropped -- needs
 * to point back at the text they typed, after reordering has moved things.
 */

import { IRREGULAR_LEMMAS } from '../lexicon/entries.js';

export interface Token {
  /** As typed, minus surrounding punctuation. */
  readonly text: string;
  readonly lemma: string;
  /** Character offsets into the original input. */
  readonly span: readonly [number, number];
}

const WORD = /[\p{L}\p{N}'’-]+/gu;

/**
 * Suffix stripping, deliberately shallow.
 *
 * A real stemmer would over-reach on a lexicon this small: turning "sign" into
 * "sig" or "please" into "pleas" loses a sign we have for one we do not.
 * Anything irregular is listed explicitly instead.
 */
function lemmatise(word: string): string {
  const lower = word.toLowerCase().replace(/[’]/g, "'");
  const irregular = IRREGULAR_LEMMAS[lower];
  if (irregular) return irregular;

  // Possessives and contractions.
  if (lower.endsWith("'s")) return lower.slice(0, -2);
  if (lower.endsWith("n't")) return lower.slice(0, -3);

  if (lower.length > 4 && lower.endsWith('ing')) return lower.slice(0, -3);
  if (lower.length > 4 && lower.endsWith('ed')) return lower.slice(0, -2);
  // Plural -s, but not -ss ("class") or -us, and not short words ("is", "as").
  if (lower.length > 3 && lower.endsWith('s') && !/(ss|us|is)$/.test(lower)) return lower.slice(0, -1);

  return lower;
}

export function tokenise(input: string): Token[] {
  const tokens: Token[] = [];
  for (const match of input.matchAll(WORD)) {
    const text = match[0];
    const start = match.index;
    tokens.push({ text, lemma: lemmatise(text), span: [start, start + text.length] });
  }
  return tokens;
}

/** True when the input is punctuated as a question. */
export function isQuestion(input: string): boolean {
  return /\?\s*$/.test(input.trim());
}

/** Sentence-final punctuation controls how long we pause afterwards. */
export function trailingPauseMs(input: string): number {
  const trimmed = input.trim();
  if (/[?!]$/.test(trimmed)) return 380;
  if (/\.$/.test(trimmed)) return 320;
  if (/,$/.test(trimmed)) return 150;
  return 0;
}
