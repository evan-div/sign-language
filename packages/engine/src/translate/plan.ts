/**
 * English in, ASL plan out.
 *
 * This is deliberately a rules pipeline, not a model. English-to-ASL machine
 * translation is not solved, and a system that quietly produces confident
 * nonsense is worse than one whose limits are legible. Everything here is a
 * stated rule that can be pointed at and argued with, and every departure from
 * what the user typed -- a dropped word, a substituted sign, a word we had to
 * spell -- comes back as a notice.
 *
 * The plan is the contract the interface reads. Highlighting, click-to-replay,
 * the gloss line and the notices all come off this one structure, which is why
 * it carries character spans back into the original text.
 */

import type { LetterSegment } from '../fingerspell.js';
import { sequence, samplePrepared, type Prepared, type SequenceItem, type Sequence } from '../sequencer.js';
import { FUNCTION_WORDS, WH_WORDS, type LexiconEntry } from '../lexicon/entries.js';
import { MAX_PHRASE_WORDS, hasLemma, resolveConcept, type Resolution } from '../lexicon/resolve.js';
import { isQuestion, tokenise, trailingPauseMs, type Token } from './normalize.js';
import type { Pose } from '@signflow/motion-format';
import { applyNonManual, type NmmSpan } from './nmm.js';
import type { Hand } from '../handshapes/spec.js';

export interface PlanSegment {
  readonly index: number;
  readonly kind: 'sign' | 'fingerspell';
  readonly signId?: string;
  readonly word?: string;
  readonly gloss: string;
  /** Where in the original input this came from. */
  readonly sourceSpan: readonly [number, number];
  readonly sourceText: string;
  readonly resolution: Resolution;
  readonly substitutedFrom?: string;
  readonly senses?: readonly LexiconEntry[];
  readonly strokeStartMs: number;
  readonly strokeEndMs: number;
  readonly transitionInMs: number;
  /** Letters of a fingerspelled word. One timeline item, many sub-segments. */
  readonly letters?: readonly LetterSegment[];
}

export interface PlanNotice {
  readonly kind: 'substitution' | 'fingerspelled' | 'ambiguous' | 'dropped' | 'reordered';
  readonly message: string;
  readonly segmentIndex?: number;
}

export interface Ambiguity {
  readonly segmentIndex: number;
  readonly word: string;
  readonly senses: readonly LexiconEntry[];
}

export interface ASLPlan {
  readonly source: string;
  readonly segments: readonly PlanSegment[];
  readonly nmmSpans: readonly NmmSpan[];
  readonly notices: readonly PlanNotice[];
  readonly ambiguities: readonly Ambiguity[];
  readonly glossLine: string;
  readonly durationMs: number;
  readonly isQuestion: boolean;
}

export interface TranslateOptions {
  readonly speed?: number;
  readonly hand?: Hand;
  /** Sense choices the user has made, keyed by lowercase word. */
  readonly senseChoices?: Readonly<Record<string, string>>;
}

/** A concept after lookup, before it has been given a place on the timeline. */
interface Concept {
  readonly tokens: readonly Token[];
  readonly span: readonly [number, number];
  readonly text: string;
  readonly signId?: string;
  readonly resolution: Resolution;
  readonly substitutedFrom?: string;
  readonly senses?: readonly LexiconEntry[];
}

/**
 * Longest-match phrase lookup, before single words.
 *
 * This is what makes "thank you" one sign rather than THANK followed by YOU,
 * with no special case anywhere: the lexicon holds the phrase, and the matcher
 * simply tries the longest span first.
 */
function matchConcepts(tokens: readonly Token[], senseChoices: Record<string, string>): Concept[] {
  const concepts: Concept[] = [];
  let i = 0;

  while (i < tokens.length) {
    let matched = false;

    for (let span = Math.min(MAX_PHRASE_WORDS, tokens.length - i); span >= 1 && !matched; span--) {
      const group = tokens.slice(i, i + span);
      const lemma = group.map((t) => t.lemma).join(' ');
      if (!hasLemma(lemma)) continue;

      const resolved = resolveConcept(lemma, senseChoices[lemma]);
      concepts.push({
        tokens: group,
        span: [group[0]!.span[0], group[group.length - 1]!.span[1]],
        text: group.map((t) => t.text).join(' '),
        ...(resolved.signId ? { signId: resolved.signId } : {}),
        resolution: resolved.resolution,
        ...(resolved.senses ? { senses: resolved.senses } : {}),
      });
      i += span;
      matched = true;
    }

    if (matched) continue;

    // No phrase or lemma matched: try a synonym, else spell it.
    const token = tokens[i]!;
    const resolved = resolveConcept(token.lemma, senseChoices[token.lemma], token.text.toLowerCase());
    concepts.push({
      tokens: [token],
      span: token.span,
      text: token.text,
      ...(resolved.signId ? { signId: resolved.signId } : {}),
      resolution: resolved.resolution,
      ...(resolved.substitutedFrom ? { substitutedFrom: resolved.substitutedFrom } : {}),
    });
    i += 1;
  }

  return concepts;
}

export function translate(input: string, options: TranslateOptions = {}): {
  plan: ASLPlan;
  prepared: readonly Prepared[];
  sequence: Sequence;
} {
  const senseChoices = options.senseChoices ?? {};
  const tokens = tokenise(input);
  const question = isQuestion(input);

  const dropped: string[] = [];
  const kept = tokens.filter((t) => {
    // A word only counts as a function word if we have no sign for it. "no"
    // and "do" look alike to a stop list and are not alike in ASL.
    if (FUNCTION_WORDS.has(t.lemma) && !hasLemma(t.lemma)) {
      dropped.push(t.text);
      return false;
    }
    return true;
  });

  let concepts = matchConcepts(kept, senseChoices);

  // WH-movement: ASL puts the question word at the end of the clause.
  let reordered = false;
  const whIndex = concepts.findIndex((c) => c.tokens.some((t) => WH_WORDS.has(t.lemma)));
  if (whIndex >= 0 && whIndex < concepts.length - 1) {
    const [wh] = concepts.splice(whIndex, 1);
    concepts.push(wh!);
    reordered = true;
  }

  const items: SequenceItem[] = concepts.map((c) =>
    c.signId
      ? { kind: 'sign', signId: c.signId }
      : { kind: 'fingerspell', word: c.text },
  );

  const built = sequence(items, {
    speed: options.speed ?? 1,
    hand: options.hand ?? 'right',
    endPauseMs: trailingPauseMs(input),
  });

  const segments: PlanSegment[] = built.sequence.segments.map((s, index) => {
    const concept = concepts[index]!;
    return {
      ...s,
      sourceSpan: concept.span,
      sourceText: concept.text,
      resolution: concept.resolution,
      ...(concept.substitutedFrom ? { substitutedFrom: concept.substitutedFrom } : {}),
      ...(concept.senses ? { senses: concept.senses } : {}),
    };
  });

  const notices: PlanNotice[] = [];
  const ambiguities: Ambiguity[] = [];

  for (const segment of segments) {
    if (segment.resolution === 'synonym') {
      notices.push({
        kind: 'substitution', segmentIndex: segment.index,
        message: `No sign for “${segment.sourceText}” — signed “${segment.substitutedFrom}” instead.`,
      });
    }
    if (segment.resolution === 'fingerspelled') {
      notices.push({
        kind: 'fingerspelled', segmentIndex: segment.index,
        message: `No sign for “${segment.sourceText}” — fingerspelled it.`,
      });
    }
    if (segment.resolution === 'ambiguous' && segment.senses) {
      notices.push({
        kind: 'ambiguous', segmentIndex: segment.index,
        message: `“${segment.sourceText}” has more than one meaning. Pick one.`,
      });
      ambiguities.push({
        segmentIndex: segment.index,
        word: segment.sourceText,
        senses: segment.senses,
      });
    }
  }

  if (dropped.length > 0) {
    notices.push({
      kind: 'dropped',
      message: `Dropped ${dropped.map((w) => `“${w}”`).join(', ')} — ASL does not sign them.`,
    });
  }
  if (reordered) {
    notices.push({ kind: 'reordered', message: 'Moved the question word to the end, as ASL does.' });
  }

  // Non-manual markers span whole clauses, not single signs, which is why they
  // live beside the segments rather than on them.
  const nmmSpans: NmmSpan[] = [];
  if (segments.length > 0) {
    const last = segments.length - 1;
    if (question) {
      const wh = segments.some((s) => s.sourceText && WH_WORDS.has(s.sourceText.toLowerCase()));
      nmmSpans.push({ type: wh ? 'brow_furrow' : 'brow_raise', fromIndex: 0, toIndex: last });
    }
    const negation = segments.findIndex((s) => s.signId === 'NO');
    if (negation >= 0) {
      nmmSpans.push({ type: 'headshake', fromIndex: negation, toIndex: last });
    }
  }

  return {
    prepared: built.prepared,
    sequence: built.sequence,
    plan: {
      source: input,
      segments,
      nmmSpans,
      notices,
      ambiguities,
      glossLine: segments.map((s) => s.gloss).join(' '),
      durationMs: built.sequence.durationMs,
      isQuestion: question,
    },
  };
}

/** The pose for a plan at a time, with non-manual markers layered on. */
export function samplePlan(
  plan: ASLPlan,
  prepared: readonly Prepared[],
  seq: Sequence,
  timeMs: number,
): Pose {
  return applyNonManual(samplePrepared(prepared, seq, timeMs), plan.segments, plan.nmmSpans, timeMs);
}

/** The segment active at a time, for highlighting the English. */
export function activePlanSegment(plan: ASLPlan, timeMs: number): PlanSegment | undefined {
  if (timeMs >= plan.durationMs) return undefined;
  let current: PlanSegment | undefined;
  for (const segment of plan.segments) {
    if (timeMs >= segment.strokeStartMs - segment.transitionInMs / 2) current = segment;
  }
  return current;
}
