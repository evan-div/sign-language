/**
 * Desugaring a sign into its explicit form.
 *
 * Everything downstream -- the compiler, the sequencer, the linter, the JSON
 * export -- works on signs that have an explicit non-dominant track and no
 * repetition. This is the one place that knows about the shorthands, which
 * keeps them from leaking into six other files and means "does the sugar mean
 * what it says" is a question one test can answer.
 */

import type { Repeat, SignDefinition, SignKeyframe } from './definition.js';

/** Expanding is pure and called per compile, so remember the answers. */
const cache = new WeakMap<SignDefinition, SignDefinition>();

/**
 * Play the interval [fromMs, toMs] `times` times over.
 *
 * Keyframes after the interval shift later by the added time, and so do the
 * duration and the stroke end. A repeat only reads as one movement if the pose
 * at the end of the cycle is the pose at its start; that is not enforced here,
 * because a keyframe list cannot be wrong in a way the compiler can catch --
 * it is checked by the linter, which can say which sign and by how much.
 */
function applyRepeat(track: readonly SignKeyframe[], repeat: Repeat): SignKeyframe[] {
  const { fromMs, toMs, times } = repeat;
  const cycle = toMs - fromMs;
  const added = cycle * (times - 1);

  const out: SignKeyframe[] = track.filter((k) => k.atMs <= fromMs).map((k) => ({ ...k }));
  const body = track.filter((k) => k.atMs > fromMs && k.atMs <= toMs);

  // Copy 0 is the cycle as written, at its own times; the rest follow it. The
  // cycle's start keyframe is not re-emitted at each seam, because the previous
  // copy's final keyframe already sits there.
  for (let copy = 0; copy < times; copy++) {
    for (const k of body) out.push({ ...k, atMs: k.atMs + cycle * copy });
  }
  for (const k of track.filter((k) => k.atMs > toMs)) out.push({ ...k, atMs: k.atMs + added });

  return out.sort((a, b) => a.atMs - b.atMs);
}

/** The same track played backwards in time, keeping the same duration. */
function reverseInTime(track: readonly SignKeyframe[], durationMs: number): SignKeyframe[] {
  return track
    .map((k) => ({ ...k, atMs: durationMs - k.atMs }))
    .sort((a, b) => a.atMs - b.atMs);
}

export function expandSign(sign: SignDefinition): SignDefinition {
  const cached = cache.get(sign);
  if (cached) return cached;

  const ways = [sign.nonDominant !== undefined, sign.symmetry !== undefined, sign.base !== undefined];
  if (ways.filter(Boolean).length > 1) {
    throw new Error(`Sign "${sign.id}" states its non-dominant hand more than one way`);
  }
  if (sign.repeat) {
    const { fromMs, toMs, times } = sign.repeat;
    if (!(toMs > fromMs)) throw new Error(`Sign "${sign.id}" repeats an empty interval`);
    if (!Number.isInteger(times) || times < 2) {
      throw new Error(`Sign "${sign.id}" repeats ${times} times; 2 or more was meant`);
    }
    if (fromMs < 0 || toMs > sign.durationMs) {
      throw new Error(`Sign "${sign.id}" repeats an interval outside its duration`);
    }
  }

  const added = sign.repeat ? (sign.repeat.toMs - sign.repeat.fromMs) * (sign.repeat.times - 1) : 0;
  const durationMs = sign.durationMs + added;

  const dominant = sign.repeat ? applyRepeat(sign.dominant, sign.repeat) : [...sign.dominant];

  let nonDominant: SignKeyframe[] | undefined;
  if (sign.base) {
    nonDominant = [{ ...sign.base, atMs: 0 }, { ...sign.base, atMs: durationMs }];
  } else if (sign.symmetry === 'mirror') {
    nonDominant = dominant.map((k) => ({ ...k }));
  } else if (sign.symmetry === 'alternate') {
    nonDominant = reverseInTime(dominant, durationMs);
  } else if (sign.nonDominant) {
    nonDominant = sign.repeat ? applyRepeat(sign.nonDominant, sign.repeat) : [...sign.nonDominant];
  }

  // Times at or after the end of the repeated interval move later by the time
  // the extra cycles added; times inside or before it are where they were.
  const shift = (t: number) => (sign.repeat && t >= sign.repeat.toMs ? t + added : t);

  const { symmetry: _s, base: _b, repeat: _r, ...rest } = sign;
  const expanded: SignDefinition = {
    ...rest,
    durationMs,
    strokeStartMs: shift(sign.strokeStartMs),
    strokeEndMs: shift(sign.strokeEndMs),
    dominant,
    ...(nonDominant ? { nonDominant } : {}),
  };

  cache.set(sign, expanded);
  return expanded;
}
