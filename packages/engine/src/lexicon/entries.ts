/**
 * The English-to-sign lexicon.
 *
 * The important thing here is what it is NOT: a map from word to animation.
 * English maps to signs many-to-many, through a sense. That is what makes
 * "right" work -- it is three different signs depending on meaning, and the
 * system has to know that rather than silently picking one.
 *
 * Entries are keyed by lemma, which may be several words: "thank you" is one
 * lexical sign, not THANK followed by YOU, and longest-match lookup is what
 * makes that fall out without special-casing.
 */

export interface LexiconEntry {
  /** Lowercase lemma. May contain spaces for a phrase. */
  readonly lemma: string;
  readonly signId: string;
  /**
   * Which meaning this entry covers. Present only where a lemma has more than
   * one, and shown to the user when they are asked to choose.
   */
  readonly sense?: string;
}

export const LEXICON: readonly LexiconEntry[] = [
  { lemma: 'hello', signId: 'HELLO' },
  { lemma: 'hi', signId: 'HELLO' },
  { lemma: 'hey', signId: 'HELLO' },
  { lemma: 'my', signId: 'MY' },
  { lemma: 'mine', signId: 'MY' },
  { lemma: 'name', signId: 'NAME' },
  { lemma: 'thank you', signId: 'THANK-YOU' },
  { lemma: 'thanks', signId: 'THANK-YOU' },
  { lemma: 'thank', signId: 'THANK-YOU' },
  { lemma: 'you', signId: 'YOU' },
  { lemma: 'your', signId: 'YOUR' },
  { lemma: 'yours', signId: 'YOUR' },
  { lemma: 'i', signId: 'ME' },
  { lemma: 'me', signId: 'ME' },
  { lemma: 'what', signId: 'WHAT' },
  { lemma: 'yes', signId: 'YES' },
  { lemma: 'no', signId: 'NO' },
  { lemma: 'not', signId: 'NO' },
  { lemma: 'please', signId: 'PLEASE' },
  { lemma: 'sorry', signId: 'SORRY' },
  { lemma: 'good', signId: 'GOOD' },
  { lemma: 'love', signId: 'LOVE' },
  { lemma: 'learn', signId: 'LEARN' },
  { lemma: 'deaf', signId: 'DEAF' },
  { lemma: 'help', signId: 'HELP' },
  { lemma: 'sign', signId: 'SIGN' },

  // The ambiguity case. Neither is primary, so the resolver refuses to guess.
  { lemma: 'right', signId: 'RIGHT_CORRECT', sense: 'correct' },
  { lemma: 'right', signId: 'RIGHT_DIRECTION', sense: 'the direction' },
  { lemma: 'correct', signId: 'RIGHT_CORRECT' },
];

/**
 * English words with no sign of their own that another entry covers.
 *
 * Resolving through one of these is a change of meaning, however small, so the
 * user is told when it happens rather than being handed a sign they did not ask
 * for.
 */
export const SYNONYMS: Readonly<Record<string, string>> = Object.freeze({
  greetings: 'hello',
  howdy: 'hello',
  assist: 'help',
  aid: 'help',
  excellent: 'good',
  great: 'good',
  nice: 'good',
  adore: 'love',
  apologise: 'sorry',
  apologize: 'sorry',
  apologies: 'sorry',
  study: 'learn',
});

/**
 * Words ASL does not sign.
 *
 * Articles and the copula carry no meaning that ASL expresses manually, so
 * dropping them is translation rather than omission -- but the interface still
 * says which words were dropped, because the user is entitled to know their
 * sentence changed.
 */
export const FUNCTION_WORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did',
  'of', 'to',
]);

/** Question words, which move to the end of the clause in ASL. */
export const WH_WORDS: ReadonlySet<string> = new Set([
  'what', 'who', 'where', 'when', 'why', 'how', 'which',
]);

/** Irregular forms the suffix rules in normalize.ts would get wrong. */
export const IRREGULAR_LEMMAS: Readonly<Record<string, string>> = Object.freeze({
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be',
  my: 'my', mine: 'mine', his: 'his', hers: 'hers', its: 'its',
  names: 'name', signs: 'sign', thanks: 'thanks',
  learned: 'learn', learning: 'learn', loved: 'love', loving: 'love',
  helped: 'help', helping: 'help', signed: 'sign', signing: 'sign',
  studied: 'study', studying: 'study',
});
