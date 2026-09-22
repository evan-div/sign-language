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
  vec3Distance, segmentPenetration, type Pose, type Quat, type Vec3,
} from '../packages/motion-format/src/index.js';

type Arm = [number, number, number, number, number, number];

const armPose = (p: Arm): Pose => ({
  right_shoulder: quatFromEulerDeg(p[0], p[1], p[2]),
  right_elbow: quatFromEulerDeg(p[3], p[4], p[5]),
});

const wristAt = (p: Arm): Vec3 => jointPosition(solveFK(armPose(p)), 'right_wrist');

/**
 * Cost of an arm pose against a wrist target.
 *
 * Reaching the point comes first; the rest only chooses between poses that
 * reach it. Keep the rotations modest, keep the elbow from riding above the
 * wrist, keep the elbow and wrist out of the body, and among everything that
 * reaches, prefer the elbow low.
 *
 * The elbow terms are the ones with history. "At least 13cm off the midline"
 * was a stand-in for "not inside the chest" that only looked sideways, so for
 * targets at the face -- where the elbow naturally comes forward and in -- the
 * only way to satisfy it was to raise the elbow, and every face location solved
 * with the elbow flared to shoulder height. Measuring penetration in all three
 * axes lets the elbow come in front of the ribs where it belongs. Making
 * "elbow low" a hard ceiling instead fails the other way: a hand above the head
 * REQUIRES the elbow above the shoulder, and as a constraint it left ABOVE_HEAD
 * 15cm short. It is a preference, so it settles ties and yields to reach.
 */
function cost(p: Arm, target: Vec3): number {
  const solved = solveFK(armPose(p));
  const wrist = jointPosition(solved, 'right_wrist');
  const elbow = jointPosition(solved, 'right_elbow');
  const shoulder = jointPosition(solved, 'right_shoulder');
  const reg = 2.2e-7 * p.reduce((a, v) => a + v * v, 0);
  const elbowAboveWrist = Math.max(0, elbow[1] - wrist[1] + 0.02);
  // Whole limbs, not just their ends: an upper arm can have both joints clear
  // of the torso and its middle inside it.
  const upperArm = Math.max(0, segmentPenetration(shoulder, elbow) + 0.01);
  const forearm = Math.max(0, segmentPenetration(elbow, wrist) + 0.01);
  const elbowHeld = Math.max(0, elbow[1] - 1.20);
  return vec3Distance(wrist, target) + reg + elbowAboveWrist * 0.6
    + upperArm * 2.0 + forearm * 2.0 + elbowHeld * 0.02;
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
 * Named places in signing space, in metres, for the right hand.
 *
 * A target is a POINT IN SPACE, not a wrist position. The arm solved here puts
 * the wrist there, which is what a keyframe gets by default; a keyframe that
 * names a contact site instead re-solves the arm at compile time so that the
 * site -- a fingertip, the palm -- lands on the point. Reading these as wrist
 * positions is what left fingertips a hand's length above the landmark they
 * were named for.
 *
 * Body landmarks for reference: pelvis y=0.95, chest y~1.27, shoulder y=1.42,
 * chin y~1.50, nose y~1.57, eyes y=1.615, crown y~1.68.
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
  ['NOSE',         [-0.02, 1.565, 0.115], 'At the nose'],
  ['CHEEK',        [-0.065, 1.545, 0.085], 'On the dominant cheek'],
  ['BROW',         [-0.045, 1.625, 0.095], 'At the brow, above the eye'],
  ['NECK',         [-0.045, 1.465, 0.085], 'At the throat'],
  ['CHEST_OUT',    [-0.07, 1.31, 0.20], 'A hand\'s depth in front of the upper chest'],
  ['WAIST',        [-0.13, 1.03, 0.16], 'At the waist'],
  ['CONTRA_CHEST', [0.07, 1.30, 0.17], 'Across the midline, on the non-dominant side of the chest'],
  ['CONTRA_SHOULDER', [0.09, 1.38, 0.13], 'Across the body at the non-dominant shoulder'],
  ['ABOVE_HEAD',   [-0.16, 1.76, 0.12], 'Above the head'],
  ['SIDE_HIGH',    [-0.33, 1.45, 0.16], 'Out to the dominant side at head height'],
  ['SIDE_LOW',     [-0.27, 1.10, 0.20], 'Out to the dominant side and low'],
  ['CENTRE_HIGH',  [-0.03, 1.42, 0.26], 'Centred and high, in front of the chin'],
  ['OUT_FAR',      [-0.20, 1.28, 0.40], 'Well forward, where a sign pushes away to'],
  ['FACE_HIGH',    [-0.10, 1.60, 0.20], 'In front of the face, off the midline so two hands clear each other'],
  ['FACE_LOW',     [-0.10, 1.44, 0.20], 'In front of the jaw, off the midline so two hands clear each other'],
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
  /** The point in signing space this names, in metres. */
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
