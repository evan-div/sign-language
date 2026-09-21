/**
 * Handshape QC report.
 *
 * Prints measured geometry for every letter in the manual alphabet. This is the
 * feedback loop that handshape authoring runs on: the specs are joint rotations,
 * so the only way to know whether "F" is really a pinch is to solve the chain
 * and measure it.
 *
 * Run: pnpm handshapes:report
 */

import {
  solveFK,
  tipPosition,
  jointPosition,
  vec3Distance,
  fingerDirection,
  palmNormal,
} from '../packages/motion-format/src/index.js';
import { compileHandshape } from '../packages/engine/src/handshapes/compile.js';
import { ASL_LETTERS } from '../packages/engine/src/handshapes/letters.js';

const cm = (v: number) => (v * 100).toFixed(1).padStart(4);
const vec = (v: readonly number[]) => `[${v.map((n) => n.toFixed(2).padStart(5)).join(' ')}]`;

const header = [
  'ltr', 'thumb-idx', 'thumb-mid', 'idx-mid', 'idx-ext', 'mid-ext', 'pky-ext', 'fingerDir', 'palmNormal',
];
console.log(header.join('  '));
console.log('-'.repeat(96));

for (const [name, spec] of Object.entries(ASL_LETTERS)) {
  const solved = solveFK(compileHandshape(spec, 'right'));
  const tip = (n: string) => tipPosition(solved, `right_${n}_tip`);
  const knuckle = (n: string) => jointPosition(solved, `right_${n}1`);

  console.log(
    [
      ` ${name} `,
      cm(vec3Distance(tip('thumb'), tip('index'))),
      '     ' + cm(vec3Distance(tip('thumb'), tip('middle'))),
      '   ' + cm(vec3Distance(tip('index'), tip('middle'))),
      '   ' + cm(vec3Distance(knuckle('index'), tip('index'))),
      '   ' + cm(vec3Distance(knuckle('middle'), tip('middle'))),
      '   ' + cm(vec3Distance(knuckle('pinky'), tip('pinky'))),
      ' ' + vec(fingerDirection(solved, 'right')),
      vec(palmNormal(solved, 'right')),
    ].join(' '),
  );
}

console.log('\nAll distances in cm. Extension is knuckle-to-tip: a straight finger');
console.log('measures near its full length, a curled one much less.');
