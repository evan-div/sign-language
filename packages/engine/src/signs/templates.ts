/**
 * A compact way to say a sign.
 *
 * At a hundred signs the verbose notation was already 1,300 lines; at five
 * hundred it would be 6,600, and a vocabulary nobody can read in one sitting is
 * a vocabulary nobody can review. But length is not the real cost. Almost every
 * defect the linter found at a hundred came from one of four mistakes made by
 * hand, over and over:
 *
 *  - mixing a keyframe that names a contact site with one that does not, so the
 *    wrist jumps by most of a hand's length between them;
 *  - covering a long distance in a short time, which reads as a snap;
 *  - starting a mirrored pair on the midline, where both hands land in the same
 *    place;
 *  - writing the same movement out again for the fifteenth time and getting one
 *    number wrong.
 *
 * Templates make the first three impossible rather than merely checkable, and
 * the fourth a one-word change. Time is derived from distance, so a template
 * cannot produce a sign the speed check would reject; a contact site is applied
 * to every keyframe of a sign, so it cannot be mixed.
 *
 * This layer is pure data to data. It produces ordinary SignDefinitions, which
 * go through expandSign, the compiler, the linter and the exporter exactly as a
 * hand-written one does. Nothing downstream knows templates exist.
 */

import { vec3Distance, type Vec3 } from '@signflow/motion-format';
import type {
  SignCategory, SignDefinition, SignKeyframe, SignProvenance, Symmetry,
} from './definition.js';
import { SOLVED_LOCATIONS, type LocationName } from './locations.generated.js';
import type { OrientationName } from './orientation.js';
import type { ContactSite } from './reach.js';

/** One configuration of the hand: here, in this shape, facing this way. */
export interface Pose1 {
  readonly at: LocationName;
  readonly hs: string;
  readonly ori?: OrientationName;
  readonly contact?: ContactSite;
  /** Time held on arrival, in ms. */
  readonly hold?: number;
}

/** Shorthand for a pose, so a sign is a line and not a paragraph. */
export function p(
  at: LocationName, hs: string, ori?: OrientationName, contact?: ContactSite, hold?: number,
): Pose1 {
  return {
    at, hs,
    ...(ori ? { ori } : {}),
    ...(contact ? { contact } : {}),
    ...(hold ? { hold } : {}),
  };
}

/**
 * Average wrist speed a template designs for, in metres per second.
 *
 * The ratio of PEAK to average is what matters and it is not 1.5. A smoothstep
 * peaks at 1.5 times its average in joint space, but the arm's geometry
 * amplifies that again in Cartesian space: measured on a 17cm approach, an
 * average of 0.88 m/s peaked at 2.0, a ratio of 2.3. Designing for 0.9 on the
 * assumption of 1.5 is what made the first version of this fail its own test.
 *
 * 0.8 keeps typical peaks around 1.8, inside the library's own measured
 * distribution (median 1.14, p90 1.71) rather than at its edge.
 */
const AVG_SPEED = 0.8;
/** The shortest a leg may take, however close its ends are. */
const MIN_LEG_MS = 150;
/** A leg that changes only the hand's orientation or shape still takes time. */
const TURN_MS = 220;
/** Time held at the end of a sign before the release. */
const TAIL_MS = 70;

const target = (at: LocationName) => SOLVED_LOCATIONS[at].target as unknown as Vec3;

/**
 * How long one leg takes, from the distance between its two places.
 *
 * This is an ESTIMATE, and it is worth being exact about what it can and cannot
 * promise. Distance is measured between points in space, but the arm is moved
 * in joint space, and two nearby points can have very different arm solutions:
 * CHEST to SIDE_MID is 22cm but peaks at 2.5 m/s where the average predicts
 * about 1.3. Making it exact means solving the arm for every leg at definition
 * time, which costs seconds of import for a few hundred signs and was rejected.
 *
 * Measured over a spread of location pairs, this keeps all but about one pair
 * in a hundred under the linter's speed warning, where timing by guesswork
 * failed about one in six. The remainder are caught by the linter, and `pace`
 * is the one-word fix.
 */
function legMs(a: Pose1, b: Pose1, pace: number): number {
  const metres = vec3Distance(target(a.at), target(b.at));
  const travel = Math.round(((metres / AVG_SPEED) * 1000) / 10) * 10;
  const turns = a.ori !== b.ori || a.hs !== b.hs;
  const ms = Math.max(MIN_LEG_MS, travel, turns && metres < 0.03 ? TURN_MS : 0);
  return Math.round((ms * pace) / 10) * 10;
}

/** A movement: timed poses for the dominant hand, and where the stroke lies. */
export interface Motion {
  readonly dominant: readonly SignKeyframe[];
  /** The other hand's poses, on the same timeline, when it moves too. */
  readonly other?: readonly SignKeyframe[];
  readonly durationMs: number;
  readonly strokeStartMs: number;
  readonly strokeEndMs: number;
}

/** Where a hand comes from before a sign: high for the face, low for the waist. */
function approachFor(first: Pose1): LocationName {
  const y = target(first.at)[1];
  if (y > 1.42) return 'NEUTRAL_HIGH';
  if (y < 1.12) return 'NEUTRAL_LOW';
  return 'NEUTRAL';
}

export interface PathOptions {
  /**
   * Scale every leg's time. 1.25 is a quarter slower.
   *
   * The remedy for a sign the linter flags as too fast: a template's timing is
   * an estimate from distance, and where it is wrong this is the single word
   * that fixes it without writing the sign out by hand.
   */
  readonly pace?: number;
  /** Where the hand starts from. Defaults by the height of the first pose. */
  readonly from?: LocationName;
  /** The other hand, one pose per pose of the dominant one. */
  readonly other?: readonly Pose1[];
}

/**
 * Move through a series of poses. Everything else is this with a name.
 *
 * The first pose is preceded by an approach, which exists so a sign plays
 * sensibly on its own and so the sequencer has a ramp to trim; the stroke is
 * everything from arrival at the first pose to arrival at the last.
 */
export function path(poses: readonly Pose1[], options: PathOptions = {}): Motion {
  if (poses.length === 0) throw new Error('A path needs at least one pose');
  const first = poses[0]!;

  const approach: Pose1 = {
    at: options.from ?? approachFor(first),
    hs: first.hs,
    ...(first.ori ? { ori: first.ori } : {}),
    ...(first.contact ? { contact: first.contact } : {}),
  };
  const sequence = [approach, ...poses];
  const otherSequence = options.other
    ? [{ ...options.other[0]!, at: approach.at }, ...options.other]
    : undefined;
  if (options.other && options.other.length !== poses.length) {
    throw new Error('The other hand needs one pose per pose of the dominant hand');
  }

  const keyframe = (pose: Pose1, atMs: number): SignKeyframe => ({
    atMs, location: pose.at, handshape: pose.hs,
    ...(pose.ori ? { orientation: pose.ori } : {}),
    ...(pose.contact ? { contact: pose.contact } : {}),
  });

  const dominant: SignKeyframe[] = [];
  const other: SignKeyframe[] = [];
  let at = 0;
  let strokeStartMs = 0;

  sequence.forEach((pose, i) => {
    if (i > 0) at += legMs(sequence[i - 1]!, pose, options.pace ?? 1);
    if (i === 1) strokeStartMs = at;
    dominant.push(keyframe(pose, at));
    if (otherSequence) other.push(keyframe(otherSequence[i]!, at));
    if (pose.hold && i > 0) {
      at += pose.hold;
      dominant.push(keyframe(pose, at));
      if (otherSequence) other.push(keyframe(otherSequence[i]!, at));
    }
  });

  const strokeEndMs = at;
  const durationMs = at + TAIL_MS;
  dominant.push(keyframe(sequence[sequence.length - 1]!, durationMs));
  if (otherSequence) other.push(keyframe(otherSequence[otherSequence.length - 1]!, durationMs));

  return {
    dominant, ...(otherSequence ? { other } : {}),
    durationMs, strokeStartMs, strokeEndMs,
  };
}

/** Arrive at a place and stay: a point, a touch, a held shape. */
export function touch(pose: Pose1, options: PathOptions & { hold?: number } = {}): Motion {
  return path([{ ...pose, hold: options.hold ?? pose.hold ?? 160 }], options);
}

/** Move from one place to another. */
export function travel(from: Pose1, to: Pose1, options: PathOptions = {}): Motion {
  return path([{ ...from, hold: from.hold ?? 60 }, { ...to, hold: to.hold ?? 100 }], options);
}

/** Move through a middle point on the way: an arc, a sweep, a bend in the path. */
export function arc(from: Pose1, via: Pose1, to: Pose1, options: PathOptions = {}): Motion {
  return path([from, via, { ...to, hold: to.hold ?? 100 }], options);
}

/**
 * Touch, lift and touch again.
 *
 * `times` is the number of CONTACTS, so a tap-tap is 2. The lift is a separate
 * place the hand returns toward between contacts, and both ends name the same
 * contact site: a tap whose contact keyframe names a fingertip and whose lift
 * keyframe names the wrist is not a tap but a lurch of most of a hand's length.
 */
export function tap(pose: Pose1, lift: LocationName, times = 2, options: PathOptions = {}): Motion {
  const away: Pose1 = { ...pose, at: lift, hold: 0 };
  const contact: Pose1 = { ...pose, hold: 0 };
  const poses: Pose1[] = [];
  for (let i = 0; i < times; i++) {
    poses.push(contact);
    if (i < times - 1) poses.push(away);
  }
  poses[poses.length - 1] = { ...contact, hold: 120 };
  return path(poses, options);
}

/** Go round a series of places and back to the first: a circle, a loop. */
export function loop(points: readonly Pose1[], options: PathOptions = {}): Motion {
  return path([...points, points[0]!], options);
}

/** Change handshape in place. */
export function change(at: LocationName, from: Pose1, to: Pose1, options: PathOptions = {}): Motion {
  return path([{ ...from, at, hold: from.hold ?? 70 }, { ...to, at, hold: to.hold ?? 120 }], options);
}

/** Turn the hand over in place, once or back and forth. */
export function twist(
  pose: Pose1, from: OrientationName, to: OrientationName, times = 1, options: PathOptions = {},
): Motion {
  const a: Pose1 = { ...pose, ori: from, hold: 0 };
  const b: Pose1 = { ...pose, ori: to, hold: 0 };
  const poses: Pose1[] = [a];
  for (let i = 0; i < times; i++) poses.push(b, a);
  poses[poses.length - 1] = { ...a, hold: 100 };
  return path(poses, options);
}

export interface DefOptions {
  readonly fidelity?: SignProvenance['fidelity'];
  /** The other hand mirrors or alternates with the dominant one. */
  readonly two?: Symmetry;
  /** The other hand holds this and does not move. */
  readonly base?: Pose1;
  /** The sign is a configuration held in place. */
  readonly held?: boolean;
  readonly note?: string;
}

/** Every authored sign carries the same honest provenance, plus its fidelity. */
function provenance(options: DefOptions): SignProvenance {
  return {
    source: 'hand-authored',
    validation: 'unvalidated',
    note: options.note
      ? `Authored from a written description; not reviewed by a Deaf signer. ${options.note}`
      : 'Authored from a written description; not reviewed by a Deaf signer.',
    fidelity: options.fidelity ?? 'citation',
  };
}

/**
 * Define a sign.
 *
 *   def('MOTHER', 'MOTHER', 'family', 'Thumb taps the chin.',
 *       tap(p('CHIN', 'OPEN_5', 'PALM_ACROSS', 'thumb'), 'NOSE', 2))
 */
export function def(
  id: string,
  gloss: string,
  category: SignCategory,
  description: string,
  motion: Motion,
  options: DefOptions = {},
): SignDefinition {
  const twoWays = [options.two, options.base, motion.other].filter((v) => v !== undefined);
  if (twoWays.length > 1) {
    throw new Error(`Sign "${id}" states its non-dominant hand more than one way`);
  }

  return {
    id, gloss, description, category,
    durationMs: motion.durationMs,
    strokeStartMs: motion.strokeStartMs,
    strokeEndMs: motion.strokeEndMs,
    dominant: motion.dominant,
    ...(motion.other ? { nonDominant: motion.other } : {}),
    ...(options.two ? { symmetry: options.two } : {}),
    ...(options.base ? {
      base: {
        location: options.base.at, handshape: options.base.hs,
        ...(options.base.ori ? { orientation: options.base.ori } : {}),
        ...(options.base.contact ? { contact: options.base.contact } : {}),
      },
    } : {}),
    ...(options.held ? { held: true } : {}),
    provenance: provenance(options),
  };
}

/**
 * Signs that share a movement and differ only in handshape.
 *
 * ASL has whole families of these -- the initialised signs, where one movement
 * is made with the first letter of the English word: FAMILY, GROUP, CLASS, TEAM
 * and ORGANIZATION are one circle with five handshapes. Writing the movement
 * once and the handshapes as data means the family cannot drift apart, and
 * means the vocabulary states the pattern instead of hiding it.
 */
export function family(
  make: (handshape: string) => Motion,
  members: ReadonlyArray<readonly [id: string, gloss: string, handshape: string, description: string]>,
  category: SignCategory,
  options: DefOptions = {},
): SignDefinition[] {
  return members.map(([id, gloss, handshape, description]) =>
    def(id, gloss, category, description, make(handshape), options));
}
