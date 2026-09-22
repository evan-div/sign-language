/**
 * Solve arm poses for the named locations in signing space.
 *
 * We have no inverse kinematics, so "put the hand at the chin" has to become
 * concrete shoulder and elbow rotations. This solves each one numerically once
 * and emits them as constants, the same way the spelling anchor was derived.
 *
 * Each location resolves to an arm pose plus a wrist correction that leaves the
 * hand palm-out and fingers-up, so a sign's own orientation composes on top as
 * a delta rather than having to know how the arm got there.
 *
 * Run: pnpm solve:locations
 */

import { writeFileSync } from 'node:fs';
import {
  solveFK, jointPosition, jointRotation, quatFromEulerDeg,
  vec3Distance, type Pose, type Quat, type Vec3,
} from '../packages/motion-format/src/index.js';

type Arm = [number, number, number, number, number, number];

const armPose = (p: Arm): Pose => ({
  right_shoulder: quatFromEulerDeg(p[0], p[1], p[2]),
  right_elbow: quatFromEulerDeg(p[3], p[4], p[5]),
});

const wristAt = (p: Arm): Vec3 => jointPosition(solveFK(armPose(p)), 'right_wrist');

/**
 * Cost balances three things: hitting the target, keeping rotations modest, and
 * keeping the elbow below the wrist. Without the last term the solver happily
 * returns shoulder-above-elbow contortions that reach the point but read as a
 * broken arm.
 */
function cost(p: Arm, target: Vec3): number {
  const solved = solveFK(armPose(p));
  const wrist = jointPosition(solved, 'right_wrist');
  const elbow = jointPosition(solved, 'right_elbow');
  const reg = 2.2e-7 * p.reduce((a, v) => a + v * v, 0);
  const elbowAboveWrist = Math.max(0, elbow[1] - wrist[1] + 0.02);
  // Elbows also should not pass through the torso.
  const elbowInside = Math.max(0, 0.13 - Math.abs(elbow[0]));
  return vec3Distance(wrist, target) + reg + elbowAboveWrist * 0.6 + elbowInside * 0.8;
}

function solve(target: Vec3): Arm {
  let rng = 20260922;
  const rand = () => ((rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let best: Arm = [0, 0, 0, 0, 0, 0];
  let bestC = cost(best, target);
  for (let restart = 0; restart < 260; restart++) {
    let p: Arm = restart === 0
      ? [0, 0, 0, 0, 0, 0]
      : (Array.from({ length: 6 }, () => (rand() - 0.5) * 190) as Arm);
    let c = cost(p, target);
    let step = 48;
    while (step > 0.02) {
      let improved = false;
      for (let i = 0; i < 6; i++) {
        for (const d of [step, -step]) {
          const cand = [...p] as Arm;
          cand[i] += d;
          if (Math.abs(cand[i]) > 155) continue;
          const cc = cost(cand, target);
          if (cc < c - 1e-9) { p = cand; c = cc; improved = true; }
        }
      }
      if (!improved) step /= 2;
    }
    if (c < bestC) { best = p; bestC = c; }
  }
  return best;
}

/** Rotation that returns the hand to palm-out, fingers-up from this arm pose. */
function wristCorrection(p: Arm): Quat {
  const acc = jointRotation(solveFK(armPose(p)), 'right_wrist');
  return [-acc[0], -acc[1], -acc[2], acc[3]];
}

/**
 * Named places in signing space, as right-hand wrist positions in metres.
 * Body landmarks for reference: shoulder y=1.42, chin y~1.50, forehead y~1.62,
 * chest y~1.27.
 */
const LOCATIONS: Array<[string, Vec3, string]> = [
  ['NEUTRAL',      [-0.17, 1.24, 0.26], 'Default signing space, chest height and well forward'],
  ['NEUTRAL_HIGH', [-0.17, 1.36, 0.26], 'Upper signing space'],
  ['NEUTRAL_LOW',  [-0.16, 1.12, 0.24], 'Lower signing space'],
  ['CHEST',        [-0.09, 1.27, 0.12], 'At the chest, close enough to read as contact'],
  ['CHIN',         [-0.08, 1.47, 0.17], 'At the chin'],
  ['MOUTH',        [-0.06, 1.50, 0.15], 'At the mouth'],
  ['FOREHEAD',     [-0.10, 1.62, 0.13], 'At the forehead'],
  ['TEMPLE',       [-0.17, 1.60, 0.07], 'Beside the temple'],
  ['SHOULDER',     [-0.24, 1.40, 0.12], 'At the dominant shoulder'],
  ['OUT_HIGH',     [-0.30, 1.54, 0.20], 'Up and out, where a salute releases to'],
  ['SIDE_MID',     [-0.29, 1.26, 0.22], 'Out to the dominant side'],
  ['CENTRE_LOW',   [-0.05, 1.16, 0.24], 'Centred and low, where a base hand sits'],
  ['CENTRE_MID',   [-0.04, 1.29, 0.25], 'Centred, just above the base hand, where a dominant hand taps down'],
  ['EAR',          [-0.19, 1.57, 0.02], 'Beside the ear'],
];

const rows = LOCATIONS.map(([name, target, description]) => {
  const arm = solve(target);
  const reached = wristAt(arm);
  const solved = solveFK(armPose(arm));
  const elbow = jointPosition(solved, 'right_elbow');
  const err = vec3Distance(reached, target);
  console.log(
    `${name.padEnd(13)} err=${(err * 100).toFixed(2)}cm  ` +
    `wrist=[${reached.map((v) => v.toFixed(3)).join(', ')}]  ` +
    `elbow=[${elbow.map((v) => v.toFixed(3)).join(', ')}]`,
  );
  return { name, target, description, arm, correction: wristCorrection(arm), err };
});

const fmt = (n: number) => Number(n.toFixed(4));
const body = rows.map((r) => `  ${r.name}: {
    description: ${JSON.stringify(r.description)},
    target: [${r.target.join(', ')}],
    shoulder: [${r.arm.slice(0, 3).map(fmt).join(', ')}],
    elbow: [${r.arm.slice(3, 6).map(fmt).join(', ')}],
    wristCorrection: [${r.correction.map(fmt).join(', ')}],
  },`).join('\n');

writeFileSync('packages/engine/src/signs/locations.generated.ts', `/**
 * GENERATED by tools/solve-locations.ts -- do not edit by hand.
 *
 * Named locations in signing space, solved to concrete arm rotations. Shoulder
 * and elbow are XYZ Euler degrees; wristCorrection is the quaternion that
 * leaves the hand palm-out and fingers-up once the arm is in place, so a sign's
 * own orientation composes on top of it as a delta.
 *
 * Run \`pnpm solve:locations\` to regenerate.
 */

export interface SolvedLocation {
  readonly description: string;
  /** The wrist position this was solved for, in metres. */
  readonly target: readonly [number, number, number];
  readonly shoulder: readonly [number, number, number];
  readonly elbow: readonly [number, number, number];
  readonly wristCorrection: readonly [number, number, number, number];
}

export const SOLVED_LOCATIONS = {
${body}
} as const satisfies Record<string, SolvedLocation>;

export type LocationName = keyof typeof SOLVED_LOCATIONS;
`);

const worst = rows.reduce((a, b) => (a.err > b.err ? a : b));
console.log(`\nwrote packages/engine/src/signs/locations.generated.ts (worst error ${(worst.err * 100).toFixed(2)}cm at ${worst.name})`);
