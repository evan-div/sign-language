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
import { FUNCTION_WORDS, SPATIALLY_EXPRESSED, resolveConcept, tokenise, SIGN_IDS, LEXICON } from '../packages/engine/src/index.js';

type Outcome = 'sign' | 'synonym' | 'ambiguous' | 'dropped' | 'spatial' | 'fingerspelled';

const words = readFileSync('data/english/frequency-top2000.txt', 'utf8')
  .split('\n').map((w) => w.trim()).filter(Boolean);

function classify(word: string): Outcome {
  const token = tokenise(word)[0];
  if (!token) return 'dropped';
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

const outcomes = words.map(classify);

/**
 * Zipf weighting, as a stand-in for token frequency.
 *
 * The list is ranks without counts. Word frequency follows roughly 1/rank, so
 * weighting by 1/rank approximates how often a word is actually met, which is
 * the number that matters: covering "the" and "you" is worth more than covering
 * two words from the bottom of the list.
 */
const weight = (rank: number) => 1 / (rank + 1);

function report(limit: number): void {
  const slice = outcomes.slice(0, limit);
  const counts = new Map<Outcome, number>();
  const weighted = new Map<Outcome, number>();
  let totalWeight = 0;
  slice.forEach((outcome, i) => {
    counts.set(outcome, (counts.get(outcome) ?? 0) + 1);
    weighted.set(outcome, (weighted.get(outcome) ?? 0) + weight(i));
    totalWeight += weight(i);
  });
  const pct = (n: number) => `${((n / slice.length) * 100).toFixed(0)}%`.padStart(4);
  const wpct = (n: number) => `${((n / totalWeight) * 100).toFixed(0)}%`.padStart(4);
  const row = (o: Outcome) => `${pct(counts.get(o) ?? 0)} ${wpct(weighted.get(o) ?? 0)}`;
  const handled = (['sign', 'synonym', 'ambiguous', 'dropped', 'spatial'] as Outcome[])
    .reduce((a, o) => a + (counts.get(o) ?? 0), 0);
  const handledW = (['sign', 'synonym', 'ambiguous', 'dropped', 'spatial'] as Outcome[])
    .reduce((a, o) => a + (weighted.get(o) ?? 0), 0);
  console.log(
    `${String(limit).padStart(5)}  ${row('sign')}  ${row('synonym')}  ${row('ambiguous')}  ` +
    `${row('dropped')}  ${row('spatial')}  ${row('fingerspelled')}   ${pct(handled)} ${wpct(handledW)}`,
  );
}

console.log(`${SIGN_IDS.length} signs, ${LEXICON.length} lexicon entries\n`);
console.log('        signed       synonym    ambiguous     dropped      spatial      spelled      answered');
console.log('  top   type  tok   type  tok   type  tok   type  tok   type  tok   type  tok   type  tok');
for (const limit of [100, 250, 500, 1000, 2000]) report(limit);

console.log('\n"type" counts each word once; "tok" weights by 1/rank, as a stand-in for');
console.log('how often the word is actually met. "not spelled" is everything the system');
console.log('has an answer for: a sign, a stated substitution, or a word it drops on purpose.\n');

const spelled = words.filter((_, i) => outcomes[i] === 'fingerspelled');
console.log(`the 30 most common words with no sign (of ${spelled.length} in the top ${words.length}):`);
console.log(`  ${spelled.slice(0, 30).join(' ')}`);
