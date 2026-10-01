/**
 * Mechanical checks over the sign library.
 *
 * At twenty signs a person can watch every one. At a hundred they cannot, and
 * the failure mode is not that a sign looks slightly off -- it is that a hand
 * ends up inside the head, or two signs come out as the same motion, and nobody
 * notices for a month. Everything here is a property that can be decided from
 * geometry, so it can be decided for every sign on every commit.
 *
 * WHAT THIS CANNOT CHECK is the only thing that finally matters: whether a sign
 * means what it claims to mean. No amount of geometry will catch a sign that is
 * fluent, smooth, well separated and simply not the ASL for the word. That
 * needs a Deaf reviewer, and until one has looked, every entry stays
 * `unvalidated` no matter how clean this report is.
 */

import {
  solveFK, jointPosition, jointRotation, tipPosition, quatRotateVec3, vec3Distance,
  sampleClip, penetrationDepth, PENETRATION_TOLERANCE, type Pose, type Vec3,
} from '@signflow/motion-format';
import { SIGNS } from './library.js';
import { compileSign } from './compile.js';
import { expandSign } from './expand.js';
import { isTwoHanded, type SignDefinition, type SignKeyframe } from './definition.js';
import { SOLVED_LOCATIONS } from './locations.generated.js';
import { ORIENTATIONS } from './orientation.js';
import { SIGN_HANDSHAPES } from '../handshapes/sign-shapes.js';
import { letterSpec } from '../handshapes/letters.js';
import { contactOffset } from './reach.js';
import { REST_POSTURE } from '../postures.js';
import { LEXICON } from '../lexicon/entries.js';

export type Severity = 'error' | 'warning';

export interface Finding {
  readonly severity: Severity;
  readonly check: string;
  readonly signId: string;
  readonly message: string;
  /** The measured quantity, so a threshold argument has a number to be about. */
  readonly value?: number;
}

const CONTACT_POINTS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;

/** Every fingertip and wrist, for both hands. */
function probePoints(pose: Pose): Array<[string, Vec3]> {
  const s = solveFK(pose);
  const out: Array<[string, Vec3]> = [];
  for (const side of ['right', 'left'] as const) {
    out.push([`${side}_wrist`, jointPosition(s, `${side}_wrist`)]);
    for (const f of CONTACT_POINTS) out.push([`${side}_${f}_tip`, tipPosition(s, `${side}_${f}_tip`)]);
  }
  return out;
}

/** Fingertips of both hands: a signature of the whole body pose. */
export function poseSignature(pose: Pose): number[] {
  const s = solveFK(pose);
  return CONTACT_POINTS.flatMap((f) => [
    ...tipPosition(s, `right_${f}_tip`), ...tipPosition(s, `left_${f}_tip`),
  ]);
}

export function signatureDistance(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(...a.map((v, i) => v - b[i]!));
}

/** Signs closer than this are the same picture, whatever their parameters say. */
const INDISTINGUISHABLE = 0.01;

/** Peak wrist travel in one 20ms step that warrants a warning: 2.2 m/s. */
const PEAK_STEP_WARNING = 0.044;

const REST_LEFT_WRIST = jointPosition(solveFK(REST_POSTURE), 'left_wrist');
const REST_RIGHT_WRIST = jointPosition(solveFK(REST_POSTURE), 'right_wrist');

function knownHandshape(id: string): boolean {
  return letterSpec(id) !== undefined || SIGN_HANDSHAPES[id] !== undefined;
}

function resolveHandshape(id: string) {
  const spec = letterSpec(id) ?? SIGN_HANDSHAPES[id];
  if (!spec) throw new Error(`Unknown handshape "${id}"`);
  return spec;
}

/** Sample a compiled clip at a fixed step, for the checks that need motion. */
function frames(sign: SignDefinition, stepMs = 20): Array<{ timeMs: number; pose: Pose }> {
  const clip = compileSign(sign);
  const out = [];
  for (let t = 0; t <= clip.durationMs; t += stepMs) out.push({ timeMs: t, pose: sampleClip(clip, t) });
  return out;
}

export function lintSign(sign: SignDefinition): Finding[] {
  const found: Finding[] = [];
  const add = (severity: Severity, check: string, message: string, value?: number) =>
    found.push({ severity, check, signId: sign.id, message, ...(value === undefined ? {} : { value }) });

  let expanded: SignDefinition;
  try {
    expanded = expandSign(sign);
  } catch (error) {
    add('error', 'notation', (error as Error).message);
    return found;
  }

  // --- names -------------------------------------------------------------
  const tracks = [expanded.dominant, expanded.nonDominant ?? []];
  for (const track of tracks) {
    for (const k of track) {
      if (!knownHandshape(k.handshape)) add('error', 'handshape', `unknown handshape "${k.handshape}"`);
      if (!(k.location in SOLVED_LOCATIONS)) add('error', 'location', `unknown location "${k.location}"`);
      if (k.orientation && !(k.orientation in ORIENTATIONS)) {
        add('error', 'orientation', `unknown orientation "${k.orientation}"`);
      }
    }
  }

  // --- timing ------------------------------------------------------------
  for (const [name, track] of [['dominant', expanded.dominant], ['non-dominant', expanded.nonDominant]] as const) {
    if (!track || track.length === 0) continue;
    for (let i = 1; i < track.length; i++) {
      if (track[i]!.atMs <= track[i - 1]!.atMs) {
        add('error', 'timing', `${name} keyframes are not in increasing time order at ${track[i]!.atMs}ms`);
      }
    }
    if (track[0]!.atMs !== 0) add('warning', 'timing', `${name} track starts at ${track[0]!.atMs}ms, not 0`);
    const end = track[track.length - 1]!.atMs;
    if (end !== expanded.durationMs) {
      add('warning', 'timing', `${name} track ends at ${end}ms but the sign is ${expanded.durationMs}ms`);
    }
  }
  if (expanded.strokeStartMs < 0 || expanded.strokeEndMs > expanded.durationMs) {
    add('error', 'timing', 'the stroke falls outside the sign');
  }
  if (expanded.strokeEndMs <= expanded.strokeStartMs) add('error', 'timing', 'the stroke is empty');

  // --- repetition --------------------------------------------------------
  // A repeat only reads as one movement if the cycle returns to where it began.
  if (sign.repeat) {
    // Sampled from the sign WITHOUT its repeat. In the expanded clip those two
    // times no longer bracket one cycle -- everything after the interval has
    // shifted by the added copies -- so comparing them there compares the seam
    // against the middle of the next cycle and reports a gap for every
    // repeating sign, which is how this was caught.
    const { repeat: _dropped, ...once } = sign;
    const clip = compileSign(once);
    const gap = signatureDistance(
      poseSignature(sampleClip(clip, sign.repeat.fromMs)),
      poseSignature(sampleClip(clip, sign.repeat.toMs)),
    );
    if (gap > 0.04) {
      add('error', 'repeat', `the repeated cycle does not return to its start (${(gap * 100).toFixed(1)}cm)`, gap);
    }
  }

  // --- contact sites land where they were aimed --------------------------
  // Reported once per distinct (site, place, miss): a mirrored or repeating
  // sign visits the same pose many times and used to report it every time,
  // which made a hundred signs look like three hundred problems.
  const reported = new Set<string>();
  for (const track of tracks) {
    for (const k of track) {
      const site = k.contact ?? 'wrist';
      if (site === 'wrist') continue;
      if (!knownHandshape(k.handshape) || !(k.location in SOLVED_LOCATIONS)) continue;
      const pose = compileSign({
        ...sign, id: `${sign.id}-probe`, durationMs: 1, strokeStartMs: 0, strokeEndMs: 1,
        dominant: [{ ...k, atMs: 0 }], nonDominant: undefined, symmetry: undefined,
        base: undefined, repeat: undefined,
      }).keyframes[0]!.pose;
      const s = solveFK(pose);
      const offset = contactOffset(resolveHandshape(k.handshape), site);
      const point = site === 'palm' || site === 'knuckles'
        ? vecAdd(jointPosition(s, 'right_wrist'), rotatedOffset(pose, offset))
        : tipPosition(s, `right_${site}_tip`);
      const err = vec3Distance(point, SOLVED_LOCATIONS[k.location].target as Vec3);
      if (err > 0.02) {
        const message = `${site} lands ${(err * 100).toFixed(1)}cm from ${k.location}`;
        if (!reported.has(message)) {
          reported.add(message);
          add('warning', 'reach', message, err);
        }
      }
    }
  }

  // --- geometry over the whole clip --------------------------------------
  const sampled = frames(sign);
  let worstPenetration = { depth: -1, where: '', at: 0 };
  let worstHandGap = { gap: Infinity, at: 0 };
  let worstStep = { step: 0, joint: '', at: 0 };
  let worstRestDrift = { drift: 0, at: 0 };
  let worstElbowRise = { rise: -Infinity, overWrist: 0, side: 'right', at: 0 };
  let worstElbowClearance = { clearance: Infinity, side: 'right', at: 0 };
  let travel = 0;

  let previous: number[] | undefined;
  let previousSolved: ReturnType<typeof solveFK> | undefined;
  for (const { timeMs, pose } of sampled) {
    for (const [where, p] of probePoints(pose)) {
      const depth = penetrationDepth(p);
      if (depth > worstPenetration.depth) worstPenetration = { depth, where, at: timeMs };
    }

    const solved = solveFK(pose);
    if (isTwoHanded(sign)) {
      const gap = vec3Distance(jointPosition(solved, 'right_wrist'), jointPosition(solved, 'left_wrist'));
      if (gap < worstHandGap.gap) worstHandGap = { gap, at: timeMs };
    } else {
      const drift = vec3Distance(jointPosition(solved, 'left_wrist'), REST_LEFT_WRIST);
      if (drift > worstRestDrift.drift) worstRestDrift = { drift, at: timeMs };
    }

    // A "broken arm" is the elbow riding up to the shoulder, not the elbow
    // sitting a little above a low wrist, which is what a real forearm does.
    for (const side of ['right', 'left'] as const) {
      const elbow = jointPosition(solved, `${side}_elbow`);
      const shoulder = jointPosition(solved, `${side}_shoulder`);
      const rise = elbow[1] - shoulder[1];
      const wrist = jointPosition(solved, `${side}_wrist`);
      if (rise > worstElbowRise.rise) {
        worstElbowRise = { rise, overWrist: elbow[1] - wrist[1], side, at: timeMs };
      }
      const clearance = Math.abs(elbow[0]);
      if (clearance < worstElbowClearance.clearance) worstElbowClearance = { clearance, side, at: timeMs };
    }

    const signature = poseSignature(pose);
    if (previous) travel += signatureDistance(signature, previous);
    if (previousSolved) {
      for (const joint of ['right_wrist', 'left_wrist']) {
        const step = vec3Distance(jointPosition(previousSolved, joint), jointPosition(solved, joint));
        if (step > worstStep.step) worstStep = { step, joint, at: timeMs };
      }
    }
    previous = signature;
    previousSolved = solved;
  }

  if (worstPenetration.depth > PENETRATION_TOLERANCE) {
    add('error', 'body', `${worstPenetration.where} is ${(worstPenetration.depth * 100).toFixed(1)}cm inside the body at ${worstPenetration.at}ms`, worstPenetration.depth);
  }
  if (worstRestDrift.drift > 1e-6) {
    add('error', 'one-handed', `the non-dominant hand leaves rest (${(worstRestDrift.drift * 100).toFixed(1)}cm at ${worstRestDrift.at}ms) in a one-handed sign`, worstRestDrift.drift);
  }
  // A broken arm is the elbow up at the shoulder WHILE the hand is low. The
  // elbow above the shoulder on its own is just a hand held high, which is how
  // the solver reaches the forehead and above the head, and flagging it here
  // contradicted the cost function the arms are solved with.
  if (worstElbowRise.rise > -0.04 && worstElbowRise.overWrist > 0) {
    add('warning', 'elbow', `${worstElbowRise.side} elbow rides up past both the shoulder and the hand at ${worstElbowRise.at}ms`, worstElbowRise.rise);
  }
  if (worstElbowClearance.clearance < 0.11) {
    add('warning', 'elbow', `${worstElbowClearance.side} elbow passes through the torso at ${worstElbowClearance.at}ms (${(worstElbowClearance.clearance * 100).toFixed(1)}cm out)`, worstElbowClearance.clearance);
  }
  // Two thresholds, because there are two situations. A MIRRORED or ALTERNATING
  // pair has two hands placed independently, so wrists within 7cm means they
  // overlap, and that is always a mistake. A sign with a BASE hand has one hand
  // that the other is meant to touch -- one finger sliding along another, a
  // palm laid on a palm -- so contact is the point and only coincidence is a
  // fault. Applying 7cm to both flagged MONTH, whose fingertips are 1.3cm apart
  // on purpose.
  const handGap = sign.base || (sign.nonDominant && !sign.symmetry) ? 0.04 : 0.07;
  if (isTwoHanded(sign) && worstHandGap.gap < handGap) {
    add('warning', 'hands', `the wrists come within ${(worstHandGap.gap * 100).toFixed(1)}cm at ${worstHandGap.at}ms`, worstHandGap.gap);
  }
  if (sign.held) {
    // A held sign does not travel, so the question is whether it is presented
    // at all: a hand still at rest is a sign that did not happen.
    const middle = sampled[Math.floor(sampled.length / 2)];
    const raised = middle
      ? vec3Distance(jointPosition(solveFK(middle.pose), 'right_wrist'), REST_RIGHT_WRIST)
      : 0;
    if (raised < 0.15) {
      add('error', 'motion', `is held, but the hand never leaves rest (${(raised * 100).toFixed(1)}cm)`, raised);
    }
  } else if (travel < 0.05) {
    add('error', 'motion', `barely moves (${(travel * 100).toFixed(1)}cm of fingertip travel)`, travel);
  }
  // Calibrated, not guessed, and RE-calibrated when what it measures changed.
  //
  // At Milestone 6 this was 1.8 m/s: 1.27 times the 90th percentile (1.42) of
  // peak wrist speed across the first hundred signs. At Milestone 8 it was
  // found that those signs had never been eased -- they moved at constant joint
  // speed -- and once easing took effect the same signs, at the same average
  // speeds, measured median 1.14 and p90 1.71. Easing concentrates a movement
  // in its middle, so peaks rise without anything having become faster on
  // average. The same rule (1.27 x p90) on the new distribution gives 2.2.
  //
  // This is a recalibration forced by a change in meaning, not a loosening to
  // make warnings go away, and it can be checked: the signs that were fastest
  // before are still the ones flagged.
  if (worstStep.step > PEAK_STEP_WARNING) {
    add('warning', 'speed', `${worstStep.joint} reaches ${(worstStep.step / 0.02).toFixed(1)} m/s at ${worstStep.at}ms`, worstStep.step / 0.02);
  }

  return found;
}

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** The world-space offset from the wrist to a non-tip contact site. */
function rotatedOffset(pose: Pose, offsetLocal: Vec3): Vec3 {
  return quatRotateVec3(jointRotation(solveFK(pose), 'right_wrist'), offsetLocal);
}

/** The parameters ASL phonology describes a sign by, plus how many hands. */
export type Parameter =
  | 'handshape' | 'location' | 'orientation' | 'contact' | 'movement' | 'hands' | 'other-hand';

export interface Collision {
  readonly a: string;
  readonly b: string;
  readonly distance: number;
  /**
   * The parameters in which the two signs differ. Empty means they are the
   * same sign under two names.
   */
  readonly differs: readonly Parameter[];
}

/** One configuration of a hand, as a string that is equal when the poses are. */
const tuple = (k: SignKeyframe) =>
  [k.location, k.handshape, k.orientation ?? 'PALM_OUT', k.contact ?? 'wrist'].join('|');

/** Consecutive repeats collapsed: the places the hand WENT, not how long it stayed. */
function visited(track: readonly SignKeyframe[]): string[] {
  const out: string[] = [];
  for (const k of track) {
    const t = tuple(k);
    if (out[out.length - 1] !== t) out.push(t);
  }
  return out;
}

/** Which of the (location, handshape, orientation, contact) fields differ between two tuples. */
function fieldsDiffering(a: string, b: string): Parameter[] {
  const [al, ah, ao, ac] = a.split('|');
  const [bl, bh, bo, bc] = b.split('|');
  const out: Parameter[] = [];
  if (ah !== bh) out.push('handshape');
  if (al !== bl) out.push('location');
  if (ao !== bo) out.push('orientation');
  if (ac !== bc) out.push('contact');
  return out;
}

/**
 * How two signs differ, in the terms ASL itself uses.
 *
 * This is the other half of distinctness. The geometric check says two signs
 * LOOK close; this says WHY, and whether they are really the same sign. They
 * are different questions. At five hundred signs a pure distance threshold
 * starts to fire on genuine minimal pairs -- ASL has plenty that differ in a
 * single parameter, and several of the initialised families differ only in
 * handshape -- and an error that cannot tell those apart from an accidental
 * duplicate would teach its author to ignore it.
 *
 * An empty answer means every parameter matches. That is not a minimal pair, it
 * is one sign with two names, and the right model for it is one sign with two
 * senses in the lexicon.
 */
export function phonologicalDifference(a: SignDefinition, b: SignDefinition): Parameter[] {
  const ea = expandSign(a);
  const eb = expandSign(b);
  const out = new Set<Parameter>();

  if (isTwoHanded(a) !== isTwoHanded(b)) out.add('hands');

  const va = visited(ea.dominant);
  const vb = visited(eb.dominant);
  if (va.length !== vb.length) {
    out.add('movement');
  } else {
    va.forEach((t, i) => { for (const f of fieldsDiffering(t, vb[i]!)) out.add(f); });
  }

  if (isTwoHanded(a) && isTwoHanded(b)) {
    const oa = visited(ea.nonDominant ?? []);
    const ob = visited(eb.nonDominant ?? []);
    if (oa.length !== ob.length || oa.some((t, i) => t !== ob[i])) out.add('other-hand');
  }

  return [...out];
}

/** How many points along the stroke a trajectory signature samples. */
const TRAJECTORY_SAMPLES = 5;

/**
 * A sign's whole stroke as one vector: fingertips at five points through it.
 *
 * Not the middle of the stroke, which is what this compared first and which
 * cannot see direction. GO and COME are the same hands in the same place and
 * differ only in which way they travel, so at the midpoint they measured 2.2cm
 * apart and read as the same sign. ASL distinguishes plenty of pairs by
 * direction alone, so a check that cannot see it would have been quietly
 * useless for exactly the signs it most needed to judge.
 *
 * Divided by the sample count so the number keeps meaning "how far apart these
 * two signs are, on average, in metres" whatever the sample count is.
 */
export function trajectorySignature(sign: SignDefinition): number[] {
  const clip = compileSign(sign);
  const from = clip.strokeStartMs ?? 0;
  const to = clip.strokeEndMs ?? clip.durationMs;
  const out: number[] = [];
  for (let i = 0; i < TRAJECTORY_SAMPLES; i++) {
    const t = from + ((to - from) * i) / (TRAJECTORY_SAMPLES - 1);
    out.push(...poseSignature(sampleClip(clip, t)));
  }
  return out;
}

export function trajectoryDistance(a: readonly number[], b: readonly number[]): number {
  return signatureDistance(a, b) / Math.sqrt(TRAJECTORY_SAMPLES);
}

/**
 * Pairs of signs that compile to nearly the same motion.
 *
 * Two signs closer than the threshold are not two signs: whatever the lexicon
 * says, the avatar is showing the user the same thing twice.
 */
export function findCollisions(threshold = 0.03): Collision[] {
  const ids = Object.keys(SIGNS);
  const paths = new Map<string, number[]>();
  for (const id of ids) paths.set(id, trajectorySignature(SIGNS[id]!));
  const out: Collision[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const d = trajectoryDistance(paths.get(ids[i]!)!, paths.get(ids[j]!)!);
      if (d < threshold) {
        out.push({
          a: ids[i]!, b: ids[j]!, distance: d,
          differs: phonologicalDifference(SIGNS[ids[i]!]!, SIGNS[ids[j]!]!),
        });
      }
    }
  }
  return out.sort((x, y) => x.distance - y.distance);
}

/** Signs and lexicon entries that do not line up. */
export function lintLexicon(): Finding[] {
  const found: Finding[] = [];
  // A compound reaches every sign in it, so a component such as GRAND, which has
  // no English word of its own, is reachable through "grandmother".
  const reachable = new Set(LEXICON.flatMap((e) => [e.signId, ...(e.then ?? [])]));
  for (const entry of LEXICON) {
    for (const id of [entry.signId, ...(entry.then ?? [])]) {
      if (!(id in SIGNS)) {
        found.push({ severity: 'error', check: 'lexicon', signId: id,
          message: `lemma "${entry.lemma}" points at a sign that does not exist` });
      }
    }
  }
  for (const id of Object.keys(SIGNS)) {
    if (!reachable.has(id)) {
      found.push({ severity: 'warning', check: 'lexicon', signId: id,
        message: 'no English lemma reaches this sign' });
    }
  }
  const glosses = new Map<string, string>();
  for (const [id, sign] of Object.entries(SIGNS)) {
    const seen = glosses.get(sign.gloss);
    if (seen) {
      found.push({ severity: 'warning', check: 'gloss', signId: id,
        message: `shares the gloss "${sign.gloss}" with ${seen}` });
    } else glosses.set(sign.gloss, id);
  }
  return found;
}

/**
 * Checks on a translated plan rather than on a sign.
 *
 * Non-manual markers are the part of this system with no geometry to check, so
 * they need their own rules: a marker that points at a segment which does not
 * exist renders as nothing, and a sentence that is somehow both a yes/no
 * question and a WH question would have the brows going two ways at once.
 * Neither can be caught by looking at hands.
 */
export function lintPlan(plan: {
  readonly source: string;
  readonly segments: readonly { readonly index: number }[];
  readonly nmmSpans: readonly { readonly type: string; readonly fromIndex: number; readonly toIndex: number }[];
}): Finding[] {
  const found: Finding[] = [];
  const add = (check: string, message: string) =>
    found.push({ severity: 'error', check, signId: plan.source, message });

  const last = plan.segments.length - 1;
  for (const span of plan.nmmSpans) {
    if (span.fromIndex < 0 || span.toIndex > last) {
      add('nmm', `${span.type} spans ${span.fromIndex}..${span.toIndex}, outside 0..${last}`);
    }
    if (span.fromIndex > span.toIndex) {
      add('nmm', `${span.type} ends before it starts (${span.fromIndex}..${span.toIndex})`);
    }
  }

  // Two markers that move the brows opposite ways. Not an error: the renderer
  // resolves it by letting the raise win, which is what a signer does. Worth
  // saying out loud, because which one wins is a linguistic claim.
  const raises = plan.nmmSpans.filter((s) => s.type === 'yes_no_question' || s.type === 'topic' || s.type === 'conditional');
  const lowers = plan.nmmSpans.filter((s) => s.type === 'wh_question' || s.type === 'negation');
  for (const up of raises) {
    for (const down of lowers) {
      if (up.fromIndex <= down.toIndex && down.fromIndex <= up.toIndex) {
        found.push({
          severity: 'warning', check: 'nmm', signId: plan.source,
          message: `${up.type} and ${down.type} overlap; the brows follow ${up.type} and `
            + `${down.type} keeps its head movement`,
        });
      }
    }
  }

  return found;
}

export function lintLibrary(): Finding[] {
  const found: Finding[] = [];
  for (const sign of Object.values(SIGNS)) found.push(...lintSign(sign));
  found.push(...lintLexicon());
  for (const c of findCollisions()) {
    const cm = `${(c.distance * 100).toFixed(1)}cm`;
    if (c.differs.length === 0) {
      // Every parameter matches: one sign under two names.
      found.push({ severity: 'error', check: 'distinct', signId: c.a,
        message: `is identical to ${c.b} in every parameter; make it one sign with two senses`,
        value: c.distance });
    } else if (c.distance < INDISTINGUISHABLE) {
      // Different on paper, the same on screen.
      found.push({ severity: 'error', check: 'distinct', signId: c.a,
        message: `differs from ${c.b} only in ${c.differs.join(', ')}, and that is ${cm} on screen `
          + 'and cannot be told apart', value: c.distance });
    } else {
      found.push({ severity: 'warning', check: 'near', signId: c.a,
        message: `is close to ${c.b} (${cm}), differing in ${c.differs.join(', ')}`,
        value: c.distance });
    }
  }
  return found;
}
