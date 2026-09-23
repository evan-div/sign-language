/**
 * Non-manual markers.
 *
 * These are grammar, not decoration. In ASL the face carries sentence type --
 * a yes/no question, a WH question and a statement can share identical hands --
 * and fluent signers watch each other's faces rather than their hands. A
 * text-to-ASL system that treats the face as polish has not translated the
 * sentence.
 *
 * They are also suprasegmental: a question's brow raise covers a clause, not
 * one sign. That is why spans live beside the segment list rather than as a
 * property of a segment, and why this layer takes the whole plan.
 *
 * ## Named for what they do
 *
 * A marker is a bundle -- a yes/no question is raised brows AND widened eyes
 * AND the head forward -- so naming them by articulation ("brow_raise") named
 * one strand of a rope and left the rest unaccounted for. They are named for
 * their grammatical function now, and the articulation is a table below that
 * can be argued with or replaced without renaming anything.
 *
 * ## What is rendered
 *
 * Brows, eyes, mouth and head, all of them. Before Milestone 7 the face channel
 * did not exist and every marker was approximated by a head tilt, so the one
 * part of ASL grammar that most needs to be seen could not be seen at all.
 */

import {
  quatFromEulerDeg, quatMultiply, composeFaces, scaleFace, IDENTITY,
  type FacePose, type Pose, type Quat,
} from '@signflow/motion-format';

export type NmmType =
  | 'yes_no_question'
  | 'wh_question'
  | 'topic'
  | 'conditional'
  | 'negation'
  | 'affirmation';

export interface NmmSpan {
  readonly type: NmmType;
  /** Inclusive segment indices this marker covers. */
  readonly fromIndex: number;
  readonly toIndex: number;
}

export interface NmmSpec {
  /** What the marker means, in grammar terms. */
  readonly description: string;
  /** How it is articulated on the face, at full strength. */
  readonly face: FacePose;
  /**
   * Which way this marker moves the brows, and whether that part of it can
   * yield.
   *
   * Two markers can legitimately overlap and want the brows in opposite
   * places: "if it is not good, I stop" is a conditional, which raises them,
   * containing a negation, which lowers them. A signer does not compromise --
   * the brows stay up for the conditional and the negation is carried by the
   * headshake, which is its obligatory part anyway. So a marker says which
   * direction it pulls, and a `down` marker gives up its brows to an `up` one.
   */
  readonly brows: 'up' | 'down' | 'none';
  /** Steady head rotation, in XYZ Euler degrees at full strength. */
  readonly head?: readonly [number, number, number];
  /** Oscillation: axis, amplitude in degrees, and cycles per second. */
  readonly oscillate?: { readonly axis: 'pitch' | 'yaw' | 'roll'; readonly degrees: number; readonly hz: number };
}

/**
 * The articulations.
 *
 * Two things they have to get right. First, a yes/no question and a WH question
 * must differ in the DIRECTION the brows move, not in how far: raised versus
 * lowered is the contrast ASL uses, and two markers separated only by magnitude
 * would be unreadable. Second, topic and conditional are both brow raises and
 * are told apart by the head -- back for a topic, tilted for a conditional --
 * which is why the head is part of the bundle rather than a separate marker.
 */
export const NMM_SPECS: Readonly<Record<NmmType, NmmSpec>> = Object.freeze({
  yes_no_question: {
    brows: 'up',
    description: 'Yes/no question: brows up, eyes widened, head forward.',
    face: {
      browInnerUp: 0.85, browOuterUpLeft: 0.9, browOuterUpRight: 0.9,
      eyeWideLeft: 0.5, eyeWideRight: 0.5,
    },
    head: [8, 0, 0],
  },
  wh_question: {
    brows: 'down',
    description: 'WH question: brows down and drawn together, eyes narrowed, head forward.',
    face: {
      browDownLeft: 0.9, browDownRight: 0.9,
      eyeSquintLeft: 0.45, eyeSquintRight: 0.45,
    },
    head: [10, 0, 0],
  },
  topic: {
    brows: 'up',
    description: 'Topic marker: brows up, head back, on the fronted phrase only.',
    face: { browInnerUp: 0.75, browOuterUpLeft: 0.8, browOuterUpRight: 0.8 },
    head: [-6, 0, 0],
  },
  conditional: {
    brows: 'up',
    description: 'Conditional clause: brows up, head tilted to one side.',
    face: { browInnerUp: 0.7, browOuterUpLeft: 0.75, browOuterUpRight: 0.75 },
    head: [0, 0, 9],
  },
  negation: {
    brows: 'down',
    description: 'Negation: head shaken, brows drawn down, mouth turned down.',
    face: {
      browDownLeft: 0.5, browDownRight: 0.5,
      mouthFrownLeft: 0.45, mouthFrownRight: 0.45,
    },
    oscillate: { axis: 'yaw', degrees: 11, hz: 1.7 },
  },
  affirmation: {
    brows: 'none',
    description: 'Affirmation: head nodded, lips pressed.',
    face: { mouthPressLeft: 0.4, mouthPressRight: 0.4 },
    oscillate: { axis: 'pitch', degrees: 7, hz: 1.7 },
  },
});

interface SpanTiming {
  readonly strokeStartMs: number;
  readonly strokeEndMs: number;
  readonly index: number;
  readonly transitionInMs: number;
}

/** Markers ramp in before their first sign and out after their last. */
const RAMP_MS = 200;

function envelope(span: NmmSpan, segments: readonly SpanTiming[], timeMs: number): number {
  const from = segments.find((s) => s.index === span.fromIndex);
  const to = segments.find((s) => s.index === span.toIndex);
  if (!from || !to) return 0;

  const start = from.strokeStartMs - Math.min(RAMP_MS, from.transitionInMs);
  const end = to.strokeEndMs;
  if (timeMs <= start - RAMP_MS || timeMs >= end + RAMP_MS) return 0;

  if (timeMs < start) return smooth((timeMs - (start - RAMP_MS)) / RAMP_MS);
  if (timeMs > end) return smooth(1 - (timeMs - end) / RAMP_MS);
  return 1;
}

function smooth(t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function headRotation(spec: NmmSpec, amount: number, timeMs: number): Quat {
  let q: Quat = IDENTITY;
  if (spec.head) {
    q = quatMultiply(q, quatFromEulerDeg(
      spec.head[0] * amount, spec.head[1] * amount, spec.head[2] * amount));
  }
  if (spec.oscillate) {
    const { axis, degrees, hz } = spec.oscillate;
    const swing = degrees * amount * Math.sin((timeMs / 1000) * Math.PI * 2 * hz);
    q = quatMultiply(q, quatFromEulerDeg(
      axis === 'pitch' ? swing : 0,
      axis === 'yaw' ? swing : 0,
      axis === 'roll' ? swing : 0,
    ));
  }
  return q;
}

/** The same marker with its brow channels dropped. */
function withoutBrows(face: FacePose): FacePose {
  const out: Record<string, number> = {};
  for (const [channel, weight] of Object.entries(face)) {
    if (!channel.startsWith('brow') && weight !== undefined) out[channel] = weight;
  }
  return out as FacePose;
}

export interface NonManualResult {
  readonly pose: Pose;
  readonly face: FacePose;
}

/**
 * Layer every active marker onto a pose.
 *
 * Head rotations multiply, because a head can only be in one place and two
 * markers both moving it have to agree on where. Face weights take the
 * strongest of each channel instead -- see composeFaces for why those two rules
 * are different on purpose.
 */
export function applyNonManual(
  pose: Pose,
  segments: readonly SpanTiming[],
  spans: readonly NmmSpan[],
  timeMs: number,
): NonManualResult {
  if (spans.length === 0) return { pose, face: {} };

  const active = spans
    .map((span) => ({ span, amount: envelope(span, segments, timeMs) }))
    .filter((a) => a.amount > 0.001);
  if (active.length === 0) return { pose, face: {} };

  // A raised brow outranks a lowered one where both are asked for; see the
  // note on NmmSpec.brows.
  const raised = active.some((a) => NMM_SPECS[a.span.type].brows === 'up');

  let head: Quat = pose.head ?? IDENTITY;
  const faces: FacePose[] = [];

  for (const { span, amount } of active) {
    const spec = NMM_SPECS[span.type];
    head = quatMultiply(head, headRotation(spec, amount, timeMs));
    const face = raised && spec.brows === 'down' ? withoutBrows(spec.face) : spec.face;
    faces.push(scaleFace(face, amount));
  }

  return { pose: { ...pose, head }, face: composeFaces(...faces) };
}

/** The markers active at a time, for the interface to name them. */
export function activeNonManual(
  segments: readonly SpanTiming[],
  spans: readonly NmmSpan[],
  timeMs: number,
): NmmType[] {
  return spans.filter((span) => envelope(span, segments, timeMs) > 0.25).map((span) => span.type);
}
