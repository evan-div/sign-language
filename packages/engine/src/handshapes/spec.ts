/**
 * Handshape specification.
 *
 * Handshapes are authored as flexion and spread parameters rather than raw
 * quaternions, for two reasons. First, a reviewer can read "index straight,
 * others curled, thumb pinching" and check it against a reference; nobody can
 * review fifteen quaternions. Second, it mirrors how ASL phonology actually
 * describes handshapes (selected fingers, flexion, thumb position), which is
 * what lets the same library serve as the extraction prior later.
 */

export type FingerName = 'index' | 'middle' | 'ring' | 'pinky';

/** Which hand a handshape or posture applies to. */
export type Hand = 'left' | 'right';

/**
 * Flexion of one finger's three joints, each 0 (straight) to 1 (fully curled).
 * Order is [MCP, PIP, DIP] -- the knuckle, the middle joint, the fingertip joint.
 */
export type Flex = readonly [number, number, number];

export interface FingerSpec {
  readonly flex: Flex;
  /**
   * Lateral fan, -1 to 1. Positive fans the finger toward the thumb side.
   * Omitted means "follow the handshape's overall spread".
   */
  readonly spread?: number;
}

/**
 * Thumb joint rotations as explicit XYZ Euler angles in degrees.
 *
 * The thumb resists the flex/spread parameterisation that works for fingers:
 * its rest axis is diagonal and its meaningful positions (across the palm,
 * tucked under, pinching, extended) are not points on a single curl axis.
 * Rather than invent a parameterisation that would be subtly wrong, we state
 * the rotations outright and verify the resulting tip positions in tests.
 */
export interface ThumbSpec {
  readonly metacarpal: readonly [number, number, number];
  readonly proximal: readonly [number, number, number];
  readonly distal: readonly [number, number, number];
}

export interface HandshapeSpec {
  readonly id: string;
  /** Human-readable description, used in review and in the exported JSON. */
  readonly description: string;
  readonly index: FingerSpec;
  readonly middle: FingerSpec;
  readonly ring: FingerSpec;
  readonly pinky: FingerSpec;
  readonly thumb: ThumbSpec;
  /** Default fan applied to fingers that do not override `spread`. */
  readonly spread?: number;
  /**
   * Wrist rotation in XYZ Euler degrees, relative to the spelling anchor
   * (palm forward, fingers up). G, H, P and Q need this; most letters do not.
   */
  readonly wrist?: readonly [number, number, number];
}

export const STRAIGHT: Flex = [0, 0, 0];
export const CURLED: Flex = [1, 1, 0.85];
export const HOOKED: Flex = [0.15, 0.9, 0.6];
export const CURVED: Flex = [0.45, 0.45, 0.3];

/** Joint limits, in degrees, used by the compiler to turn 0..1 into rotations. */
export const MAX_MCP_FLEX = 90;
export const MAX_PIP_FLEX = 105;
export const MAX_DIP_FLEX = 70;
export const MAX_SPREAD = 16;

/**
 * How far each finger fans when spread is 1, relative to the thumb side.
 * The middle finger barely moves; the index and pinky carry most of the fan.
 */
export const FAN_DIRECTION: Readonly<Record<FingerName, number>> = Object.freeze({
  index: 1.0,
  middle: 0.1,
  ring: -0.55,
  pinky: -1.0,
});

export const FINGERS: readonly FingerName[] = ['index', 'middle', 'ring', 'pinky'];
