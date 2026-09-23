/**
 * Run the sign linter over the whole library and print what it finds.
 *
 * Exits non-zero on any error, so it can gate a commit. Warnings are printed
 * and do not fail: several of them are judgement calls about thresholds that
 * only a reviewer can settle.
 *
 * Run: pnpm lint:signs
 */

import {
  SIGN_IDS, lintLibrary, lintSign, lintPlan, findCollisions, numberSign, translate,
  type Finding,
} from '../packages/engine/src/index.js';

/**
 * Numbers are generated rather than authored, which is no reason to check them
 * less: a rule that produces a bad sign produces a great many of them.
 */
const NUMBERS = [0, 1, 5, 9, 10, 11, 13, 15, 16, 19, 20, 21, 33, 42, 99, 100, 305, 1000, 2026, 12345];

/**
 * Sentences whose markers are the point. There is no geometry to check on a
 * non-manual marker, so the checks are about scope and contradiction, and they
 * need sentences to run on.
 */
const SENTENCES = [
  'hello my name is Evan', 'what is your name?', 'are you deaf?', 'no',
  'no, I go home', 'if you want, do you go?', 'my mother, I love',
  'yes I understand', 'why do you go?', 'I have three weeks',
  'who is your father?', 'if it is not good, I stop', 'where are you now?',
  'I do not know', 'you are right', 'no I do not want more',
  'forty-two', '5551234', 'I go 5 days tomorrow',
];

const findings: Finding[] = lintLibrary();
for (const value of NUMBERS) {
  const sign = numberSign(value);
  if (!sign) { findings.push({ severity: 'error', check: 'number', signId: String(value), message: 'not composable' }); continue; }
  findings.push(...lintSign(sign));
}
for (const sentence of SENTENCES) findings.push(...lintPlan(translate(sentence).plan));
const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warning');

const byCheck = new Map<string, Finding[]>();
for (const f of findings) {
  const list = byCheck.get(f.check);
  if (list) list.push(f);
  else byCheck.set(f.check, [f]);
}

console.log(`${SIGN_IDS.length} authored signs, ${NUMBERS.length} generated numbers, `
  + `${SENTENCES.length} sentences: ${errors.length} errors, ${warnings.length} warnings\n`);

for (const [check, list] of [...byCheck].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${check} (${list.length})`);
  for (const f of list.sort((a, b) => a.signId.localeCompare(b.signId))) {
    console.log(`  ${f.severity === 'error' ? 'E' : 'w'} ${f.signId.padEnd(18)} ${f.message}`);
  }
  console.log();
}

const nearest = findCollisions(0.12).slice(0, 8);
if (nearest.length > 0) {
  console.log('closest pairs (a distinctness margin, not necessarily a fault)');
  for (const c of nearest) {
    console.log(`  ${(c.distance * 100).toFixed(1)}cm  ${c.a} / ${c.b}`);
  }
  console.log();
}

process.exit(errors.length > 0 ? 1 : 0);
