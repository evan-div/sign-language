import { describe, it, expect } from 'vitest';
import { solveFK, jointPosition, vec3Distance, validatePose, validateFace,
  quatRotateVec3 } from '@signflow/motion-format';
import {
  translate, samplePlan, activePlanSegment, activeNonManual, tokenise, resolveConcept,
  lintPlan, LEXICON, SYNONYMS, SIGNS,
} from '../src/index.js';

const glossOf = (input: string) => translate(input).plan.glossLine;
const planOf = (input: string, options = {}) => translate(input, options).plan;

describe('tokenising', () => {
  it('keeps character spans back into the original text', () => {
    const tokens = tokenise('hello my name is Evan');
    expect(tokens.map((t) => t.text)).toEqual(['hello', 'my', 'name', 'is', 'Evan']);
    for (const token of tokens) {
      expect('hello my name is Evan'.slice(token.span[0], token.span[1])).toBe(token.text);
    }
  });

  it('lemmatises shallowly, without eating words we have signs for', () => {
    // A greedier stemmer turns "sign" into "sig" and "please" into "pleas".
    const lemmas = Object.fromEntries(tokenise('signs signing please class').map((t) => [t.text, t.lemma]));
    expect(lemmas.signs).toBe('sign');
    expect(lemmas.signing).toBe('sign');
    expect(lemmas.please).toBe('please');
    expect(lemmas.class).toBe('class');
  });

  it('handles possessives and contractions', () => {
    expect(tokenise("Evan's").map((t) => t.lemma)).toEqual(['evan']);
    expect(tokenise("don't").map((t) => t.lemma)).toEqual(['do']);
  });
});

describe('the lexicon', () => {
  it('points every entry at a sign that exists', () => {
    for (const entry of LEXICON) {
      expect(SIGNS[entry.signId], `${entry.lemma} -> ${entry.signId}`).toBeDefined();
    }
  });

  it('points every synonym at a lemma that exists', () => {
    const lemmas = new Set(LEXICON.map((e) => e.lemma));
    for (const [from, to] of Object.entries(SYNONYMS)) {
      expect(lemmas.has(to), `${from} -> ${to}`).toBe(true);
    }
  });

  it('labels the sense on every entry of a lemma that has more than one', () => {
    const counts = new Map<string, number>();
    for (const e of LEXICON) counts.set(e.lemma, (counts.get(e.lemma) ?? 0) + 1);
    for (const e of LEXICON) {
      if ((counts.get(e.lemma) ?? 0) > 1) expect(e.sense, `${e.lemma}/${e.signId}`).toBeTruthy();
    }
  });
});

describe('the resolver chain', () => {
  it('resolves a known word directly', () => {
    expect(resolveConcept('hello')).toMatchObject({ resolution: 'direct', signId: 'HELLO' });
  });

  it('refuses to choose between senses', () => {
    const resolved = resolveConcept('right');
    expect(resolved.resolution).toBe('ambiguous');
    expect(resolved.senses).toHaveLength(2);
    expect(resolved.senses!.map((s) => s.signId).sort())
      .toEqual(['RIGHT_CORRECT', 'RIGHT_DIRECTION']);
  });

  it('accepts a sense once the user has picked one', () => {
    expect(resolveConcept('right', 'RIGHT_DIRECTION'))
      .toMatchObject({ resolution: 'direct', signId: 'RIGHT_DIRECTION' });
  });

  it('substitutes through a synonym and says what it substituted', () => {
    expect(resolveConcept('assist')).toMatchObject({
      resolution: 'synonym', signId: 'HELP', substitutedFrom: 'help',
    });
  });

  it('finds a synonym the stemmer stepped past', () => {
    // "greetings" lemmatises to "greeting", which is not in the table.
    expect(resolveConcept('greeting', undefined, 'greetings'))
      .toMatchObject({ resolution: 'synonym', signId: 'HELLO' });
  });

  it('falls through to fingerspelling rather than guessing', () => {
    expect(resolveConcept('xylophone')).toMatchObject({ resolution: 'fingerspelled' });
    expect(resolveConcept('xylophone').signId).toBeUndefined();
  });
});

describe('translation', () => {
  it('handles the target sentence', () => {
    expect(glossOf('hello my name is Evan')).toBe('HELLO MY NAME E-V-A-N');
  });

  it('treats a multi-word sign as one concept', () => {
    // Longest-match, so THANK-YOU wins over THANK followed by YOU.
    const plan = planOf('thank you');
    expect(plan.segments).toHaveLength(1);
    expect(plan.segments[0]!.signId).toBe('THANK-YOU');
    expect(plan.segments[0]!.sourceText).toBe('thank you');
  });

  it('drops words ASL does not sign, and says which', () => {
    const plan = planOf('hello my name is Evan');
    expect(plan.glossLine).not.toContain('IS');
    expect(plan.notices.find((n) => n.kind === 'dropped')?.message).toContain('is');
  });

  it('does not drop a stop-listed word it has a sign for', () => {
    // "no" and "do" look alike to a stop list and are not alike in ASL.
    expect(glossOf('no')).toBe('NO');
  });

  it('moves the question word to the end, as ASL does', () => {
    expect(glossOf('what is your name?')).toBe('YOUR NAME WHAT');
    expect(planOf('what is your name?').notices.some((n) => n.kind === 'reordered')).toBe(true);
  });

  it('fingerspells an unknown word as one segment with letters', () => {
    const plan = planOf('hello my name is Evan');
    const spelled = plan.segments.find((s) => s.kind === 'fingerspell')!;
    expect(spelled.gloss).toBe('E-V-A-N');
    expect(spelled.letters).toHaveLength(4);
    expect(spelled.sourceText).toBe('Evan');
  });

  it('reports every departure from what was typed', () => {
    const plan = planOf('greetings, assist me');
    const kinds = plan.notices.map((n) => n.kind);
    expect(kinds).toContain('substitution');
    expect(plan.notices.find((n) => n.kind === 'substitution')!.message).toContain('hello');
  });

  it('asks rather than guessing when a word has two meanings', () => {
    const plan = planOf('you are right');
    expect(plan.ambiguities).toHaveLength(1);
    expect(plan.ambiguities[0]!.word).toBe('right');
    expect(plan.ambiguities[0]!.senses.map((s) => s.sense)).toEqual(['correct', 'the direction']);
  });

  it('honours a sense once chosen, and stops asking', () => {
    const plan = planOf('you are right', { senseChoices: { right: 'RIGHT_DIRECTION' } });
    expect(plan.segments[1]!.signId).toBe('RIGHT_DIRECTION');
    expect(plan.segments[1]!.resolution).toBe('direct');
    expect(plan.ambiguities).toHaveLength(0);
  });

  it('keeps spans pointing at the right words after reordering', () => {
    // WH-movement breaks the order, so only the spans still tie sign to text.
    const input = 'what is your name?';
    const plan = planOf(input);
    for (const segment of plan.segments) {
      expect(input.slice(segment.sourceSpan[0], segment.sourceSpan[1])).toBe(segment.sourceText);
    }
    expect(plan.segments.map((s) => s.sourceText)).toEqual(['your', 'name', 'what']);
  });

  it('handles empty and punctuation-only input', () => {
    expect(planOf('').segments).toHaveLength(0);
    expect(planOf('   ').durationMs).toBe(0);
    expect(planOf('...').segments).toHaveLength(0);
  });
});

describe('non-manual markers', () => {
  it('marks a yes/no question across the whole clause', () => {
    const plan = planOf('are you deaf?');
    expect(plan.nmmSpans).toHaveLength(1);
    expect(plan.nmmSpans[0]).toMatchObject({ type: 'yes_no_question', fromIndex: 0, toIndex: 1 });
  });

  it('marks a WH question differently', () => {
    expect(planOf('what is your name?').nmmSpans[0]!.type).toBe('wh_question');
  });

  it('marks negation from the negated sign onward', () => {
    const plan = planOf('no');
    expect(plan.nmmSpans[0]).toMatchObject({ type: 'negation', fromIndex: 0 });
  });

  it('leaves a statement unmarked', () => {
    expect(planOf('hello my name is Evan').nmmSpans).toHaveLength(0);
  });

  it('marks a conditional clause separately from the main clause', () => {
    // The marker on "if you want" is not the marker on "I go", and running one
    // over both is not a smaller mistake than missing one: it tells the reader
    // the whole sentence is hypothetical.
    const plan = planOf('if you want, I go');
    const kinds = plan.nmmSpans.map((s) => s.type);
    expect(kinds).toContain('conditional');
    const conditional = plan.nmmSpans.find((s) => s.type === 'conditional')!;
    expect(conditional.toIndex).toBeLessThan(plan.segments.length - 1);
  });

  it('keeps a question marker on the main clause only', () => {
    const plan = planOf('if you want, do you go?');
    const question = plan.nmmSpans.find((s) => s.type === 'yes_no_question')!;
    const conditional = plan.nmmSpans.find((s) => s.type === 'conditional')!;
    expect(question.fromIndex).toBeGreaterThan(conditional.toIndex);
  });

  it('marks a fronted phrase as a topic', () => {
    const plan = planOf('my mother, I love');
    expect(plan.nmmSpans.map((s) => s.type)).toContain('topic');
  });

  it('stops a headshake at the end of its own clause', () => {
    // Negation that runs to the end of the input negates things the signer did
    // not negate.
    const plan = planOf('no, I go home');
    const negation = plan.nmmSpans.find((s) => s.type === 'negation')!;
    expect(negation.toIndex).toBeLessThan(plan.segments.length - 1);
  });

  it('actually moves the head, and only inside the span', () => {
    const { plan, prepared, sequence } = translate('are you deaf?');
    const headYaw = (t: number) => {
      const { pose } = samplePlan(plan, prepared, sequence, t);
      return quatRotateVec3(pose.head ?? [0, 0, 0, 1], [0, 0, 1]);
    };
    const inside = headYaw((plan.segments[0]!.strokeStartMs + plan.segments[0]!.strokeEndMs) / 2);
    const atRest = headYaw(0);
    expect(vec3Distance(inside, atRest)).toBeGreaterThan(0.05);
    // Back to neutral by the very end of the clip.
    expect(vec3Distance(headYaw(plan.durationMs), atRest)).toBeLessThan(0.02);
  });
});

describe('the face carries the marker', () => {
  const faceAt = (input: string, at: 'middle' | 'start' | 'end' = 'middle') => {
    const { plan, prepared, sequence } = translate(input);
    const t = at === 'start' ? 0
      : at === 'end' ? plan.durationMs
      : (plan.segments[0]!.strokeStartMs + plan.segments[0]!.strokeEndMs) / 2;
    return samplePlan(plan, prepared, sequence, t).face;
  };

  it('raises the brows for a yes/no question and lowers them for a WH question', () => {
    // The contrast ASL uses is the DIRECTION the brows move. Two markers that
    // differed only in magnitude would be unreadable, so this asserts they move
    // opposite ways rather than that they differ.
    const yesNo = faceAt('are you deaf?');
    const wh = faceAt('what is your name?');
    expect(yesNo.browInnerUp ?? 0).toBeGreaterThan(0.5);
    expect(yesNo.browDownLeft ?? 0).toBe(0);
    expect(wh.browDownLeft ?? 0).toBeGreaterThan(0.5);
    expect(wh.browInnerUp ?? 0).toBe(0);
  });

  it('leaves the face neutral in a statement', () => {
    expect(faceAt('hello my name is Evan')).toEqual({});
  });

  it('returns the face to neutral by the end', () => {
    expect(faceAt('are you deaf?', 'end')).toEqual({});
  });

  it('emits only valid face weights across the whole clip', () => {
    const { plan, prepared, sequence } = translate('if you want, do you go?');
    for (let t = 0; t <= plan.durationMs; t += 13) {
      expect(validateFace(samplePlan(plan, prepared, sequence, t).face), `at ${t}ms`).toEqual([]);
    }
  });

  it('takes the stronger weight where two markers overlap', () => {
    // A conditional and a question both raise the brows. Overlapping them must
    // raise the brows once, at the stronger of the two.
    const { plan, prepared, sequence } = translate('if you want, do you go?');
    let peak = 0;
    for (let t = 0; t <= plan.durationMs; t += 13) {
      peak = Math.max(peak, samplePlan(plan, prepared, sequence, t).face.browInnerUp ?? 0);
    }
    expect(peak).toBeGreaterThan(0.8);
    expect(peak).toBeLessThanOrEqual(1);
  });

  it('names the markers active at a time, for the interface', () => {
    const { plan, prepared, sequence } = translate('what is your name?');
    void prepared; void sequence;
    const mid = (plan.segments[0]!.strokeStartMs + plan.segments[0]!.strokeEndMs) / 2;
    expect(activeNonManual(plan.segments, plan.nmmSpans, mid)).toContain('wh_question');
    expect(activeNonManual(plan.segments, plan.nmmSpans, plan.durationMs)).toEqual([]);
  });
});

describe('plan playback', () => {
  const built = () => translate('hello my name is Evan');

  it('emits a valid pose at every point', () => {
    const { plan, prepared, sequence } = built();
    for (let t = 0; t <= plan.durationMs; t += 13) {
      expect(validatePose(samplePlan(plan, prepared, sequence, t).pose), `at ${t}ms`).toEqual([]);
    }
  });

  it('moves continuously with the markers layered on', () => {
    const { plan, prepared, sequence } = translate('what is your name?');
    let previous = solveFK(samplePlan(plan, prepared, sequence, 0).pose);
    for (let t = 4; t <= plan.durationMs; t += 4) {
      const current = solveFK(samplePlan(plan, prepared, sequence, t).pose);
      for (const joint of ['right_wrist', 'left_wrist', 'head']) {
        expect(vec3Distance(jointPosition(previous, joint), jointPosition(current, joint)),
          `${joint} at ${t}ms`).toBeLessThan(0.010);
      }
      previous = current;
    }
  });

  it('tracks the active segment for highlighting', () => {
    const { plan } = built();
    for (const segment of plan.segments) {
      const mid = (segment.strokeStartMs + segment.strokeEndMs) / 2;
      expect(activePlanSegment(plan, mid)?.index).toBe(segment.index);
    }
    expect(activePlanSegment(plan, plan.durationMs + 1)).toBeUndefined();
  });

  it('gets shorter as speed rises', () => {
    expect(planOf('hello my name is Evan', { speed: 2 }).durationMs)
      .toBeLessThan(planOf('hello my name is Evan', { speed: 1 }).durationMs);
  });

  it('pauses longer after a full stop than after nothing', () => {
    expect(planOf('hello.').durationMs).toBeGreaterThan(planOf('hello').durationMs);
  });
});

describe('words ASL carries in space', () => {
  it('drops a preposition with its own notice rather than spelling it', () => {
    // Spelling "w-i-t-h" is not what a signer does; it is what a system does
    // when it has run out of ideas. The notice says which kind of omission it
    // was, because "ASL does not sign this" and "ASL signs this with space we
    // have not built" are different admissions.
    const { plan } = translate('I go with you');
    expect(plan.glossLine).toBe('ME GO YOU');
    const spatial = plan.notices.find((n) => n.kind === 'spatial');
    expect(spatial?.message).toContain('with');
    expect(plan.notices.some((n) => n.kind === 'fingerspelled')).toBe(false);
  });

  it('keeps a word that has a sign, even if the stop list also lists it', () => {
    // SAME is both a sign and a word that often rides on space. Having a sign
    // wins, or the lexicon would be shadowed by the stop list.
    const { plan } = translate('same');
    expect(plan.glossLine).toBe('SAME');
  });

  it('still fingerspells a content word it has no sign for', () => {
    const { plan } = translate('my dog');
    expect(plan.glossLine).toBe('MY D-O-G');
    expect(plan.notices.some((n) => n.kind === 'fingerspelled')).toBe(true);
  });
});

describe('English coverage', () => {
  it('answers the great majority of the commonest English words', () => {
    // A floor, not a target. Measured properly by `pnpm coverage` against a
    // frequency list this project did not choose; this guards the number
    // against quiet regression when the lexicon or the stop lists change.
    const common = ['the', 'you', 'we', 'they', 'and', 'with', 'go', 'know',
      'time', 'day', 'work', 'good', 'new', 'more', 'can', 'want', 'see',
      'think', 'make', 'people', 'home', 'water', 'because', 'if', 'would'];
    const spelled = common.filter((word) => {
      const { plan } = translate(word);
      return plan.notices.some((n) => n.kind === 'fingerspelled');
    });
    expect(spelled).toEqual([]);
  });
});

describe('numbers in a sentence', () => {
  it('reads digits and number words as the same number', () => {
    expect(glossOf('42')).toBe('42');
    expect(glossOf('forty-two')).toBe('42');
    expect(glossOf('three hundred forty two')).toBe('342');
  });

  it('folds a number into the sign it counts, as ASL does', () => {
    // "Three weeks" is one sign with a three handshape, not THREE then WEEK.
    // This is the architecture's own claim under test: if a sign really is
    // handshape plus location plus orientation plus movement, incorporation
    // should be substituting one parameter.
    const plan = planOf('three weeks');
    expect(plan.glossLine).toBe('3-WEEK');
    expect(plan.segments).toHaveLength(1);
    expect(plan.notices.some((n) => n.kind === 'incorporated')).toBe(true);
  });

  it('stops incorporating past the range ASL does', () => {
    expect(glossOf('nineteen weeks')).toBe('19 WEEK');
  });

  it('only incorporates into signs that take it', () => {
    // English lets you say "three anything". ASL does not.
    expect(glossOf('three books')).toBe('3 BOOK');
  });

  it('signs a long number digit by digit rather than spelling it', () => {
    // Digits are not letters: fingerspelling a number would drop every
    // character on the floor, because the manual alphabet has no 5.
    expect(glossOf('5551234')).toBe('5 5 5 1 2 3 4');
  });

  it('leaves a number that is not one alone', () => {
    expect(glossOf('hundred')).toBe('H-U-N-D-R-E-D');
  });

  it('plays a composed number through the same sequencer as everything else', () => {
    const { plan, prepared, sequence } = translate('I go 5 days');
    expect(plan.glossLine).toBe('ME GO 5-DAY');
    for (let t = 0; t <= plan.durationMs; t += 17) {
      expect(validatePose(samplePlan(plan, prepared, sequence, t).pose), `at ${t}ms`).toEqual([]);
    }
  });
});

describe('markers that contradict each other', () => {
  it('keeps the brows raised through a negated conditional, and shakes the head', () => {
    // "If it is not good, I stop" is a conditional (brows up) containing a
    // negation (brows down). A signer does not compromise: the brows stay up
    // and the negation is carried by the headshake, which is its obligatory
    // part. The plan linter found this by noticing the two markers overlapped.
    const { plan, prepared, sequence } = translate('if it is not good, I stop');
    const conditional = plan.nmmSpans.find((s) => s.type === 'conditional')!;
    const negation = plan.nmmSpans.find((s) => s.type === 'negation')!;
    expect(conditional.fromIndex).toBeLessThanOrEqual(negation.toIndex);

    const segment = plan.segments[negation.fromIndex]!;
    const mid = (segment.strokeStartMs + segment.strokeEndMs) / 2;
    const { face, pose } = samplePlan(plan, prepared, sequence, mid);
    expect(face.browInnerUp ?? 0).toBeGreaterThan(0.4);
    expect(face.browDownLeft ?? 0).toBe(0);
    // The mouth still carries the negation, and so does the head.
    expect(face.mouthFrownLeft ?? 0).toBeGreaterThan(0);
    expect(pose.head).toBeDefined();
  });

  it('keeps the brows lowered when nothing raises them', () => {
    const { plan, prepared, sequence } = translate('I do not know');
    const negation = plan.nmmSpans.find((s) => s.type === 'negation')!;
    const segment = plan.segments[negation.fromIndex]!;
    const { face } = samplePlan(plan, prepared, sequence,
      (segment.strokeStartMs + segment.strokeEndMs) / 2);
    expect(face.browDownLeft ?? 0).toBeGreaterThan(0.3);
  });

  it('keeps every marker inside the segments it names', () => {
    const problems: string[] = [];
    for (const sentence of [
      'what is your name?', 'if you want, do you go?', 'no, I go home',
      'my mother, I love', 'yes I understand', 'I have three weeks',
    ]) {
      const plan = translate(sentence).plan;
      for (const finding of lintPlan(plan).filter((f) => f.severity === 'error')) {
        problems.push(`${sentence}: ${finding.message}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
