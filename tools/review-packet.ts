/**
 * Build the material a Deaf reviewer needs, ranked so the first hour matters.
 *
 * Three hundred signs is more than anyone will review in one sitting, so the
 * order is the product. Signs are ranked by how much a wrong one would cost,
 * and the ranking is a HEURISTIC stated here, not a measure:
 *
 *   priority = fidelityWeight x (1 + 10 x frequency) + 0.5 x geometry flags
 *
 * where fidelityWeight is 3 for `uncertain`, 1.5 for `approximate` and 1 for
 * `citation` (the author's own suspicion -- which review will eventually test),
 * and frequency is the summed 1/rank of the English words that reach the sign
 * in the conversational frequency list. A sign the author doubts AND that
 * people say constantly goes first.
 *
 * Writes:
 *   docs/review/PACKET.md           a readable brief, one block per sign
 *   data/review/packet.json         the same, machine-readable
 *   data/review/review-sheet.csv    one row per sign, to fill in and send back
 *
 * Run: pnpm review:packet
 */

import { readFileSync, writeFileSync } from 'node:fs';
import {
  SIGNS, LEXICON, SYNONYMS, lintSign, findCollisions, trajectorySignature, trajectoryDistance,
  phonologicalDifference, type Finding,
} from '../packages/engine/src/index.js';

// --- how often is each sign needed? ---------------------------------------

const speech = readFileSync('data/english/subtitles-top3000.txt', 'utf8').split('\n')
  .map((l) => l.trim().split(/\s+/)[0]!.replace(/^'+/, '')).filter(Boolean);
const rankOf = new Map(speech.map((w, i) => [w, i + 1]));

/** Summed 1/rank of every English word that reaches each sign. */
const frequency = new Map<string, number>();
const words = new Map<string, Set<string>>();
const credit = (signId: string, word: string, share: number) => {
  const rank = rankOf.get(word);
  frequency.set(signId, (frequency.get(signId) ?? 0) + (rank ? share / rank : 0));
  (words.get(signId) ?? words.set(signId, new Set()).get(signId)!).add(word);
};
for (const entry of LEXICON) {
  const ids = [entry.signId, ...(entry.then ?? [])];
  // A compound's frequency is shared across its parts: a wrong BOY spoils SON,
  // BROTHER and BOY, so it deserves weight from all three.
  for (const id of ids) credit(id, entry.lemma, 1);
}
for (const [word, lemma] of Object.entries(SYNONYMS)) {
  for (const entry of LEXICON.filter((e) => e.lemma === lemma)) credit(entry.signId, word, 0.5);
}

// --- what does the geometry say about each sign? --------------------------

const FIDELITY_WEIGHT = { uncertain: 3, approximate: 1.5, citation: 1 } as const;
const ids = Object.keys(SIGNS);

const flags = new Map<string, Finding[]>();
for (const id of ids) {
  flags.set(id, lintSign(SIGNS[id]!).filter((f) => f.severity === 'warning' && f.check !== 'lexicon'));
}

// Nearest neighbours: the signs a reviewer is most likely to confuse this one
// with, which is also where a wrong parameter hides.
const paths = new Map(ids.map((id) => [id, trajectorySignature(SIGNS[id]!)]));
const neighbours = new Map<string, Array<{ id: string; cm: number; differs: string[] }>>();
for (const id of ids) {
  const near = ids.filter((o) => o !== id)
    .map((o) => ({ id: o, d: trajectoryDistance(paths.get(id)!, paths.get(o)!) }))
    .sort((a, b) => a.d - b.d).slice(0, 2)
    .map(({ id: o, d }) => ({
      id: o, cm: Math.round(d * 1000) / 10,
      differs: phonologicalDifference(SIGNS[id]!, SIGNS[o]!),
    }));
  neighbours.set(id, near);
}

// --- rank -----------------------------------------------------------------

interface Row {
  signId: string; gloss: string; category: string; description: string;
  fidelity: string; notes: string; words: string[]; frequency: number; geometry: string[];
  neighbours: Array<{ id: string; cm: number; differs: string[] }>; priority: number;
}

const rows: Row[] = ids.map((id) => {
  const sign = SIGNS[id]!;
  const fidelity = sign.provenance.fidelity ?? 'citation';
  const freq = frequency.get(id) ?? 0;
  const geometry = (flags.get(id) ?? []).map((f) => `${f.check}: ${f.message}`);
  const priority = FIDELITY_WEIGHT[fidelity] * (1 + 10 * freq) + 0.5 * geometry.length;
  return {
    signId: id, gloss: sign.gloss, category: sign.category ?? 'uncategorised',
    description: sign.description, fidelity,
    notes: (sign.provenance.note ?? '').replace(/^Authored from (a )?written descriptions?; not reviewed by a Deaf signer\.\s*/, ''),
    words: [...(words.get(id) ?? [])].sort(), frequency: freq, geometry,
    neighbours: neighbours.get(id)!, priority: Math.round(priority * 100) / 100,
  };
}).sort((a, b) => b.priority - a.priority);

writeFileSync('data/review/packet.json', JSON.stringify({
  note: 'Signs ranked for review by how much a wrong one would cost. Heuristic, not a measure: see tools/review-packet.ts.',
  count: rows.length, signs: rows,
}, null, 2) + '\n');

// --- the readable brief ---------------------------------------------------

const counts = (key: (r: Row) => string) => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ');
};

const md: string[] = [];
md.push(`# Review packet

**${rows.length} signs, none reviewed by a Deaf signer.** Every sign here was written from a
description by someone who is not a fluent signer. Your judgement is the only thing that can
change that, and nothing you say can make the picture worse than it is now.

## What to do

Open the app (\`pnpm dev\`, then the **Vocabulary** tab), click a sign to watch it, and mark it
in \`data/review/review-sheet.csv\`. The packet below is ordered so that **the first signs matter
most**: the ones the author most doubts, and the ones people say most often. If you only have an
hour, stop whenever you like; the order is the point.

For each sign, one of:

| verdict | meaning |
| --- | --- |
| \`correct\` | This is the sign. |
| \`correct-with-notes\` | Right sign, wrong in a detail. Say what. |
| \`incorrect\` | Not this sign, or not a sign. Say what is wrong. |
| \`regional-variant\` | A real sign, but not the one you would use. Say which. |
| \`cannot-judge\` | You do not know this one. That is useful to us too. |

Fill in \`reviewer\`, \`credential\` (\`deaf-fluent\` or \`interpreter\` are the two that count;
\`learner\` is recorded but never upgrades a sign), \`reviewedOn\` (YYYY-MM-DD), \`verdict\`, and
\`notes\`. Anything but \`correct\` needs notes. Leave a row blank to skip it.

## What to expect to find wrong

Expect a good many. The author rated their own confidence in each sign; the ratings are
unvalidated and **your verdicts are what will tell us whether they predict anything**.

${counts((r) => r.fidelity)}

The \`approximate\` ones are signs whose real form the notation cannot express, so a stand-in is
drawn. They are likely to look wrong in the way you would expect: finger movement missing,
contact between the hands only close, a wiggle drawn as a sway.

## What this cannot show you

- **Facial grammar and mouth morphemes.** The mannequin has a face, but the mouth shapes that
  distinguish real minimal pairs are not built.
- **Contact between the hands.** It is positional: two hands that should touch are placed near
  each other.
- **Directional verbs.** GIVE is signed once, toward the viewer. There is no way yet to aim a
  verb at a person in space.

Categories: ${counts((r) => r.category)}

---
`);

rows.forEach((r, i) => {
  md.push(`### ${i + 1}. ${r.gloss}  \`${r.signId}\`

*${r.category}* · fidelity **${r.fidelity}** · priority ${r.priority}
${r.words.length ? `\nEnglish that reaches it: ${r.words.join(', ')}` : ''}

${r.description}
${r.notes ? `\n> ${r.notes}\n` : ''}${r.geometry.length ? `\nGeometry notes: ${r.geometry.join('; ')}\n` : ''}
Looks most like: ${r.neighbours.map((n) => `${n.id} (${n.cm}cm, differs in ${n.differs.join(', ') || 'nothing'})`).join('; ')}

- [ ] correct   - [ ] correct-with-notes   - [ ] incorrect   - [ ] regional-variant   - [ ] cannot-judge
`);
});
writeFileSync('docs/review/PACKET.md', md.join('\n'));

// --- the sheet to fill in -------------------------------------------------

const q = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const sheet = ['signId,gloss,fidelity,reviewer,credential,reviewedOn,verdict,notes'];
for (const r of rows) sheet.push([r.signId, r.gloss, r.fidelity, '', '', '', '', ''].map(q).join(','));
writeFileSync('data/review/review-sheet.csv', sheet.join('\n') + '\n');

console.log(`${rows.length} signs ranked.\n`);
console.log('first ten for review:');
for (const r of rows.slice(0, 10)) {
  console.log(`  ${r.gloss.padEnd(16)} ${r.fidelity.padEnd(12)} priority ${String(r.priority).padStart(6)}   ${r.words.slice(0, 4).join(', ')}`);
}
console.log(`\nfidelity: ${counts((r) => r.fidelity)}`);
console.log('wrote docs/review/PACKET.md, data/review/packet.json, data/review/review-sheet.csv');
