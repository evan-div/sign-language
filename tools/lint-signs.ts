/**
 * Run the sign linter over the whole library and print what it finds.
 *
 * Exits non-zero on any error, so it can gate a commit. Warnings are printed
 * and do not fail: several of them are judgement calls about thresholds that
 * only a reviewer can settle.
 *
 * Run: pnpm lint:signs
 */

import { SIGN_IDS, lintLibrary, findCollisions, type Finding } from '../packages/engine/src/index.js';

const findings: Finding[] = lintLibrary();
const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warning');

const byCheck = new Map<string, Finding[]>();
for (const f of findings) {
  const list = byCheck.get(f.check);
  if (list) list.push(f);
  else byCheck.set(f.check, [f]);
}

console.log(`${SIGN_IDS.length} signs, ${errors.length} errors, ${warnings.length} warnings\n`);

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
