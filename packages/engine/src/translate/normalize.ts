/**
 * Tokenising and lemmatising English, keeping track of where each word came
 * from in the original string.
 *
 * The character offsets are the reason this exists rather than a `split(' ')`.
 * Every downstream feature the user sees -- highlighting the current word,
 * clicking a word to replay its sign, saying which words were dropped -- needs
 * to point back at the text they typed, after reordering has moved things.
 */

import { FUNCTION_WORDS, IRREGULAR_LEMMAS, SPATIALLY_EXPRESSED, SYNONYMS, WH_WORDS } from '../lexicon/entries.js';
import { hasLemma } from '../lexicon/resolve.js';

export interface Token {
  /** As typed, minus surrounding punctuation. */
  readonly text: string;
  readonly lemma: string;
  /** Character offsets into the original input. */
  readonly span: readonly [number, number];
}

const WORD = /[\p{L}\p{N}'’-]+/gu;

/**
 * Whether a candidate lemma is one the system knows anything about.
 *
 * The lemmatiser used to strip suffixes blindly, which produced "mak" from
 * "making" and "hav" from "having": harmless for a word with no sign, and a
 * silent miss for the commonest verbs in the language. Candidates are generated
 * and CHECKED instead -- "making" yields mak, make, and mak again, and only
 * "make" is in the lexicon -- so a stem is accepted only when it lands on
 * something real. A word that matches nothing is left exactly as typed, which
 * is also what gets fingerspelled, so an unknown word is never mangled on its
 * way to being spelled.
 */
function isKnown(candidate: string): boolean {
  return hasLemma(candidate)
    || candidate in SYNONYMS
    || FUNCTION_WORDS.has(candidate)
    || WH_WORDS.has(candidate)
    || SPATIALLY_EXPRESSED.has(candidate);
}

/** "stopp" -> "stop", "runn" -> "run": a doubled final consonant undone. */
function undouble(stem: string): string {
  const n = stem.length;
  return n > 2 && stem[n - 1] === stem[n - 2] && !/[aeiou]/.test(stem[n - 1]!) ? stem.slice(0, -1) : stem;
}

/** Every plausible stem of an inflected form, most likely first. */
function candidates(word: string): string[] {
  const out: string[] = [];
  const add = (c: string) => { if (c.length > 1 && c !== word && !out.includes(c)) out.push(c); };

  if (word.endsWith('ies')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('ing')) {
    const stem = word.slice(0, -3);
    add(stem); add(stem + 'e'); add(undouble(stem));
  }
  if (word.endsWith('ied')) add(word.slice(0, -3) + 'y');
  if (word.endsWith('ed')) {
    const stem = word.slice(0, -2);
    add(stem); add(stem + 'e'); add(undouble(stem));
  }
  if (word.endsWith('es')) { add(word.slice(0, -2)); add(word.slice(0, -1)); }
  if (word.endsWith('s') && !word.endsWith('ss')) add(word.slice(0, -1));
  if (word.endsWith('ly')) add(word.slice(0, -2));
  return out;
}

/**
 * The lemma of a word, or the word itself when nothing it could be is known.
 *
 * Irregular forms come first, from an explicit table: no suffix rule gets
 * "went", "children" or "better" right, and trying would only add false
 * matches.
 */
export function lemmatise(word: string): string {
  const lower = word.toLowerCase().replace(/[’]/g, "'");
  const irregular = IRREGULAR_LEMMAS[lower];
  if (irregular) return irregular;

  // A word that is itself known is its own lemma. Checked before stripping, or
  // "its" would lose its s, and "sign" would be asked whether it is "sig".
  if (isKnown(lower)) return lower;

  // Possessives.
  if (lower.endsWith("'s")) {
    const stem = lower.slice(0, -2);
    return IRREGULAR_LEMMAS[stem] ?? stem;
  }

  for (const candidate of candidates(lower)) {
    if (isKnown(candidate)) return candidate;
  }
  return lower;
}

/**
 * Stems that "n't" attaches to which are not themselves words.
 *
 * "can't" is "ca" + "n't", "won't" is "wo" + "n't", "ain't" is "ai" + "n't".
 */
const CONTRACTION_STEMS: Readonly<Record<string, string>> = Object.freeze({
  ca: 'can', wo: 'will', sha: 'shall', ai: 'be',
});

export function tokenise(input: string): Token[] {
  const tokens: Token[] = [];
  for (const match of input.matchAll(WORD)) {
    const text = match[0];
    const start = match.index;
    const lower = text.toLowerCase().replace(/[’]/g, "'");

    // "n't" is a negation, and it must stay one. It used to be stripped as
    // though it were a suffix, leaving "do", which is then dropped as a
    // function word -- so "I don't know" became ME KNOW, the opposite of what
    // was typed, with no negation marker and no notice. It is split into the
    // verb and a "not" of its own, each with its own span into the original.
    if (lower.endsWith("n't") && lower.length > 3) {
      const stem = text.slice(0, -3);
      const stemLower = lower.slice(0, -3);
      const cut = start + stem.length;
      tokens.push({
        text: stem,
        lemma: CONTRACTION_STEMS[stemLower] ?? lemmatise(stemLower),
        span: [start, cut],
      });
      tokens.push({ text: text.slice(-3), lemma: 'not', span: [cut, start + text.length] });
      continue;
    }

    // "cannot" is one word and two meanings.
    if (lower === 'cannot') {
      tokens.push({ text: text.slice(0, 3), lemma: 'can', span: [start, start + 3] });
      tokens.push({ text: text.slice(3), lemma: 'not', span: [start + 3, start + text.length] });
      continue;
    }

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
