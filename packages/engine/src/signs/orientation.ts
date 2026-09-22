/**
 * Named hand orientations.
 *
 * Stated as the two directions that actually define a hand -- where the fingers
 * point and which way the palm faces -- rather than as Euler angles. Euler
 * triples hide their own mistakes: an orientation called PALM_UP can face the
 * palm up and still leave the fingers pointing back at the signer, and nothing
 * about the numbers says so. Written this way the name and the meaning are the
 * same thing, and the tests can check them against each other.
 *
 * Directions are world-space for the dominant (right) hand: +X is toward the
 * midline, +Y up, +Z toward the viewer. Mirroring for the non-dominant hand
 * flips X, which keeps "across the body" meaning the same thing on both sides.
 *
 * These are applied on top of a location's wrist correction, which has already
 * squared the hand up, so they mean the same thing wherever the arm is.
 */

import { quatFromHandDirections, type Quat, type Vec3 } from '@signflow/motion-format';

export interface OrientationSpec {
  readonly description: string;
  /** Where the fingers point. */
  readonly fingers: Vec3;
  /** Which way the palm faces. Squared against `fingers`, so approximate is fine. */
  readonly palm: Vec3;
}

export const ORIENTATIONS = {
  PALM_OUT: { description: 'Fingers up, palm toward the viewer', fingers: [0, 1, 0], palm: [0, 0, 1] },
  PALM_IN: { description: 'Fingers up, palm toward the signer', fingers: [0, 1, 0], palm: [0, 0, -1] },
  PALM_ACROSS: { description: 'Fingers up, palm toward the midline', fingers: [0, 1, 0], palm: [1, 0, 0] },
  PALM_SIDE: { description: 'Fingers up, palm away from the midline', fingers: [0, 1, 0], palm: [-1, 0, 0] },
  PALM_DOWN: { description: 'Fingers forward, palm down', fingers: [0, 0, 1], palm: [0, -1, 0] },
  PALM_UP: { description: 'Fingers forward, palm up', fingers: [0, 0, 1], palm: [0, 1, 0] },
  FINGERS_FORWARD: { description: 'Fingers forward, palm toward the midline', fingers: [0, 0, 1], palm: [1, 0, 0] },
  FINGERS_ACROSS: { description: 'Fingers toward the midline, palm toward the signer', fingers: [1, 0, 0], palm: [0, 0, -1] },
  FINGERS_ACROSS_DOWN: { description: 'Fingers toward the midline, palm down', fingers: [1, 0, 0], palm: [0, -1, 0] },
  FINGERS_DOWN: { description: 'Fingers down, palm toward the signer', fingers: [0, -1, 0], palm: [0, 0, -1] },
  ANGLED_OUT: { description: 'Fingers up and outward, palm forward, as a salute sits', fingers: [-0.45, 0.89, 0], palm: [0, 0, 1] },
  ANGLED_DOWN: { description: 'Fingers up and forward, palm forward and down', fingers: [0, 0.72, 0.69], palm: [0, -0.69, 0.72] },
} as const satisfies Record<string, OrientationSpec>;

export type OrientationName = keyof typeof ORIENTATIONS;

export function orientationQuat(name: OrientationName): Quat {
  const spec = ORIENTATIONS[name];
  return quatFromHandDirections(spec.fingers as Vec3, spec.palm as Vec3);
}
