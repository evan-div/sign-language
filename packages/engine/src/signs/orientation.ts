/**
 * Named palm orientations, as rotations applied on top of a location's
 * wrist correction.
 *
 * The correction leaves the hand palm-out and fingers-up wherever the arm has
 * put it, so orientation is a delta from that and means the same thing at every
 * location. Angles are XYZ Euler degrees in the hand's own frame.
 */

export const ORIENTATIONS = {
  /** Palm toward the viewer, fingers up. The reference orientation. */
  PALM_OUT: [0, 0, 0],
  /** Palm toward the signer. */
  PALM_IN: [0, 180, 0],
  /** Palm down, fingers pointing forward. */
  PALM_DOWN: [90, 0, 0],
  /** Palm up, fingers pointing forward. */
  PALM_UP: [-90, 0, 0],
  /** Palm toward the midline, fingers up. */
  PALM_ACROSS: [0, 90, 0],
  /** Palm away from the midline, fingers up. */
  PALM_SIDE: [0, -90, 0],
  /** Fingers forward, palm toward the midline. */
  FINGERS_FORWARD: [0, 90, -90],
  /** Angled partly outward, as a salute sits. */
  ANGLED_OUT: [0, -38, 0],
  /** Angled down and forward, as a hand presenting something. */
  ANGLED_DOWN: [52, 0, 0],
} as const satisfies Record<string, readonly [number, number, number]>;

export type OrientationName = keyof typeof ORIENTATIONS;
