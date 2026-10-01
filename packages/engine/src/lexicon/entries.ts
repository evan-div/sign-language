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

import { VOCABULARY_ENTRIES, VOCABULARY_SYNONYMS } from './vocabulary.js';

export interface LexiconEntry {
  /** Lowercase lemma. May contain spaces for a phrase. */
  readonly lemma: string;
  readonly signId: string;
  /**
   * Further signs that follow `signId` to say this word.
   *
   * ASL builds a good many ordinary words from two signs in sequence: SON is
   * BOY then BABY, TEACHER is TEACH then PERSON, BREAKFAST is EAT then MORNING.
   * That is a fact about the language, not a shortcut, and modelling it as a
   * single sign would mean authoring a movement that does not exist. The entry
   * stays one English concept; the plan expands it to several segments.
   */
  readonly then?: readonly string[];
  /**
   * Which meaning this entry covers. Present only where a lemma has more than
   * one, and shown to the user when they are asked to choose.
   */
  readonly sense?: string;
}

/**
 * The first batch of entries, from before the vocabulary grew. The full table,
 * LEXICON, is these plus everything in vocabulary.ts.
 */
const CORE_LEXICON: readonly LexiconEntry[] = [
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

  // Pronouns and pointing.
  { lemma: 'we', signId: 'WE' },
  { lemma: 'us', signId: 'WE' },
  { lemma: 'our', signId: 'WE' },
  { lemma: 'they', signId: 'THEY' },
  { lemma: 'them', signId: 'THEY' },
  { lemma: 'their', signId: 'THEY' },
  { lemma: 'he', signId: 'HE_SHE' },
  { lemma: 'she', signId: 'HE_SHE' },
  { lemma: 'him', signId: 'HE_SHE' },
  { lemma: 'her', signId: 'HE_SHE' },
  { lemma: 'all', signId: 'ALL' },
  { lemma: 'every', signId: 'ALL' },
  { lemma: 'everything', signId: 'ALL' },

  // Question words.
  { lemma: 'who', signId: 'WHO' },
  { lemma: 'whom', signId: 'WHO' },
  { lemma: 'where', signId: 'WHERE' },
  { lemma: 'when', signId: 'WHEN' },
  { lemma: 'why', signId: 'WHY' },
  { lemma: 'how', signId: 'HOW' },

  // People.
  { lemma: 'person', signId: 'PERSON' },
  { lemma: 'people', signId: 'PERSON' },
  { lemma: 'someone', signId: 'PERSON' },
  { lemma: 'friend', signId: 'FRIEND' },
  { lemma: 'family', signId: 'FAMILY' },
  { lemma: 'mother', signId: 'MOTHER' },
  { lemma: 'mom', signId: 'MOTHER' },
  { lemma: 'mum', signId: 'MOTHER' },
  { lemma: 'father', signId: 'FATHER' },
  { lemma: 'dad', signId: 'FATHER' },
  { lemma: 'child', signId: 'CHILD' },
  { lemma: 'kid', signId: 'CHILD' },
  { lemma: 'man', signId: 'MAN' },
  { lemma: 'woman', signId: 'WOMAN' },

  // Greetings and politeness.
  { lemma: 'goodbye', signId: 'GOODBYE' },
  { lemma: 'bye', signId: 'GOODBYE' },
  { lemma: 'welcome', signId: 'WELCOME' },
  { lemma: 'excuse me', signId: 'EXCUSE_ME' },
  { lemma: 'excuse', signId: 'EXCUSE_ME' },

  // Verbs.
  { lemma: 'go', signId: 'GO' },
  { lemma: 'come', signId: 'COME' },
  { lemma: 'want', signId: 'WANT' },
  { lemma: 'need', signId: 'NEED' },
  { lemma: 'like', signId: 'LIKE' },
  { lemma: 'know', signId: 'KNOW' },
  { lemma: 'think', signId: 'THINK' },
  { lemma: 'understand', signId: 'UNDERSTAND' },
  { lemma: 'see', signId: 'SEE' },
  { lemma: 'look', signId: 'SEE' },
  { lemma: 'watch', signId: 'SEE' },
  { lemma: 'say', signId: 'SAY' },
  { lemma: 'tell', signId: 'SAY' },
  { lemma: 'talk', signId: 'SAY' },
  { lemma: 'ask', signId: 'ASK' },
  { lemma: 'give', signId: 'GIVE' },
  { lemma: 'make', signId: 'MAKE' },
  { lemma: 'work', signId: 'WORK' },
  { lemma: 'job', signId: 'WORK' },
  { lemma: 'play', signId: 'PLAY' },
  { lemma: 'eat', signId: 'EAT' },
  { lemma: 'food', signId: 'EAT' },
  { lemma: 'drink', signId: 'DRINK' },
  { lemma: 'sleep', signId: 'SLEEP' },
  { lemma: 'live', signId: 'LIVE' },
  { lemma: 'finish', signId: 'FINISH' },
  { lemma: 'done', signId: 'FINISH' },
  { lemma: 'stop', signId: 'STOP' },
  { lemma: 'wait', signId: 'WAIT' },

  // Feelings and qualities.
  { lemma: 'bad', signId: 'BAD' },
  { lemma: 'happy', signId: 'HAPPY' },
  { lemma: 'glad', signId: 'HAPPY' },
  { lemma: 'sad', signId: 'SAD' },
  { lemma: 'angry', signId: 'ANGRY' },
  { lemma: 'mad', signId: 'ANGRY' },
  { lemma: 'tired', signId: 'TIRED' },
  { lemma: 'sick', signId: 'SICK' },
  { lemma: 'ill', signId: 'SICK' },
  { lemma: 'hungry', signId: 'HUNGRY' },
  { lemma: 'beautiful', signId: 'BEAUTIFUL' },
  { lemma: 'pretty', signId: 'BEAUTIFUL' },
  { lemma: 'big', signId: 'BIG' },
  { lemma: 'large', signId: 'BIG' },
  { lemma: 'small', signId: 'SMALL' },
  { lemma: 'little', signId: 'SMALL' },
  { lemma: 'new', signId: 'NEW' },
  { lemma: 'same', signId: 'SAME' },
  { lemma: 'different', signId: 'DIFFERENT' },
  { lemma: 'true', signId: 'TRUE' },
  { lemma: 'real', signId: 'TRUE' },

  // Time.
  { lemma: 'now', signId: 'NOW' },
  { lemma: 'today', signId: 'TODAY' },
  { lemma: 'tomorrow', signId: 'TOMORROW' },
  { lemma: 'yesterday', signId: 'YESTERDAY' },
  { lemma: 'day', signId: 'DAY' },
  { lemma: 'night', signId: 'NIGHT' },
  { lemma: 'morning', signId: 'MORNING' },
  { lemma: 'week', signId: 'WEEK' },
  { lemma: 'year', signId: 'YEAR' },
  { lemma: 'time', signId: 'TIME' },
  { lemma: 'again', signId: 'AGAIN' },
  { lemma: 'more', signId: 'MORE' },

  // Places and things.
  { lemma: 'home', signId: 'HOME' },
  { lemma: 'school', signId: 'SCHOOL' },
  { lemma: 'house', signId: 'HOUSE' },
  { lemma: 'city', signId: 'CITY' },
  { lemma: 'town', signId: 'CITY' },
  { lemma: 'car', signId: 'CAR' },
  { lemma: 'drive', signId: 'CAR' },
  { lemma: 'book', signId: 'BOOK' },
  { lemma: 'water', signId: 'WATER' },
  { lemma: 'money', signId: 'MONEY' },
  { lemma: 'phone', signId: 'PHONE' },
  { lemma: 'call', signId: 'PHONE' },

  // Modals.
  { lemma: 'can', signId: 'CAN' },
  { lemma: 'able', signId: 'CAN' },
  { lemma: 'will', signId: 'WILL' },
  { lemma: 'maybe', signId: 'MAYBE' },
  { lemma: 'perhaps', signId: 'MAYBE' },
  { lemma: 'may', signId: 'MAYBE' },
  { lemma: 'might', signId: 'MAYBE' },
  { lemma: 'could', signId: 'CAN' },
  { lemma: 'would', signId: 'WILL' },
  { lemma: 'shall', signId: 'WILL' },
  { lemma: 'should', signId: 'NEED' },
  { lemma: 'must', signId: 'NEED' },
  { lemma: 'his', signId: 'HE_SHE' },
  { lemma: 'hers', signId: 'HE_SHE' },
];

/**
 * Every lexicon entry, with exact duplicates removed.
 *
 * An entry listed twice for the same lemma and sign would otherwise be read by
 * the resolver as two senses of one word -- which is to say, as an ambiguity
 * the user is asked to resolve between a sign and itself. With several hundred
 * entries in several files that is easy to do by accident, so it is made
 * impossible rather than checked for.
 */
export const LEXICON: readonly LexiconEntry[] = (() => {
  const seen = new Set<string>();
  return [...CORE_LEXICON, ...VOCABULARY_ENTRIES].filter((entry) => {
    const key = `${entry.lemma}|${entry.signId}|${(entry.then ?? []).join('+')}|${entry.sense ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();

/**
 * English words with no sign of their own that another entry covers.
 *
 * Resolving through one of these is a change of meaning, however small, so the
 * user is told when it happens rather than being handed a sign they did not ask
 * for.
 */
const CORE_SYNONYMS: Readonly<Record<string, string>> = {
  greetings: 'hello',
  howdy: 'hello',
  assist: 'help',
  aid: 'help',
  excellent: 'good',
  great: 'good',
  adore: 'love',
  apologise: 'sorry',
  apologize: 'sorry',
  apologies: 'sorry',
  // Added with the hundred-sign vocabulary. Each one is a real change of
  // meaning, which is why they are here and not in the lexicon proper: the
  // user is told when one is used.
  depart: 'go',
  leave: 'go',
  arrive: 'come',
  wish: 'want',
  desire: 'want',
  require: 'need',
  enjoy: 'like',
  comprehend: 'understand',
  realise: 'understand',
  realize: 'understand',
  observe: 'see',
  speak: 'say',
  mention: 'say',
  request: 'ask',
  query: 'ask',
  build: 'make',
  create: 'make',
  employment: 'work',
  reside: 'live',
  complete: 'finish',
  cease: 'stop',
  halt: 'stop',
  awful: 'bad',
  terrible: 'bad',
  furious: 'angry',
  exhausted: 'tired',
  unwell: 'sick',
  gorgeous: 'beautiful',
  huge: 'big',
  enormous: 'big',
  tiny: 'small',
  identical: 'same',
  dwelling: 'house',
  automobile: 'car',
  vehicle: 'car',
  cash: 'money',
  telephone: 'phone',
  companion: 'friend',
};

/**
 * Every synonym. Where a word is also a direct lexicon entry the direct entry
 * wins, because the resolver looks there first; the table is for words that
 * have no sign of their own.
 */
export const SYNONYMS: Readonly<Record<string, string>> = Object.freeze({
  ...CORE_SYNONYMS,
  ...VOCABULARY_SYNONYMS,
  infant: 'baby',
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

/**
 * Words ASL carries in space or on the face rather than in a lexical sign.
 *
 * Prepositions largely become where a thing is put in the signing space;
 * conjunctions become a pause, a head tilt or a brow raise; "it" and "there"
 * become a point. None of that is built yet, and none of it is fingerspelling:
 * spelling "w-i-t-h" is not what a signer does, it is what a system does when
 * it has run out of ideas.
 *
 * So they are dropped, and the notice says which kind of dropping it was. That
 * distinction is the honest one to surface -- "ASL does not sign this" and
 * "ASL signs this with space we have not built" are different admissions, and
 * the second is a roadmap item rather than a fact about the language.
 *
 * Measured against the 2,000 most frequent English words, these are the
 * difference between answering 10% of them and answering 63%.
 */
export const SPATIALLY_EXPRESSED: ReadonlySet<string> = new Set([
  // Prepositions: position in the signing space.
  'in', 'on', 'at', 'into', 'onto', 'from', 'with', 'by', 'about', 'over',
  'under', 'through', 'between', 'around', 'near', 'off', 'up', 'down',
  'out', 'after', 'before', 'during', 'without', 'within', 'against',
  // Conjunctions and discourse glue: pauses, head tilts, brow movement.
  'and', 'but', 'or', 'so', 'then', 'than', 'because', 'if', 'while', 'as', 'for',
  'although', 'though', 'however', 'also', 'too', 'just', 'only', 'very',
  // Pointing, once loci exist.
  'it', 'its', 'this', 'that', 'these', 'those', 'there', 'here', 'which',
  'some', 'any', 'each', 'both', 'other', 'such', 'own', 'same',
]);

/**
 * Signs that are themselves a negation.
 *
 * NO is one, but so is DON'T-KNOW: it is a single lexical sign that already
 * means "not know", and like NO it is made with a headshake. The plan used to
 * look for the NO sign specifically, so folding "not know" into one sign
 * silently removed the negation marker from "I don't know". Anything that
 * negates belongs here.
 */
export const NEGATING_SIGNS: ReadonlySet<string> = new Set(['NO', 'DONT_KNOW']);

/**
 * Words and phrases that address the person rather than say something about the
 * world, and so are never a topic however a comma falls after them.
 *
 * A clause before a comma is taken to be a fronted topic, which is right for
 * "my mother, I love" and wrong for "good morning, my brother", where the
 * comma is just punctuation after a greeting. This is the narrow exception for
 * the second case, in lemma form as the translator sees it.
 */
export const DISCOURSE_PHRASES: ReadonlySet<string> = new Set([
  'hello', 'hi', 'hey', 'goodbye', 'bye', 'thank you', 'thanks', 'please', 'sorry', 'welcome',
  'excuse me', 'good morning', 'good night', 'see you later', 'yes', 'no', 'how you', 'nice meet you',
]);

/** Question words, which move to the end of the clause in ASL. */
export const WH_WORDS: ReadonlySet<string> = new Set([
  'what', 'who', 'where', 'when', 'why', 'how', 'which',
]);

/**
 * Irregular forms no suffix rule gets right.
 *
 * Checked before any stripping: "went" is not "wen", and trying to derive it
 * would only produce false matches. Forms the suffix rules DO get right are
 * deliberately absent, so this stays a list of exceptions and not a second
 * lemmatiser.
 */
export const IRREGULAR_LEMMAS: Readonly<Record<string, string>> = Object.freeze({
  // be
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  // do, have
  does: 'do', did: 'do', doing: 'do', has: 'have', had: 'have', having: 'have',
  // go and its parts
  goes: 'go', going: 'go', gone: 'go', went: 'go',
  // the commonest irregular verbs
  got: 'get', gotten: 'get', getting: 'get', gets: 'get',
  took: 'take', taken: 'take', taking: 'take',
  gave: 'give', given: 'give', giving: 'give',
  made: 'make', making: 'make',
  came: 'come', coming: 'come', became: 'become',
  saw: 'see', seen: 'see', seeing: 'see',
  said: 'say', says: 'say', saying: 'say', told: 'tell', telling: 'tell',
  thought: 'think', thinking: 'think', knew: 'know', known: 'know', knowing: 'know',
  found: 'find', finding: 'find', felt: 'feel', feeling: 'feel',
  heard: 'hear', ate: 'eat', eaten: 'eat', eating: 'eat',
  drank: 'drink', drunk: 'drink', drinking: 'drink',
  wrote: 'write', written: 'write', writing: 'write', read: 'read',
  bought: 'buy', buying: 'buy', sold: 'sell', selling: 'sell', paid: 'pay', paying: 'pay',
  met: 'meet', meeting: 'meet', lost: 'lose', losing: 'lose',
  slept: 'sleep', sleeping: 'sleep', stood: 'stand', sat: 'sit', sitting: 'sit',
  ran: 'run', running: 'run', began: 'begin', begun: 'begin', broke: 'break', broken: 'break',
  spoke: 'speak', spoken: 'speak', brought: 'bring', sent: 'send', kept: 'keep',
  leaving: 'leave', lived: 'live', living: 'live',
  taught: 'teach', chose: 'choose', chosen: 'choose', fell: 'fall', fallen: 'fall',
  drove: 'car', driven: 'car', driving: 'car',
  // pronouns and determiners
  my: 'my', mine: 'mine', his: 'he', hers: 'she', its: 'it', ours: 'we', theirs: 'they',
  // plurals
  children: 'child', men: 'man', women: 'woman', mice: 'mouse', feet: 'foot', teeth: 'tooth',
  // forms the old table carried
  names: 'name', signs: 'sign', thanks: 'thanks',
  learned: 'learn', learning: 'learn', loved: 'love', loving: 'love',
  helped: 'help', helping: 'help', signed: 'sign', signing: 'sign',
  studied: 'study', studying: 'study',
});
