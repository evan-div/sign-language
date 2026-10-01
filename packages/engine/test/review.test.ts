import { describe, it, expect } from 'vitest';
import {
  reviewState, validateVerdicts, wilson, fidelityAgainstVerdicts, withReview,
  SIGNS, VERDICTS, type Verdict,
} from '../src/index.js';

const v = (over: Partial<Verdict> = {}): Verdict => ({
  signId: 'HELLO', reviewer: 'A', credential: 'deaf-fluent', reviewedOn: '2026-10-01',
  verdict: 'correct', ...over,
});

describe('who can validate a sign', () => {
  it('leaves a sign unvalidated until a credentialed reviewer says otherwise', () => {
    expect(reviewState([]).validation).toBe('unvalidated');
    expect(reviewState([v()]).validation).toBe('reviewed');
  });

  it('never lets a learner or the author move a sign', () => {
    // The whole point. A hearing learner agreeing with the author is two people
    // who do not know, agreeing.
    expect(reviewState([v({ credential: 'learner' })]).validation).toBe('unvalidated');
    expect(reviewState([v({ credential: 'author' })]).validation).toBe('unvalidated');
    expect(reviewState([
      v({ reviewer: 'L1', credential: 'learner' }), v({ reviewer: 'L2', credential: 'learner' }),
      v({ reviewer: 'A', credential: 'author' }),
    ]).validation).toBe('unvalidated');
  });

  it('lets an interpreter make a sign reviewed', () => {
    expect(reviewState([v({ credential: 'interpreter' })]).validation).toBe('reviewed');
  });

  it('lets an incorrect verdict win over any number of correct ones', () => {
    // A sign one fluent signer says is wrong is wrong for somebody, and the
    // interface has to go on saying so.
    const state = reviewState([
      v({ reviewer: 'A' }), v({ reviewer: 'B' }), v({ reviewer: 'C' }),
      v({ reviewer: 'D', verdict: 'incorrect', notes: 'wrong handshape' }),
    ]);
    expect(state.validation).toBe('unvalidated');
    expect(state.flaggedIncorrect).toBe(true);
  });

  it('ignores an incorrect verdict from someone who cannot validate', () => {
    // Symmetric with the above: a learner cannot flag a sign any more than they
    // can approve one.
    const state = reviewState([v(), v({ reviewer: 'L', credential: 'learner', verdict: 'incorrect', notes: 'x' })]);
    expect(state.flaggedIncorrect).toBe(false);
    expect(state.validation).toBe('reviewed');
  });

  it('needs two independent reviewers, one of them Deaf, for expert-validated', () => {
    expect(reviewState([v({ reviewer: 'A' })]).validation).toBe('reviewed');
    expect(reviewState([v({ reviewer: 'A' }), v({ reviewer: 'B' })]).validation).toBe('expert-validated');
    // One person twice is still one person.
    expect(reviewState([v({ reviewer: 'A' }), v({ reviewer: 'A', reviewedOn: '2026-10-02' })]).validation)
      .toBe('reviewed');
    // Two interpreters and no Deaf signer is not enough.
    expect(reviewState([
      v({ reviewer: 'A', credential: 'interpreter' }), v({ reviewer: 'B', credential: 'interpreter' }),
    ]).validation).toBe('reviewed');
  });

  it('does not count a correct-with-notes toward expert validation', () => {
    // A request to change the sign means the sign is awaiting its change.
    expect(reviewState([
      v({ reviewer: 'A' }), v({ reviewer: 'B', verdict: 'correct-with-notes', notes: 'slower' }),
    ]).validation).toBe('reviewed');
  });

  it('takes a reviewer’s latest word, since looking again can change a mind', () => {
    expect(reviewState([
      v({ verdict: 'incorrect', notes: 'wrong', reviewedOn: '2026-10-01' }),
      v({ verdict: 'correct', reviewedOn: '2026-10-05' }),
    ]).flaggedIncorrect).toBe(false);
  });

  it('treats "cannot judge" as saying nothing at all', () => {
    expect(reviewState([v({ verdict: 'cannot-judge' })]).validation).toBe('unvalidated');
  });

  it('applies to a sign without altering the library, and flags an incorrect one', () => {
    const flagged = withReview(SIGNS.HELLO!, [v({ verdict: 'incorrect', notes: 'wrong hand' })]);
    expect(flagged.provenance.validation).toBe('unvalidated');
    expect(flagged.provenance.note).toContain('FLAGGED INCORRECT');
    expect(SIGNS.HELLO!.provenance.note).not.toContain('FLAGGED');
  });
});

describe('the library as shipped', () => {
  it('has no verdicts, and so no validated sign', () => {
    // If this ever fails, someone has added a verdict and the interface claim
    // that nothing has been reviewed is stale -- which is the point of it.
    expect(VERDICTS).toEqual([]);
    for (const sign of Object.values(SIGNS)) {
      expect(sign.provenance.validation, sign.id).toBe('unvalidated');
    }
  });
});

describe('ingesting verdicts from outside', () => {
  const known = new Set(['HELLO', 'MY']);
  const good = { signId: 'HELLO', reviewer: 'A', credential: 'deaf-fluent', reviewedOn: '2026-10-01', verdict: 'correct' };

  it('accepts a well-formed verdict', () => {
    const { verdicts, errors } = validateVerdicts([good], known);
    expect(errors).toEqual([]);
    expect(verdicts).toHaveLength(1);
  });

  it('rejects an unknown sign, credential, verdict and date, each by name', () => {
    const { errors } = validateVerdicts([
      { ...good, signId: 'NOPE' }, { ...good, credential: 'expert' },
      { ...good, verdict: 'fine' }, { ...good, reviewedOn: '1/2/26' },
    ], known);
    expect(errors.join('\n')).toMatch(/unknown sign "NOPE"/);
    expect(errors.join('\n')).toMatch(/credential must be/);
    expect(errors.join('\n')).toMatch(/verdict must be/);
    expect(errors.join('\n')).toMatch(/reviewedOn must be/);
  });

  it('demands notes from any verdict that asks for a change', () => {
    for (const kind of ['incorrect', 'correct-with-notes', 'regional-variant']) {
      const { errors } = validateVerdicts([{ ...good, verdict: kind }], known);
      expect(errors.join(' '), kind).toMatch(/needs notes/);
    }
    expect(validateVerdicts([{ ...good, verdict: 'incorrect', notes: 'x' }], known).errors).toEqual([]);
  });

  it('reports every problem in one pass, so a reviewer fixes the file once', () => {
    const rows = Array.from({ length: 12 }, () => ({ ...good, signId: 'NOPE' }));
    expect(validateVerdicts(rows, known).errors).toHaveLength(12);
  });

  it('keeps a good row whatever its neighbours do', () => {
    // Whether a row survives depends only on that row. Bad rows at the start,
    // the middle and the end must not take any good row with them.
    const bad = { ...good, signId: 'NOPE' };
    const rows = [bad, good, good, bad, good, good, good, good, good, good, bad, good];
    const { verdicts, errors } = validateVerdicts(rows, known);
    expect(verdicts).toHaveLength(9);
    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.split(':')[0])).toEqual(['row 1', 'row 4', 'row 11']);
  });
});

describe('whether the author’s own ratings predict anything', () => {
  it('computes a Wilson interval that behaves at the extremes', () => {
    // The normal approximation gives an interval below zero for 0 of n.
    const none = wilson(0, 10);
    expect(none.low).toBe(0);
    expect(none.high).toBeGreaterThan(0.1);
    expect(none.high).toBeLessThan(0.4);
    const all = wilson(10, 10);
    expect(all.high).toBe(1);
    expect(all.low).toBeGreaterThan(0.6);
    expect(wilson(0, 0)).toEqual({ low: 0, high: 1 });
    // A small sample is honestly wide.
    expect(wilson(2, 4).high - wilson(2, 4).low).toBeGreaterThan(0.5);
  });

  it('reports the rate each fidelity rating was wrong, with its interval', () => {
    const rated = (id: string, fidelity: 'citation' | 'approximate' | 'uncertain') =>
      [id, { ...SIGNS.HELLO!, id, provenance: { ...SIGNS.HELLO!.provenance, fidelity } }] as const;
    const signs = Object.fromEntries([
      rated('C1', 'citation'), rated('C2', 'citation'), rated('C3', 'citation'),
      rated('U1', 'uncertain'), rated('U2', 'uncertain'),
    ]);
    const verdicts = [
      v({ signId: 'C1' }), v({ signId: 'C2' }), v({ signId: 'C3', verdict: 'incorrect', notes: 'x' }),
      v({ signId: 'U1', verdict: 'incorrect', notes: 'x' }), v({ signId: 'U2', verdict: 'incorrect', notes: 'x' }),
    ];
    const checks = Object.fromEntries(fidelityAgainstVerdicts(signs, verdicts).map((c) => [c.fidelity, c]));
    expect(checks.citation!.reviewed).toBe(3);
    expect(checks.citation!.incorrect).toBe(1);
    expect(checks.uncertain!.rate).toBe(1);
    // Three signs is not a rate: the interval says so.
    expect(checks.citation!.high - checks.citation!.low).toBeGreaterThan(0.5);
  });

  it('does not count a sign nobody credentialed has looked at', () => {
    const signs = { HELLO: SIGNS.HELLO! };
    expect(fidelityAgainstVerdicts(signs, [v({ credential: 'learner' })])).toEqual([]);
  });
});
