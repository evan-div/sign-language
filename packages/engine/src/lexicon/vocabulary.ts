/**
 * Lexicon entries for the vocabulary beyond the first hundred signs.
 *
 * Kept apart from the core table so the whole mapping can be read, argued with
 * and reviewed in one place. Three kinds of entry, in rising order of how much
 * they claim:
 *
 *  - DIRECT: an English word that has its own sign.
 *  - COMPOUND: an English word ASL says with two or three signs in sequence.
 *    SON is BOY then BABY, TEACHER is TEACH then PERSON. That is how the
 *    language builds them, so the lexicon says so rather than pretending there
 *    is a single movement.
 *  - SYNONYM: an English word with NO sign of its own that is close enough to
 *    one that has. These are real changes of meaning, however small, so the
 *    interface says when one is used instead of quietly handing over a sign the
 *    user did not ask for. They live in a separate table for that reason.
 *
 * Nothing here is reviewed by a Deaf signer.
 */

import type { LexiconEntry } from './entries.js';

type Direct = readonly [signId: string, lemmas: readonly string[]];
type Compound = readonly [lemmas: readonly string[], signs: readonly string[]];

const DIRECT: readonly Direct[] = [
  // people and family
  ['BOY', ['boy']], ['GIRL', ['girl']], ['BABY', ['baby']], ['MARRY', ['marry', 'wedding', 'married']],
  ['TEACH', ['teach']], ['UNCLE', ['uncle']], ['AUNT', ['aunt']],
  ['GROUP', ['group']], ['CLASS', ['class', 'classroom']], ['TEAM', ['team']],
  ['ORGANIZATION', ['organization', 'organisation']],
  ['DOCTOR', ['doctor', 'dr']], ['NURSE', ['nurse']], ['POLICE', ['police', 'cop']],
  ['KING', ['king']], ['QUEEN', ['queen']], ['BOSS', ['boss']],
  ['HEARING', ['hearing']], ['BLIND', ['blind']],

  // body, health, feelings
  ['EYE', ['eye']], ['EAR', ['ear', 'hear']], ['NOSE', ['nose']], ['MOUTH', ['mouth']],
  ['TOOTH', ['tooth']], ['NECK', ['neck']], ['HAIR', ['hair']], ['FACE', ['face']],
  ['STOMACH', ['stomach']], ['BODY', ['body']], ['PAIN', ['pain', 'hurt']],
  ['MEDICINE', ['medicine']], ['HOSPITAL', ['hospital']], ['PREGNANT', ['pregnant']],
  ['DIE', ['die', 'dead', 'death']], ['STRONG', ['strong']],
  ['SMILE', ['smile']], ['LAUGH', ['laugh']], ['CRY', ['cry']],
  ['EXCITED', ['excited']], ['PROUD', ['proud']], ['SURPRISED', ['surprised', 'surprise']],
  ['SCARED', ['scared', 'afraid']], ['NERVOUS', ['nervous']], ['WORRY', ['worry']],
  ['HATE', ['hate']], ['BORED', ['bored']], ['THIRSTY', ['thirsty']],

  // colours and qualities
  ['RED', ['red']], ['BLUE', ['blue']], ['GREEN', ['green']], ['YELLOW', ['yellow']],
  ['PURPLE', ['purple']], ['PINK', ['pink']], ['BROWN', ['brown']], ['BLACK', ['black']],
  ['WHITE', ['white']], ['ORANGE', ['orange']], ['COLOR', ['color', 'colour']],
  ['HOT', ['hot']], ['COLD', ['cold']], ['HEAVY', ['heavy']], ['FAST', ['fast']], ['SLOW', ['slow']],
  ['OLD', ['old']], ['YOUNG', ['young']], ['HARD', ['hard']], ['EASY', ['easy']],
  ['CLEAN', ['clean', 'nice']], ['DIRTY', ['dirty']], ['QUIET', ['quiet']], ['READY', ['ready']],
  ['BUSY', ['busy']], ['IMPORTANT', ['important']], ['FUNNY', ['funny']], ['CRAZY', ['crazy']],
  ['WRONG', ['wrong']], ['FINE', ['fine']], ['FAT', ['fat']],

  // verbs
  ['HAVE', ['have']], ['GET', ['get']], ['SEND', ['send']], ['SHOW', ['show']], ['PAY', ['pay']],
  ['BUY', ['buy']], ['SELL', ['sell']], ['OPEN', ['open']], ['CLOSE', ['close']],
  ['PUSH', ['push']], ['PULL', ['pull']], ['WALK', ['walk']], ['TRAVEL', ['travel']],
  ['PLANE', ['plane', 'airplane']], ['SIT', ['sit']], ['STAND', ['stand']], ['DANCE', ['dance']],
  ['SING', ['sing', 'song', 'music']], ['LISTEN', ['listen']], ['FEEL', ['feel']], ['FORGET', ['forget']],
  ['DECIDE', ['decide']], ['CHOOSE', ['choose']], ['FIND', ['find']], ['TRY', ['try']],
  ['READ', ['read']], ['WRITE', ['write']], ['STUDY', ['study']], ['MEET', ['meet']], ['VISIT', ['visit']],
  ['CHANGE', ['change']], ['BREAK', ['break']], ['CUT', ['cut']], ['LOSE', ['lose']], ['COOK', ['cook']],
  ['START', ['start', 'begin']], ['JUMP', ['jump']], ['FALL', ['fall']], ['BORN', ['born', 'birth']],

  // time
  ['MONDAY', ['monday']], ['TUESDAY', ['tuesday']], ['WEDNESDAY', ['wednesday']], ['THURSDAY', ['thursday']],
  ['FRIDAY', ['friday']], ['SATURDAY', ['saturday']], ['SUNDAY', ['sunday']],
  ['SUMMER', ['summer']], ['WINTER', ['winter']], ['MONTH', ['month']], ['NOON', ['noon']],
  ['LATER', ['later']], ['ALWAYS', ['always']],

  // food
  ['BREAD', ['bread']], ['MILK', ['milk']], ['COFFEE', ['coffee']], ['MEAT', ['meat']], ['CHEESE', ['cheese']],
  ['APPLE', ['apple']], ['FRUIT', ['fruit']], ['VEGETABLE', ['vegetable']], ['EAT', ['food']],

  // animals and nature
  ['DOG', ['dog']], ['CAT', ['cat']], ['BIRD', ['bird']], ['DUCK', ['duck']], ['HORSE', ['horse']],
  ['COW', ['cow']], ['PIG', ['pig']], ['MOUSE', ['mouse']], ['ELEPHANT', ['elephant']], ['BEAR', ['bear']],
  ['SNAKE', ['snake']], ['DEER', ['deer']], ['FISH', ['fish']], ['ANIMAL', ['animal']],
  ['SUN', ['sun']], ['MOON', ['moon']], ['STAR', ['star']], ['SKY', ['sky']], ['RAIN', ['rain']],
  ['SNOW', ['snow']], ['WIND', ['wind']], ['FIRE', ['fire']], ['TREE', ['tree']], ['FLOWER', ['flower']],
  ['WEATHER', ['weather']], ['WORLD', ['world']],

  // places and things
  ['ROOM', ['room']], ['DOOR', ['door']], ['BED', ['bed']], ['TABLE', ['table']], ['CHAIR', ['chair']],
  ['CHURCH', ['church']], ['ROAD', ['road', 'street']], ['THING', ['thing']], ['PAPER', ['paper']],
  ['GAME', ['game']], ['CLOTHES', ['clothes']], ['LANGUAGE', ['language']], ['ANSWER', ['answer']],
  ['PROBLEM', ['problem']], ['IDEA', ['idea']], ['LIFE', ['life']], ['GOD', ['god']], ['LAW', ['law']],
  ['TRAIN', ['train']], ['BIKE', ['bike', 'bicycle']],
  ['BATHROOM', ['bathroom', 'toilet', 'restroom']], ['LIBRARY', ['library']], ['KITCHEN', ['kitchen']],
  ['CHRISTMAS', ['christmas']], ['HERE', ['here']],

  // quantity
  ['MANY', ['many']], ['MUCH', ['much', 'lot']], ['NOTHING', ['nothing']], ['ANOTHER', ['another']],

  // direction. UP and DOWN are reached only by unambiguous direction words:
  // the plain words are mostly particles ("pick up", "sit down") and signing
  // them would be worse than the dropping they get today.
  ['UP', ['upward', 'upstairs']], ['DOWN', ['downward', 'downstairs']],
];

/**
 * Words ASL builds from several signs.
 *
 * The component signs are real entries in the library; the compound is only
 * ever a sequence of them.
 */
const COMPOUNDS: readonly Compound[] = [
  [['son'], ['BOY', 'BABY']],
  [['daughter'], ['GIRL', 'BABY']],
  [['brother'], ['BOY', 'SAME_INDEX']],
  [['sister'], ['GIRL', 'SAME_INDEX']],
  [['grandmother', 'grandma'], ['MOTHER', 'GRAND']],
  [['grandfather', 'grandpa'], ['FATHER', 'GRAND']],
  [['husband'], ['MAN', 'MARRY']],
  [['wife'], ['WOMAN', 'MARRY']],
  [['parent'], ['MOTHER', 'FATHER']],
  [['teacher'], ['TEACH', 'PERSON']],
  [['student'], ['LEARN', 'PERSON']],
  [['lawyer'], ['LAW', 'PERSON']],
  [['driver'], ['CAR', 'PERSON']],
  [['everyone', 'everybody'], ['ALL', 'PERSON']],
  [['breakfast'], ['EAT', 'MORNING']],
  [['lunch'], ['NOON', 'EAT']],
  [['dinner', 'supper'], ['EAT', 'NIGHT']],
  [['tonight'], ['TODAY', 'NIGHT']],

  // Phrases, written in the form the translator actually sees: after function
  // words such as "are" and "to" have been dropped, so "how are you" arrives as
  // "how you" and "nice to meet you" as "nice meet you".
  [['how you'], ['HOW', 'YOU']],
  [['nice meet you'], ['CLEAN', 'MEET', 'YOU']],
  [['good morning'], ['GOOD', 'MORNING']],
  [['good night'], ['GOOD', 'NIGHT']],
  [['see you later'], ['SEE', 'YOU', 'LATER']],
];

/** Phrases that are one sign: the longest-match lookup picks them up unaided. */
const PHRASE_SIGNS: readonly Direct[] = [
  ['I_LOVE_YOU', ['i love you']],
  ['DONT_KNOW', ['not know']],
];

/** "left" is the one genuine ambiguity this batch introduces. */
const AMBIGUOUS: readonly LexiconEntry[] = [
  { lemma: 'left', signId: 'LEFT', sense: 'the direction' },
  { lemma: 'left', signId: 'GO', sense: 'went away' },
];

export const VOCABULARY_ENTRIES: readonly LexiconEntry[] = [
  ...DIRECT.flatMap(([signId, lemmas]) => lemmas.map((lemma) => ({ lemma, signId }))),
  ...PHRASE_SIGNS.flatMap(([signId, lemmas]) => lemmas.map((lemma) => ({ lemma, signId }))),
  ...COMPOUNDS.flatMap(([lemmas, signs]) =>
    lemmas.map((lemma) => ({ lemma, signId: signs[0]!, then: signs.slice(1) }))),
  ...AMBIGUOUS,
];

/**
 * Words with no sign of their own that another entry covers.
 *
 * Each is a small change of meaning, which is why the interface says so when
 * one is used. They are kept to cases where the ASL sign genuinely covers the
 * English word, rather than any word that merely feels related.
 */
export const VOCABULARY_SYNONYMS: Readonly<Record<string, string>> = Object.freeze({
  // speed, size, temperature, age
  quick: 'fast', rapid: 'fast', speedy: 'fast',
  giant: 'big', warm: 'hot', boiling: 'hot', cool: 'cold', freezing: 'cold', chilly: 'cold',
  elderly: 'old', youth: 'young',
  // feeling
  joyful: 'happy', upset: 'sad', unhappy: 'sad', frightened: 'scared', terrified: 'scared',
  anxious: 'nervous', thrilled: 'excited', shocked: 'surprised', amazed: 'surprised', boring: 'bored',
  weep: 'cry', grin: 'smile', ache: 'pain', sore: 'pain',
  // condition
  silent: 'quiet', calm: 'quiet', tough: 'hard', difficult: 'hard', simple: 'easy',
  tidy: 'clean', filthy: 'dirty', messy: 'dirty', prepared: 'ready', occupied: 'busy',
  critical: 'important', vital: 'important', major: 'important', silly: 'funny', hilarious: 'funny',
  incorrect: 'wrong', mistake: 'wrong',
  // verbs
  take: 'get', obtain: 'get', receive: 'get', grab: 'get', own: 'have', possess: 'have',
  mail: 'send', display: 'show', demonstrate: 'show', spend: 'pay', purchase: 'buy', shut: 'close',
  stroll: 'walk', hike: 'walk', journey: 'travel', trip: 'travel', fly: 'plane', flight: 'plane',
  pick: 'choose', select: 'choose', determine: 'decide', attempt: 'try', encounter: 'meet',
  alter: 'change', switch: 'change', smash: 'break', slice: 'cut', chop: 'cut', bake: 'cook',
  fry: 'cook', boil: 'cook', hop: 'jump', leap: 'jump', drop: 'fall', commence: 'start',
  // time
  afterwards: 'later', eventually: 'later', forever: 'always', constantly: 'always', midday: 'noon',
  // things and places
  desk: 'table', seat: 'chair', highway: 'road', stuff: 'thing', object: 'thing', item: 'thing',
  page: 'paper', document: 'paper', clothing: 'clothes', reply: 'answer', respond: 'answer',
  trouble: 'problem', issue: 'problem', lord: 'god', subway: 'train', cycle: 'bike',
  earth: 'world', globe: 'world', planet: 'world', aeroplane: 'plane', jet: 'plane',
  // animals, food
  puppy: 'dog', kitten: 'cat', beef: 'meat', steak: 'meat', veggies: 'vegetable', toast: 'bread',
  medication: 'medicine', drug: 'medicine', pill: 'medicine', illness: 'sick', disease: 'sick',
  // quantity
  plenty: 'many', numerous: 'many', several: 'many', none: 'nothing',
  // certainty and praise: ASL's TRUE and GOOD cover these in ordinary use
  sure: 'true', really: 'true', truly: 'true', certainly: 'true',
  wonderful: 'good', fantastic: 'good', awesome: 'good', perfect: 'good',
  // pronoun-ish
  lips: 'mouth', throat: 'neck', belly: 'stomach', tummy: 'stomach',
});
