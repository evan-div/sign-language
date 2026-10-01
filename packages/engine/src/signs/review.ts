/**
 * Review: how a sign gets from `unvalidated` to anything else.
 *
 * Every authored sign in this library was written by someone who is not a
 * fluent signer, and the only thing that can change that is a fluent signer
 * looking at it. This module is the contract for what that looks like, so that
 * "someone should review this" is a workflow with an input format and not a
 * sentence in a README.
 *
 * Three rules follow from the project's honesty requirement, and each is
 * enforced in code rather than in convention:
 *
 *  1. ONLY A CREDENTIALED VERDICT UPGRADES A SIGN. A hearing learner's opinion,
 *     or the author's, is recorded but never moves a sign out of `unvalidated`.
 *  2. AN `incorrect` VERDICT ALWAYS WINS. It cannot be outvoted by any number of
 *     `correct` ones, because a sign one fluent signer says is wrong is a sign
 *     that is wrong for somebody, and the interface must go on saying so.
 *  3. `expert-validated` NEEDS TWO. One reviewer can make a sign `reviewed`;
 *     agreement between two independent fluent reviewers is what it takes to
 *     claim more, since regional and generational variation is real and one
 *     person's citation form is not the language's.
 */

import type { SignDefinition, SignProvenance } from './definition.js';

export type Credential =
  /** A Deaf signer fluent in ASL. */
  | 'deaf-fluent'
  /** A certified or otherwise professionally qualified ASL interpreter. */
  | 'interpreter'
  /** Someone learning ASL, hearing or Deaf. Their view is recorded, never counted. */
  | 'learner'
  /** The author. Never counted. */
  | 'author';

export type VerdictKind =
  | 'correct'
  | 'correct-with-notes'
  | 'incorrect'
  /** A real sign, but not the one in common use in the reviewer's community. */
  | 'regional-variant'
  | 'cannot-judge';

export interface Verdict {
  readonly signId: string;
  readonly reviewer: string;
  readonly credential: Credential;
  /** ISO date, YYYY-MM-DD. */
  readonly reviewedOn: string;
  readonly verdict: VerdictKind;
  /** What is wrong, or what to change. Required for anything but a plain `correct`. */
  readonly notes?: string;
}

/** Credentials whose verdicts can move a sign. */
const COUNTS: ReadonlySet<Credential> = new Set(['deaf-fluent', 'interpreter']);

export function countsTowardValidation(verdict: Verdict): boolean {
  return COUNTS.has(verdict.credential);
}

export interface ReviewState {
  readonly validation: SignProvenance['validation'];
  /** True when a credentialed reviewer has called the sign incorrect. */
  readonly flaggedIncorrect: boolean;
  /** Distinct credentialed reviewers who have said anything but "cannot judge". */
  readonly reviewers: readonly string[];
  readonly notes: readonly string[];
}

/**
 * Where a sign stands, given everything reviewers have said about it.
 *
 * The latest verdict per reviewer is the one that counts: a reviewer who looks
 * again and changes their mind has changed their mind.
 */
export function reviewState(verdicts: readonly Verdict[]): ReviewState {
  const latest = new Map<string, Verdict>();
  for (const v of [...verdicts].sort((a, b) => a.reviewedOn.localeCompare(b.reviewedOn))) {
    latest.set(`${v.reviewer}`, v);
  }
  const all = [...latest.values()];
  const credentialed = all.filter(countsTowardValidation).filter((v) => v.verdict !== 'cannot-judge');

  const flaggedIncorrect = credentialed.some((v) => v.verdict === 'incorrect');
  const approving = credentialed.filter((v) => v.verdict === 'correct' || v.verdict === 'correct-with-notes');
  const reviewers = [...new Set(credentialed.map((v) => v.reviewer))];
  const notes = all.filter((v) => v.notes).map((v) => `${v.reviewer} (${v.verdict}): ${v.notes}`);

  let validation: SignProvenance['validation'] = 'unvalidated';
  if (!flaggedIncorrect && approving.length >= 1) validation = 'reviewed';
  // Two independent reviewers, at least one of them a Deaf fluent signer, and
  // neither asking for a change: a "correct-with-notes" is a request to alter
  // the sign, and a sign awaiting its alteration is not yet validated.
  const clean = approving.filter((v) => v.verdict === 'correct');
  if (!flaggedIncorrect
      && new Set(clean.map((v) => v.reviewer)).size >= 2
      && clean.some((v) => v.credential === 'deaf-fluent')) {
    validation = 'expert-validated';
  }

  return { validation, flaggedIncorrect, reviewers, notes };
}

/** A sign with its review state applied to its provenance. */
export function withReview(sign: SignDefinition, verdicts: readonly Verdict[]): SignDefinition {
  const mine = verdicts.filter((v) => v.signId === sign.id);
  if (mine.length === 0) return sign;
  const state = reviewState(mine);
  return {
    ...sign,
    provenance: {
      ...sign.provenance,
      validation: state.validation,
      ...(state.flaggedIncorrect ? { note: `${sign.provenance.note ?? ''} FLAGGED INCORRECT by a reviewer: ${state.notes.join('; ')}`.trim() } : {}),
    },
  };
}

// --- ingesting verdicts ---------------------------------------------------

const KINDS: ReadonlySet<string> = new Set(['correct', 'correct-with-notes', 'incorrect', 'regional-variant', 'cannot-judge']);
const CREDENTIALS: ReadonlySet<string> = new Set(['deaf-fluent', 'interpreter', 'learner', 'author']);

/**
 * Check a batch of verdicts from outside before they are believed.
 *
 * Verdicts arrive as a file somebody filled in, so nothing about them can be
 * assumed. Errors are collected, not thrown on the first, so a reviewer
 * returning two hundred rows learns about every problem in one pass.
 */
export function validateVerdicts(raw: unknown, knownSigns: ReadonlySet<string>): { verdicts: Verdict[]; errors: string[] } {
  const errors: string[] = [];
  const verdicts: Verdict[] = [];
  if (!Array.isArray(raw)) return { verdicts, errors: ['verdicts must be an array'] };

  raw.forEach((row, i) => {
    const where = `row ${i + 1}`;
    // Each row's problems are gathered on their own, so whether a row is kept
    // depends only on that row and never on what happened to its neighbours.
    const problems: string[] = [];
    if (typeof row !== 'object' || row === null) { errors.push(`${where}: not an object`); return; }
    const r = row as Record<string, unknown>;
    const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string).trim() : '');

    const signId = str('signId');
    if (!signId) problems.push('missing signId');
    else if (!knownSigns.has(signId)) problems.push(`unknown sign "${signId}"`);

    if (!str('reviewer')) problems.push('missing reviewer');
    if (!CREDENTIALS.has(str('credential'))) problems.push(`credential must be one of ${[...CREDENTIALS].join(', ')}`);
    if (!KINDS.has(str('verdict'))) problems.push(`verdict must be one of ${[...KINDS].join(', ')}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str('reviewedOn'))) problems.push('reviewedOn must be YYYY-MM-DD');

    // A verdict that asks for a change has to say what change, or it is a
    // complaint nobody can act on.
    if (['correct-with-notes', 'incorrect', 'regional-variant'].includes(str('verdict')) && !str('notes')) {
      problems.push(`a "${str('verdict')}" verdict needs notes saying what to change`);
    }

    if (problems.length > 0) {
      for (const problem of problems) errors.push(`${where}: ${problem}`);
      return;
    }
    verdicts.push({
      signId, reviewer: str('reviewer'), credential: str('credential') as Credential,
      reviewedOn: str('reviewedOn'), verdict: str('verdict') as VerdictKind,
      ...(str('notes') ? { notes: str('notes') } : {}),
    });
  });

  return { verdicts, errors };
}

// --- does the author's own rating predict anything? ----------------------

/**
 * A Wilson score interval for a proportion.
 *
 * Used instead of the textbook normal approximation because the samples here
 * will be small and the error rates near zero or one, which is exactly where
 * the normal approximation gives intervals reaching below zero and is wrong.
 */
export function wilson(successes: number, n: number, z = 1.96): { low: number; high: number } {
  if (n === 0) return { low: 0, high: 1 };
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { low: Math.max(0, centre - margin), high: Math.min(1, centre + margin) };
}

export interface FidelityCheck {
  readonly fidelity: string;
  readonly reviewed: number;
  readonly incorrect: number;
  readonly rate: number;
  readonly low: number;
  readonly high: number;
}

/**
 * For each of the author's fidelity ratings, how often did a credentialed
 * reviewer call the sign wrong?
 *
 * This is the question the ratings exist to answer and could not until there
 * were verdicts: whether `citation` signs really are wrong less often than
 * `uncertain` ones. If they are not, the ratings are noise and the review
 * packet's ordering is not worth following. Reported with an interval, because
 * a rate from twelve reviewed signs is not a rate.
 */
export function fidelityAgainstVerdicts(
  signs: Readonly<Record<string, SignDefinition>>,
  verdicts: readonly Verdict[],
): FidelityCheck[] {
  const byFidelity = new Map<string, { reviewed: number; incorrect: number }>();
  const ids = new Set(verdicts.map((v) => v.signId));
  for (const id of ids) {
    const sign = signs[id];
    if (!sign) continue;
    const state = reviewState(verdicts.filter((v) => v.signId === id));
    if (state.reviewers.length === 0) continue;
    const key = sign.provenance.fidelity ?? 'unrated';
    const row = byFidelity.get(key) ?? { reviewed: 0, incorrect: 0 };
    row.reviewed++;
    if (state.flaggedIncorrect) row.incorrect++;
    byFidelity.set(key, row);
  }
  return [...byFidelity.entries()].map(([fidelity, { reviewed, incorrect }]) => {
    const { low, high } = wilson(incorrect, reviewed);
    return { fidelity, reviewed, incorrect, rate: reviewed ? incorrect / reviewed : 0, low, high };
  });
}
