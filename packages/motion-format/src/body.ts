/**
 * A crude body, for asking whether a hand is inside it.
 *
 * Deliberately crude: a head sphere and a torso box. The mannequin has no skin
 * and the arms have no volume, so a tighter model would only produce false
 * confidence. This is here to catch a hand a long way inside the chest, which
 * is a bug, not to adjudicate millimetres of contact, which is not decidable at
 * this fidelity. Signs that touch the body are supposed to graze it.
 *
 * Numbers are read off the canonical skeleton's bind pose: head joint at
 * y=1.54 with the eyes at 1.615, neck at 1.45, pelvis at 0.95, shoulders at
 * x=+/-0.17.
 */

import { vec3Distance, type Vec3 } from './quat.js';

export const HEAD_CENTRE: Vec3 = [0, 1.585, 0.015];
export const HEAD_RADIUS = 0.105;
export const TORSO = { minY: 0.95, maxY: 1.44, halfX: 0.175, halfZ: 0.105 };

/** How far inside the body a point may be before it counts as penetration. */
export const PENETRATION_TOLERANCE = 0.03;

/** Depth of a point inside the body, in metres. Zero or less means outside. */
export function penetrationDepth(p: Vec3): number {
  const head = HEAD_RADIUS - vec3Distance(p, HEAD_CENTRE);
  const inTorsoY = p[1] > TORSO.minY && p[1] < TORSO.maxY;
  const torso = inTorsoY
    ? Math.min(TORSO.halfX - Math.abs(p[0]), TORSO.halfZ - Math.abs(p[2]))
    : -1;
  return Math.max(head, torso);
}

/**
 * The deepest penetration along a limb segment.
 *
 * Checking only the joints misses the case that matters most: an upper arm
 * lying diagonally across the chest has both ends outside the torso and its
 * middle 4cm inside it. Five samples is enough at this fidelity -- the body is
 * a sphere and a box, so a segment cannot dip in and out between samples by
 * more than a centimetre or so.
 */
export function segmentPenetration(a: Vec3, b: Vec3, samples = 5): number {
  let worst = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const d = penetrationDepth(p);
    if (d > worst) worst = d;
  }
  return worst;
}
