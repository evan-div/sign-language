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
import { FUNCTION_WORDS, SPATIALLY_EXPRESSED, WH_WORDS, type LexiconEntry } from '../lexicon/entries.js';
import { MAX_PHRASE_WORDS, hasLemma, lookupLemma, resolveConcept, type Resolution } from '../lexicon/resolve.js';
import { isQuestion, tokenise, trailingPauseMs, type Token } from './normalize.js';
import { parseNumber } from '../numbers/parse.js';
import { canIncorporate, incorporatedId } from '../numbers/incorporate.js';
import { numberSignId, resolveSign } from '../signs/resolve-sign.js';
import type { Pose } from '@signflow/motion-format';
import { applyNonManual, type NmmSpan, type NonManualResult } from './nmm.js';
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
  readonly kind: 'substitution' | 'fingerspelled' | 'ambiguous' | 'dropped' | 'spatial'
    | 'reordered' | 'incorporated';
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
  /** Index into the clause list. Set after matching, before reordering. */
  clause?: number;
  /** The value, for a number or an incorporated number. */
  readonly value?: number;
}

/**
 * A clause, as far as punctuation and a short word list can tell.
 *
 * Non-manual markers scope over clauses, not over sentences, and a marker with
 * the wrong scope is not a smaller mistake than a missing one -- a headshake
 * that runs to the end of the sentence negates things the signer did not negate.
 * Before this, negation ran to the end of the input and the question markers
 * covered everything including a conditional clause that should have carried
 * its own.
 *
 * This is punctuation and a two-word list, not a parser, and it will get long
 * sentences wrong. It is written down as a rule so it can be argued with.
 */
interface ClauseSpan {
  /** Character offsets into the original input. */
  readonly from: number;
  readonly to: number;
  readonly kind: 'main' | 'conditional' | 'topic';
}

/** Words that introduce a conditional clause in English. */
const CONDITIONAL_MARKERS: ReadonlySet<string> = new Set(['if', 'suppose', 'unless']);

export function findClauses(input: string): ClauseSpan[] {
  const pieces: Array<{ from: number; to: number }> = [];
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === ',' || input[i] === ';') {
      pieces.push({ from: start, to: i });
      start = i + 1;
    }
  }
  pieces.push({ from: start, to: input.length });

  return pieces
    .filter((piece) => /[\p{L}\p{N}]/u.test(input.slice(piece.from, piece.to)))
    .map((piece, index, all) => {
      const text = input.slice(piece.from, piece.to).trim().toLowerCase();
      const firstWord = text.split(/[^\p{L}']+/u).filter(Boolean)[0] ?? '';
      if (CONDITIONAL_MARKERS.has(firstWord)) {
        return { ...piece, kind: 'conditional' as const };
      }
      // A comma-separated phrase before the main clause, with no conditional
      // word, is taken to be a fronted topic. That is the common case in
      // written English for the thing ASL topicalises, and it is a guess.
      if (index < all.length - 1) return { ...piece, kind: 'topic' as const };
      return { ...piece, kind: 'main' as const };
    });
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
  const words = tokens.map((t) => t.text);
  let i = 0;

  while (i < tokens.length) {
    let matched = false;

    // Numbers first. "forty-two" is one number across one token and "three
    // hundred forty two" is one number across four, and neither is in the
    // lexicon: they are composed. Trying the lexicon first would match "one"
    // and "hundred" as separate concepts and lose the number.
    const number = parseNumber(words, i);
    if (number) {
      const group = tokens.slice(i, i + number.length);
      const span: [number, number] = [group[0]!.span[0], group[group.length - 1]!.span[1]];
      const text = group.map((t) => t.text).join(' ');
      const unit = tokens[i + number.length];

      // "three weeks" is one sign in ASL, not two: WEEK made with a three
      // handshape. Incorporation is checked before the number stands alone.
      const unitSign = unit ? lookupLemma(unit.lemma)[0]?.signId : undefined;
      if (unit && unitSign && canIncorporate(unitSign, number.value)) {
        concepts.push({
          tokens: [...group, unit],
          span: [span[0], unit.span[1]],
          text: `${text} ${unit.text}`,
          signId: incorporatedId(unitSign, number.value),
          resolution: 'incorporated',
          value: number.value,
        });
        i += number.length + 1;
        continue;
      }

      const composed = numberSignId(number.value);
      if (resolveSign(composed)) {
        concepts.push({ tokens: group, span, text, signId: composed, resolution: 'number', value: number.value });
        i += number.length;
        continue;
      }

      // Past what the composer builds, a number is signed digit by digit --
      // which is what ASL does for anything long anyway, and is not the same as
      // fingerspelling it, because digits are not letters.
      const digits = [...String(number.value)];
      digits.forEach((digit, at) => {
        concepts.push({
          tokens: group,
          span: at === 0 ? span : [span[1], span[1]],
          text: at === 0 ? text : '',
          signId: numberSignId(Number(digit)),
          resolution: 'number',
          value: Number(digit),
        });
      });
      i += number.length;
      continue;
    }

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
  const spatial: string[] = [];
  const kept = tokens.filter((t) => {
    // A word only counts as droppable if we have no sign for it. "no" and "do"
    // look alike to a stop list and are not alike in ASL.
    if (hasLemma(t.lemma)) return true;
    if (FUNCTION_WORDS.has(t.lemma)) {
      dropped.push(t.text);
      return false;
    }
    if (SPATIALLY_EXPRESSED.has(t.lemma)) {
      spatial.push(t.text);
      return false;
    }
    return true;
  });

  let concepts = matchConcepts(kept, senseChoices);

  const clauses = findClauses(input);
  for (const concept of concepts) {
    const at = concept.span[0];
    const found = clauses.findIndex((c) => at >= c.from && at < c.to);
    concept.clause = found < 0 ? clauses.length - 1 : found;
  }

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
  const incorporated = segments.filter((s) => s.resolution === 'incorporated');
  if (incorporated.length > 0) {
    notices.push({
      kind: 'incorporated',
      message: `Signed ${incorporated.map((s) => `“${s.sourceText}”`).join(', ')} as one sign `
        + 'with the number in the handshape, as ASL does.',
    });
  }
  if (spatial.length > 0) {
    notices.push({
      kind: 'spatial',
      message: `Left out ${spatial.map((w) => `“${w}”`).join(', ')} — ASL carries these in space or on the face, which this does not build yet.`,
    });
  }
  if (reordered) {
    notices.push({ kind: 'reordered', message: 'Moved the question word to the end, as ASL does.' });
  }

  // Non-manual markers span whole clauses, not single signs, which is why they
  // live beside the segments rather than on them.
  const nmmSpans: NmmSpan[] = [];
  if (segments.length > 0) {
    /** The final segment indices belonging to a clause, after reordering. */
    const rangeOf = (clause: number): [number, number] | undefined => {
      const indices = concepts
        .map((c, i) => (c.clause === clause ? i : -1))
        .filter((i) => i >= 0);
      if (indices.length === 0) return undefined;
      return [Math.min(...indices), Math.max(...indices)];
    };

    for (let clause = 0; clause < clauses.length; clause++) {
      const range = rangeOf(clause);
      if (!range) continue;
      const kind = clauses[clause]!.kind;
      if (kind === 'conditional') nmmSpans.push({ type: 'conditional', fromIndex: range[0], toIndex: range[1] });
      if (kind === 'topic') {
        // "No, I go home" is not a topicalised noun phrase with a comma after
        // it; it is a particle. A clause that is nothing but yes or no gets no
        // topic marker, which is the narrowest rule that fixes the case
        // punctuation alone cannot tell apart.
        const onlyParticles = concepts
          .filter((c) => c.clause === clause)
          .every((c) => c.signId === 'NO' || c.signId === 'YES');
        if (!onlyParticles) nmmSpans.push({ type: 'topic', fromIndex: range[0], toIndex: range[1] });
      }
    }

    // A question marks its MAIN clause, not the whole input: in "if you want,
    // do you go?" the raised brows belong to the going, and the conditional
    // clause carries its own marker.
    if (question) {
      const mainClause = clauses.findIndex((c) => c.kind === 'main');
      const range = (mainClause >= 0 ? rangeOf(mainClause) : undefined)
        ?? [0, segments.length - 1] as [number, number];
      const wh = segments.some((s) => s.sourceText && WH_WORDS.has(s.sourceText.toLowerCase()));
      nmmSpans.push({ type: wh ? 'wh_question' : 'yes_no_question', fromIndex: range[0], toIndex: range[1] });
    }

    // Negation and affirmation scope from their sign to the end of THEIR
    // clause. Running a headshake to the end of the sentence negates things
    // the signer did not negate.
    for (const [signId, type] of [['NO', 'negation'], ['YES', 'affirmation']] as const) {
      const at = concepts.findIndex((c) => c.signId === signId);
      if (at < 0) continue;
      const range = rangeOf(concepts[at]!.clause ?? 0);
      nmmSpans.push({ type, fromIndex: at, toIndex: range ? range[1] : segments.length - 1 });
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

/**
 * A plan holding one sign on its own, for previewing the library.
 *
 * Goes through the same sequencer as a sentence, so what a preview shows is
 * what that sign looks like inside one -- lead-in from rest, stroke, release --
 * rather than a separate playback path that could drift from the real one.
 */
export function planSign(signId: string, options: TranslateOptions = {}): {
  plan: ASLPlan;
  prepared: readonly Prepared[];
  sequence: Sequence;
} {
  const definition = resolveSign(signId);
  if (!definition) throw new Error(`Unknown sign "${signId}"`);

  const built = sequence([{ kind: 'sign', signId }], {
    speed: options.speed ?? 1,
    hand: options.hand ?? 'right',
  });
  const segment = built.sequence.segments[0]!;
  const source = definition.gloss;

  return {
    prepared: built.prepared,
    sequence: built.sequence,
    plan: {
      source,
      segments: [{
        ...segment,
        sourceSpan: [0, source.length],
        sourceText: source,
        resolution: 'direct',
      }],
      nmmSpans: [],
      notices: [],
      ambiguities: [],
      glossLine: definition.gloss,
      durationMs: built.sequence.durationMs,
      isQuestion: false,
    },
  };
}

/**
 * The pose AND face for a plan at a time, with non-manual markers layered on.
 *
 * Returns both because they are one thing: a yes/no question is raised brows
 * and a head carried forward, and a caller that could take the pose without the
 * face would render half a marker.
 */
export function samplePlan(
  plan: ASLPlan,
  prepared: readonly Prepared[],
  seq: Sequence,
  timeMs: number,
): NonManualResult {
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
