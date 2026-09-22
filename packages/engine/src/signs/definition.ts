/**
 * How a lexical sign is written down.
 *
 * A sign is a short sequence of held configurations: at this moment the hand is
 * in this shape, at this place, facing this way. That decomposition is not an
 * arbitrary one -- handshape, location, orientation and movement are the
 * parameters ASL phonology itself describes signs with, which is what lets the
 * same entries later carry ASL-LEX metadata and act as the prior for extracted
 * motion.
 */

import type { LocationName } from './locations.generated.js';
import type { OrientationName } from './orientation.js';

export interface SignKeyframe {
  readonly atMs: number;
  readonly location: LocationName;
  /** A letter id (A-Z) or a name from SIGN_HANDSHAPES. */
  readonly handshape: string;
  readonly orientation?: OrientationName;
}

/**
 * Where a sign's motion came from, and how far it should be trusted.
 *
 * Every authored sign here is `hand-authored` and `unvalidated`. They exist to
 * exercise the pipeline, not to teach ASL: none has been checked by a Deaf
 * signer, and several are certainly wrong in detail. The field exists so that
 * replacing one with extracted or captured motion is a data change, and so the
 * interface can say plainly what the user is looking at.
 */
export interface SignProvenance {
  readonly source: 'hand-authored' | 'video-extraction' | 'mocap' | 'generated';
  readonly validation: 'unvalidated' | 'reviewed' | 'expert-validated';
  readonly note?: string;
}

export interface SignDefinition {
  readonly id: string;
  /** Conventional ASL gloss, used in the gloss view. */
  readonly gloss: string;
  readonly description: string;
  readonly durationMs: number;
  /**
   * The meaningful part of the sign, excluding its approach and release.
   * The sequencer trims to this when concatenating, so that two signs in a row
   * do not play one clip's release straight into the next clip's approach.
   */
  readonly strokeStartMs: number;
  readonly strokeEndMs: number;
  readonly dominant: readonly SignKeyframe[];
  /** Present only for two-handed signs. */
  readonly nonDominant?: readonly SignKeyframe[];
  readonly provenance: SignProvenance;
}

export function isTwoHanded(sign: SignDefinition): boolean {
  return (sign.nonDominant?.length ?? 0) > 0;
}
