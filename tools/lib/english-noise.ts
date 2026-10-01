/**
 * Tokens in the frequency lists that are not words.
 *
 * The subtitle list was tokenised crudely: "don't" arrives as "don" and "t",
 * "I'll" as "i" and "ll". Those fragments are not vocabulary gaps, and counting
 * them would make the system look worse than it is -- the translator splits a
 * contraction itself and signs both halves. Names and filler are here too.
 *
 * Shared by the coverage and gap tools so the two cannot disagree about what
 * counts as a word.
 */
export const NOISE: ReadonlySet<string> = new Set([
  't', 's', 'll', 're', 've', 'd', 'm',
  'don', 'didn', 'doesn', 'isn', 'wasn', 'aren', 'weren', 'won', 'wouldn', 'couldn', 'shouldn',
  'ain', 'hadn', 'hasn', 'haven', 'mustn', 'needn', 'shan',
  'gonna', 'wanna', 'gotta', 'ya', 'yeah', 'yes', 'uh', 'oh', 'um', 'hm', 'hmm', 'ah', 'ha', 'huh',
  'ok', 'okay', 'hey', 'hi', 'mr', 'mrs', 'ms', 'dr', 'sir', 'lord', 'gt', 'lt', 'amp', 'nbsp',
]);
