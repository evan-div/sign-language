/**
 * How much of ordinary English the lexicon actually covers.
 *
 * Measured against a frequency list nobody here chose (see
 * data/english/README.md): if the vocabulary were scored against a word list
 * picked alongside it, the score would only say that the two agree.
 *
 * Every word is put through the same resolver the product uses, so the answer
 * is what a user would get, not what the lexicon table looks like.
 *
 * Run: pnpm coverage
 */

import { readFileSync } from 'node:fs';
import { NOISE } from './lib/english-noise.js';
import {
  FUNCTION_WORDS, SPATIALLY_EXPRESSED, resolveConcept, tokenise, parseNumber,
  numberSignId, resolveSign, SIGN_IDS, LEXICON,
} from '../packages/engine/src/index.js';

type Outcome = 'sign' | 'number' | 'synonym' | 'ambiguous' | 'dropped' | 'spatial' | 'fingerspelled';

// Words only: the subtitle list carries a count after each word, and its
// tokeniser leaves contraction fragments ("'s", "'ll") as words of their own.
const readWords = (file: string) => readFileSync(file, 'utf8').split('\n')
  .map((line) => line.trim().split(/\s+/)[0]!.replace(/^'+/, '')).filter((w) => w.length > 1);

const LISTS: Array<[string, string[]]> = [
  ['web text', readWords('data/english/frequency-top2000.txt')],
  ['speech (subtitles)', readWords('data/english/subtitles-top3000.txt')],
];

function classify(word: string): Outcome {
  // Contraction fragments are answered by the tokeniser, not gaps in the lexicon.
  if (NOISE.has(word)) return 'dropped';
  const token = tokenise(word)[0];
  if (!token) return 'dropped';

  // Numbers are composed rather than looked up, so they are invisible to the
  // lexicon and would otherwise be counted as gaps.
  const number = parseNumber([word], 0);
  if (number && resolveSign(numberSignId(number.value))) return 'number';

  const resolved = resolveConcept(token.lemma, undefined, word);
  if (resolved.resolution === 'fingerspelled') {
    // A word ASL does not sign is not a gap in the lexicon. The interface says
    // it was dropped; it is not spelled out letter by letter.
    if (FUNCTION_WORDS.has(token.lemma)) return 'dropped';
    if (SPATIALLY_EXPRESSED.has(token.lemma)) return 'spatial';
    return 'fingerspelled';
  }
  if (resolved.resolution === 'direct') return 'sign';
  if (resolved.resolution === 'synonym') return 'synonym';
  return 'ambiguous';
}

/**
 * Zipf weighting, as a stand-in for token frequency.
 *
 * Both lists are ranks, and word frequency follows roughly 1/rank, so
 * weighting by 1/rank approximates how often a word is actually met -- which is
 * the number that matters. Covering "you" is worth more than covering ten words
 * from the bottom of the list.
 */
const weight = (rank: number) => 1 / (rank + 1);

function report(label: string, words: string[], limit: number): void {
  const slice = words.slice(0, limit).map(classify);
  const counts = new Map<Outcome, number>();
  const weighted = new Map<Outcome, number>();
  let total = 0;
  slice.forEach((outcome, i) => {
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
    weighted.set(outcome, (weighted.get(outcome) ?? 0) + weight(i));
    total += weight(i);
  });
  const answered: Outcome[] = ['sign', 'number', 'synonym', 'ambiguous', 'dropped', 'spatial'];
  const pct = (n: number, of: number) => `${Math.round((n / of) * 100)}%`.padStart(4);
  const sum = (m: Map<Outcome, number>) => answered.reduce((a, o) => a + (m.get(o) ?? 0), 0);
  const signed = (counts.get('sign') ?? 0) + (counts.get('number') ?? 0) + (counts.get('synonym') ?? 0);
  const signedW = (weighted.get('sign') ?? 0) + (weighted.get('number') ?? 0) + (weighted.get('synonym') ?? 0);
  console.log(
    `${label.padEnd(20)} top ${String(limit).padStart(4)}   `
    + `has a sign ${pct(signed, slice.length)} (${pct(signedW, total)} by freq)   `
    + `answered ${pct(sum(counts), slice.length)} (${pct(sum(weighted), total)} by freq)   `
    + `spelled ${pct(counts.get('fingerspelled') ?? 0, slice.length)} (${pct(weighted.get('fingerspelled') ?? 0, total)} by freq)`,
  );
}

console.log(`${SIGN_IDS.length} signs, ${LEXICON.length} lexicon entries\n`);
console.log('"has a sign" counts only words that reach a sign (directly, as a number, or by a stated');
console.log('synonym). "answered" adds words deliberately dropped, which is an answer but not a sign.\n');
for (const [label, words] of LISTS) {
  for (const limit of [100, 500, 1000, 2000]) if (limit <= words.length) report(label, words, limit);
  console.log();
}

const [, speech] = LISTS[1]!;
const spelled = speech.filter((w) => classify(w) === 'fingerspelled' && !NOISE.has(w));
console.log(`the 40 commonest speech words still fingerspelled (of ${spelled.length} in the top ${speech.length}):`);
console.log(`  ${spelled.slice(0, 40).join(' ')}`);
