/**
 * Non-manual markers.
 *
 * These are grammar, not decoration. In ASL the face carries sentence type --
 * a yes/no question, a WH question and a statement can share identical hands --
 * and fluent signers watch each other's faces rather than their hands. A
 * text-to-ASL system that treats the face as polish has not translated the
 * sentence.
 *
 * They are also suprasegmental: a question's brow raise covers the whole
 * clause, not one sign. That is why spans live beside the segment list rather
 * than as a property of a segment, and why this layer takes the whole plan.
 *
 * WHAT IS ACTUALLY RENDERED TODAY: head movement only. The placeholder
 * mannequin has no face rig, so brow raise and brow furrow are carried in the
 * data and applied as head tilt, which is a stand-in and not the marker. Real
 * brows need the ARKit blendshape track, which arrives with a real avatar.
 */

import { quatFromEulerDeg, quatMultiply, IDENTITY, type Pose, type Quat } from '@signflow/motion-format';

export type NmmType = 'brow_raise' | 'brow_furrow' | 'headshake';

export interface NmmSpan {
  readonly type: NmmType;
  /** Inclusive segment indices this marker covers. */
  readonly fromIndex: number;
  readonly toIndex: number;
}

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

function headRotation(type: NmmType, amount: number, timeMs: number): Quat {
  switch (type) {
    // Both brow markers are approximated by a head tilt toward the addressee,
    // which is a real part of both but not the marker itself.
    case 'brow_raise':
      return quatFromEulerDeg(7 * amount, 0, 0);
    case 'brow_furrow':
      return quatFromEulerDeg(9 * amount, 0, 0);
    case 'headshake':
      return quatFromEulerDeg(0, 11 * amount * Math.sin((timeMs / 1000) * Math.PI * 3.4), 0);
  }
}

export function applyNonManual(
  pose: Pose,
  segments: readonly SpanTiming[],
  spans: readonly NmmSpan[],
  timeMs: number,
): Pose {
  if (spans.length === 0) return pose;

  let head: Quat = pose.head ?? IDENTITY;
  let applied = false;

  for (const span of spans) {
    const amount = envelope(span, segments, timeMs);
    if (amount <= 0.001) continue;
    head = quatMultiply(head, headRotation(span.type, amount, timeMs));
    applied = true;
  }

  return applied ? { ...pose, head } : pose;
}
