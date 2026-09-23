/**
 * How a lexical sign is written down.
 *
 * A sign is a short sequence of held configurations: at this moment the hand is
 * in this shape, at this place, facing this way. That decomposition is not an
 * arbitrary one -- handshape, location, orientation and movement are the
 * parameters ASL phonology itself describes signs with, which is what lets the
 * same entries later carry ASL-LEX metadata and act as the prior for extracted
 * motion.
 *
 * The three shorthands below (symmetry, base, repeat) are not conveniences for
 * their own sake. Each replaces a duplication that was already producing bugs
 * at twenty signs and would have produced more at a hundred: a mirrored sign
 * whose two tracks drift apart under editing, a static base hand rewritten for
 * every sign that uses one, a repeated movement copied out cycle by cycle.
 * `expandSign` turns each of them back into the explicit form, so the sugar is
 * exactly the desugaring and nothing downstream has to know about it.
 */

import type { LocationName } from './locations.generated.js';
import type { OrientationName } from './orientation.js';
import type { ContactSite } from './reach.js';

export interface SignKeyframe {
  readonly atMs: number;
  readonly location: LocationName;
  /** A letter id (A-Z) or a name from SIGN_HANDSHAPES. */
  readonly handshape: string;
  readonly orientation?: OrientationName;
  /**
   * Which part of the hand sits at the location. Defaults to the wrist, which
   * is what the solved location table states literally; a sign made at the face
   * wants the finger or the palm that touches it, or the hand ends up a whole
   * hand's length past the landmark it names.
   */
  readonly contact?: ContactSite;
}

/**
 * How the non-dominant hand follows the dominant one.
 *
 * `mirror` is the symmetric case: both hands do the same thing at the same
 * time, which mirroring across the midline already expresses.
 *
 * `alternate` is time-reversal -- the non-dominant hand is at time t where the
 * dominant hand is at (duration - t). For an oscillating sign that is true
 * alternation, one hand rising as the other falls; for a one-way movement it is
 * the hands travelling in opposite directions. Both are real ASL patterns, and
 * unlike a phase offset it is well defined on any track, with no wrap-around
 * ambiguity at the ends.
 */
export type Symmetry = 'mirror' | 'alternate';

/** A repeated movement: the interval [fromMs, toMs] is played `times` times. */
export interface Repeat {
  readonly fromMs: number;
  readonly toMs: number;
  readonly times: number;
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
  /**
   * The non-dominant hand, written out. Use `symmetry` or `base` instead where
   * one of them says it; this is for the hands that genuinely do different
   * things.
   */
  readonly nonDominant?: readonly SignKeyframe[];
  /** The non-dominant hand derived from the dominant one. */
  readonly symmetry?: Symmetry;
  /** A non-dominant hand that holds one configuration throughout: a base hand. */
  readonly base?: Omit<SignKeyframe, 'atMs'>;
  readonly repeat?: Repeat;
  /**
   * This sign is a configuration held in place, not a movement.
   *
   * "Every sign moves" turned out to be false the moment numbers arrived: a
   * signed 5 is an open hand held up, and nothing travels. The linter's motion
   * check flagged every single-digit number, which was the check being wrong
   * rather than the signs. Declaring it makes the difference between a sign
   * that is meant to be still and one that failed to move -- which is a real
   * bug and still caught.
   */
  readonly held?: boolean;
  readonly provenance: SignProvenance;
}

export function isTwoHanded(sign: SignDefinition): boolean {
  return (sign.nonDominant?.length ?? 0) > 0 || sign.symmetry !== undefined || sign.base !== undefined;
}
