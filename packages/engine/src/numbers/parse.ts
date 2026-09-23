/**
 * Reading numbers out of English.
 *
 * Both spellings have to work -- "42" and "forty-two" are the same number and a
 * user will type either -- and the parser has to be greedy across several
 * tokens, because "three hundred forty two" is one number and "three" followed
 * by "hundred" is not a thing anybody meant.
 *
 * Deliberately narrow. It reads whole cardinal numbers and nothing else: no
 * decimals, no ordinals, no years read as pairs ("nineteen eighty-four"), no
 * times, no phone numbers. Every one of those is signed differently in ASL, and
 * a parser that quietly turned 3.5 into 35, or 1984 into one thousand nine
 * hundred and eighty-four when a signer would sign "19 84", would be producing
 * confident nonsense. They are listed in the docs as gaps instead.
 */

const UNITS: Readonly<Record<string, number>> = Object.freeze({
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
});

const TENS: Readonly<Record<string, number>> = Object.freeze({
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
});

const SCALES: Readonly<Record<string, number>> = Object.freeze({
  hundred: 100, thousand: 1000,
});

export function isNumberWord(word: string): boolean {
  const lower = word.toLowerCase();
  return lower in UNITS || lower in TENS || lower in SCALES || /^\d{1,7}$/.test(lower);
}

export interface ParsedNumber {
  readonly value: number;
  /** How many tokens the number consumed. */
  readonly length: number;
}

/**
 * Read a number starting at `index`, or nothing.
 *
 * A hyphenated "forty-two" arrives as one token because the tokeniser keeps
 * hyphens inside words, so it is split here rather than there: the hyphen means
 * something different in "thank-you" and the tokeniser has no way to tell.
 */
export function parseNumber(words: readonly string[], index: number): ParsedNumber | undefined {
  let total = 0;
  let current = 0;
  let seen = false;
  let at = index;

  while (at < words.length) {
    const pieces = words[at]!.toLowerCase().split('-').filter(Boolean);
    let consumedAny = false;

    for (const piece of pieces) {
      if (/^\d{1,7}$/.test(piece)) {
        // A bare numeral stands alone: "3 hundred" is not English anybody types
        // and treating it as one would also swallow "route 3 hundred metres".
        if (seen) return finish(total, current, at - index);
        return { value: Number(piece), length: 1 };
      }
      if (piece in UNITS) { current += UNITS[piece]!; seen = true; consumedAny = true; continue; }
      if (piece in TENS) { current += TENS[piece]!; seen = true; consumedAny = true; continue; }
      if (piece in SCALES) {
        if (!seen) return undefined;
        const scale = SCALES[piece]!;
        if (scale === 100) current *= 100;
        else { total += current * scale; current = 0; }
        consumedAny = true;
        continue;
      }
      // A word inside a hyphenated run that is not a number ends the number.
      return seen ? finish(total, current, at - index) : undefined;
    }

    if (!consumedAny) break;
    at += 1;
  }

  return seen ? finish(total, current, at - index) : undefined;
}

function finish(total: number, current: number, length: number): ParsedNumber | undefined {
  if (length <= 0) return undefined;
  return { value: total + current, length };
}
