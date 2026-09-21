/**
 * Export the canonical skeleton and handshape library as portable JSON.
 *
 * The TypeScript definitions stay the source of truth -- they are typed and
 * reviewable, and the tests assert against them. This emits the same data in a
 * form the Python motion pipeline can consume, so the extraction prior and the
 * runtime share one handshape library rather than drifting apart.
 *
 * Run: pnpm export:data
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  JOINTS, JOINT_COUNT, SKELETON_VERSION, TIP_SITES, CANONICAL_TO_VRM,
  solveFK, tipPosition, jointPosition, vec3Distance, vec3Sub,
} from '../packages/motion-format/src/index.js';
import { ASL_LETTERS, MOVING_LETTERS } from '../packages/engine/src/handshapes/letters.js';
import { compileHandshape } from '../packages/engine/src/handshapes/compile.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function write(relativePath: string, data: unknown): void {
  const target = resolve(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${relativePath}`);
}

write('data/skeleton/canonical-skeleton.json', {
  version: SKELETON_VERSION,
  jointCount: JOINT_COUNT,
  convention: {
    axes: '+X avatar left, +Y up, +Z forward toward the viewer',
    bindPose: 'goalpost: upper arms out and down, forearms vertical, palms forward, fingers up',
    restRotations: 'identity for every joint; bone geometry lives in the offsets',
    units: 'metres',
  },
  joints: JOINTS.map((j) => ({
    name: j.name,
    parent: j.parent < 0 ? null : JOINTS[j.parent]!.name,
    offset: j.offset,
    vrmBone: CANONICAL_TO_VRM[j.name] ?? null,
  })),
  tipSites: TIP_SITES,
});

/** Measured geometry per letter, so the pipeline can classify against it. */
function measure(letter: string) {
  const solved = solveFK(compileHandshape(ASL_LETTERS[letter]!, 'right'));
  const wrist = jointPosition(solved, 'right_wrist');
  const bind = solveFK({});
  const fingers = ['index', 'middle', 'ring', 'pinky'] as const;
  const round3 = (v: number) => Number(v.toFixed(3));
  return {
    /**
     * Thumb tip relative to the wrist, in metres. This is the distinguishing
     * feature for the fist letters: M, N and T are the same closed hand, and
     * only the gap the thumb emerges from tells them apart.
     */
    thumbTip: vec3Sub(tipPosition(solved, 'right_thumb_tip'), wrist).map(round3),
    reach: Object.fromEntries(fingers.map((f) => [
      f,
      Number((vec3Distance(tipPosition(solved, `right_${f}_tip`), wrist) /
        vec3Distance(tipPosition(bind, `right_${f}_tip`), jointPosition(bind, 'right_wrist'))).toFixed(4)),
    ])),
    thumbToIndexTip: Number(vec3Distance(
      tipPosition(solved, 'right_thumb_tip'), tipPosition(solved, 'right_index_tip')).toFixed(4)),
    indexToMiddleTip: Number(vec3Distance(
      tipPosition(solved, 'right_index_tip'), tipPosition(solved, 'right_middle_tip')).toFixed(4)),
  };
}

write('data/handshapes/asl-letters.json', {
  skeletonVersion: SKELETON_VERSION,
  note: 'Hand-authored. Verified by the assertions in packages/engine/test/handshapes.test.ts. '
    + 'M, N, T and R are documented approximations.',
  movingLetters: [...MOVING_LETTERS],
  letters: Object.fromEntries(
    Object.entries(ASL_LETTERS).map(([id, spec]) => [id, { spec, measured: measure(id) }]),
  ),
});
