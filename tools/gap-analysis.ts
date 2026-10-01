/**
 * Which common English words has the system no answer for?
 *
 * The vocabulary should be chosen by what is missing, not by what comes to
 * mind. This ranks the words that fall through to fingerspelling in both
 * frequency lists and prints the top of each, so a selection can be defended
 * with a number: "this word is the 41st commonest thing people say, and we
 * would spell it out."
 *
 * Run: pnpm gap
 */

import { readFileSync } from 'node:fs';
import { NOISE } from './lib/english-noise.js';
import {
  FUNCTION_WORDS, SPATIALLY_EXPRESSED, resolveConcept, tokenise, parseNumber,
} from '../packages/engine/src/index.js';

// Leading apostrophes are stripped: the subtitle tokeniser leaves "'s", "'ll"
// and "'m" as words of their own, which are contraction fragments, not words.
const read = (file: string) => readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
  .map((line) => line.split(/\s+/)[0]!.replace(/^'+/, ''));

const LISTS = {
  web: read('data/english/frequency-top2000.txt'),
  speech: read('data/english/subtitles-top3000.txt'),
};

type Outcome = 'answered' | 'spelled';

function outcome(word: string): Outcome {
  if (NOISE.has(word) || /^\d/.test(word)) return 'answered';
  if (parseNumber([word], 0)) return 'answered';
  const token = tokenise(word)[0];
  if (!token) return 'answered';
  if (FUNCTION_WORDS.has(token.lemma) || SPATIALLY_EXPRESSED.has(token.lemma)) return 'answered';
  return resolveConcept(token.lemma, undefined, word).resolution === 'fingerspelled' ? 'spelled' : 'answered';
}

/** Merge ranks across lists: a word high in either is worth having. */
const best = new Map<string, { web?: number; speech?: number }>();
for (const [name, words] of Object.entries(LISTS) as Array<[keyof typeof LISTS, string[]]>) {
  words.forEach((word, rank) => {
    const entry = best.get(word) ?? {};
    entry[name] = rank + 1;
    best.set(word, entry);
  });
}

const gaps = [...best.entries()]
  .filter(([word]) => outcome(word) === 'spelled' && word.length > 1)
  .map(([word, ranks]) => ({
    word, ...ranks,
    // Speech leads and the web list only breaks ties. This is the product's
    // actual input -- what a person would type to be signed -- and the web list
    // ranks "page", "click" and "copyright" among the commonest English words,
    // which describes the web rather than people. A word found ONLY in the web
    // list is dropped altogether: nobody types "pm" into a sign-language app.
    score: (ranks.speech ? 1 / ranks.speech : 0) + (ranks.web ? 0.25 / ranks.web : 0),
  }))
  .filter((g) => g.speech !== undefined)
  .sort((a, b) => b.score - a.score);

// Words already looked at and decided against, with the reason. A gap that has a
// recorded reason is a decision; one that does not is an oversight.
let skipped = new Map<string, string>();
try {
  const parsed = JSON.parse(readFileSync('data/vocabulary/skipped.json', 'utf8')) as
    { skipped: Array<{ word: string; reason: string }> };
  skipped = new Map(parsed.skipped.map((s) => [s.word, s.reason]));
} catch { /* no record yet: every gap is unreviewed */ }

const limit = Number(process.argv[2] ?? 80);
console.log(`${gaps.length} words in the two lists would be fingerspelled.\n`);
const unreviewed = gaps.filter((g) => !skipped.has(g.word)).length;
console.log(`${gaps.length - unreviewed} have a recorded reason; ${unreviewed} do not.\n`);
console.log('rank  word            web   speech  reason');
gaps.slice(0, limit).forEach((g, i) => {
  console.log(
    `${String(i + 1).padStart(4)}  ${g.word.padEnd(14)} ${String(g.web ?? '-').padStart(5)} ${String(g.speech ?? '-').padStart(7)}  ${skipped.get(g.word) ?? '(not yet considered)'}`,
  );
});

if (process.argv[3] === '--json') {
  console.log('\n' + JSON.stringify(gaps.slice(0, limit).map((g) => g.word)));
}
