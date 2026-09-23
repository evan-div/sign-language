/**
 * Numbers, built by rule rather than authored.
 *
 * A signed number is a short sequence of handshapes at one place, which means
 * it can be GENERATED. The library does not grow by a thousand entries to cover
 * a thousand numbers, and "42" does not need anybody to have thought about 42
 * in advance. This is the same bet as handshape-as-parameter, cashed out: if
 * the representation is right, whole categories of sign come out as composition
 * instead of data entry.
 *
 * ## What is a citation form and what is a rule
 *
 * 0 to 10 are citation forms and are as close to right as hand-authoring gets
 * here. 11 to 15 involve movement INSIDE the hand -- a flick, a bend, a wiggle
 * -- which this notation cannot express, so they are approximated by
 * alternating between two whole handshapes; they are the weakest entries and
 * are marked as such. 16 to 19 are a twist of the forearm over the 6-9 shapes.
 * 21 upward is the general digit-pair rule.
 *
 * ASL has idiomatic forms this rule gets wrong -- 21, 22, 23, 25, 66, 67 and
 * others have their own shapes or movements that are not just their digits in
 * sequence. Those are not special-cased. The rule is stated, its exceptions are
 * named here, and every generated number is marked `unvalidated` like
 * everything else.
 */

import type { SignDefinition, SignKeyframe, SignProvenance } from '../signs/definition.js';
import type { OrientationName } from '../signs/orientation.js';
import { digitHandshape, digitOrientation, TEN_HANDSHAPE } from './digits.js';

const GENERATED: SignProvenance = {
  source: 'generated',
  validation: 'unvalidated',
  note: 'Composed by rule from digit handshapes; idiomatic forms for 21-29, 66-69 and '
    + 'others are not special-cased.',
};

const APPROXIMATE: SignProvenance = {
  source: 'generated',
  validation: 'unvalidated',
  note: 'Numbers 11-15 move inside the hand -- a flick, a bend -- which this notation '
    + 'cannot express. Approximated by alternating two handshapes.',
};

/** Numbers are signed in one place, in front of the dominant shoulder. */
const PLACE = 'NEUTRAL_HIGH';
/**
 * Where a repeated digit goes.
 *
 * 99 composed as "F then F" is one handshape held twice, which shows the reader
 * a single 9. ASL shifts a doubled digit sideways rather than repeating it in
 * place, and the linter's motion check is what caught this -- it measured zero
 * fingertip travel across the whole sign.
 */
const SHIFTED_PLACE = 'SIDE_HIGH';

/** How long one digit is held, and how long it takes to change to the next. */
const HOLD_MS = 240;
const CHANGE_MS = 140;

/** The largest number this will compose. Past it, the caller spells the digits. */
export const MAX_COMPOSABLE = 999_999;

interface Part {
  readonly handshape: string;
  readonly orientation: OrientationName;
}

/** The 11-15 pair: the shape, and the shape it alternates with. */
const TEEN_ALTERNATES: Readonly<Record<number, [string, string]>> = Object.freeze({
  11: ['POINT', 'X'],
  12: ['V', 'BENT_V'],
  13: ['NUM_3', 'BENT_V'],
  14: ['FOUR', 'BENT_FLAT'],
  15: ['OPEN_5', 'BENT_FLAT'],
});

function partsFor(value: number): Part[] {
  if (value <= 9) {
    return [{ handshape: digitHandshape(value), orientation: digitOrientation(value) }];
  }
  if (value === 10) return [{ handshape: TEN_HANDSHAPE, orientation: 'PALM_OUT' }];
  if (value >= 16 && value <= 19) {
    // Sixteen to nineteen are the 6-9 shapes turned over: the handshape is the
    // ones digit, and the movement is the twist.
    const ones = value - 10;
    return [
      { handshape: digitHandshape(ones), orientation: 'PALM_IN' },
      { handshape: digitHandshape(ones), orientation: 'PALM_OUT' },
    ];
  }
  if (value === 20) {
    // Twenty is a pinching L, which this renders as the hand closing.
    return [
      { handshape: 'BENT_L', orientation: 'PALM_OUT' },
      { handshape: 'BABY_O', orientation: 'PALM_OUT' },
    ];
  }
  if (value <= 99) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    const parts: Part[] = [{ handshape: digitHandshape(tens), orientation: 'PALM_OUT' }];
    if (ones > 0) parts.push({ handshape: digitHandshape(ones), orientation: 'PALM_OUT' });
    return parts;
  }
  if (value <= 999) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    // C is the hundreds marker, as in "three C" for 300.
    return [
      { handshape: digitHandshape(hundreds), orientation: 'PALM_OUT' },
      { handshape: 'C', orientation: 'PALM_OUT' },
      ...(rest > 0 ? partsFor(rest) : []),
    ];
  }
  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  return [
    ...partsFor(thousands),
    { handshape: 'M', orientation: 'PALM_DOWN' },
    ...(rest > 0 ? partsFor(rest) : []),
  ];
}

/**
 * A sign for a whole number, or undefined when it is past what this composes.
 *
 * Returning undefined rather than guessing is the same rule the lexicon
 * follows: a number this cannot build is fingerspelled digit by digit, and the
 * user is told.
 */
export function numberSign(value: number): SignDefinition | undefined {
  if (!Number.isInteger(value) || value < 0 || value > MAX_COMPOSABLE) return undefined;

  const parts = partsFor(value);
  const teen = TEEN_ALTERNATES[value];

  const dominant: SignKeyframe[] = [];
  let at = 0;
  let place: string = PLACE;
  const push = (part: Part) => {
    dominant.push({
      atMs: at, location: place as never, handshape: part.handshape, orientation: part.orientation,
    });
  };

  if (teen) {
    // Eleven to fifteen: the same place, flicking between two shapes.
    const [base, flicked] = teen;
    const orientation: OrientationName = value <= 12 ? 'PALM_IN' : 'PALM_OUT';
    for (const handshape of [base, flicked, base, flicked, base]) {
      dominant.push({ atMs: at, location: PLACE, handshape, orientation });
      at += 130;
    }
    at -= 130;
  } else {
    for (const [i, part] of parts.entries()) {
      const previous = parts[i - 1];
      if (i > 0) at += CHANGE_MS;
      // A digit repeated immediately shifts to the side; otherwise every part
      // is made in the same place.
      place = previous && previous.handshape === part.handshape
        && previous.orientation === part.orientation
        ? (place === PLACE ? SHIFTED_PLACE : PLACE)
        : place;
      push(part);
      at += HOLD_MS;
      push(part);
    }
  }

  const durationMs = at;
  return {
    id: `NUM_${value}`,
    gloss: String(value),
    description: describe(value, parts),
    durationMs,
    strokeStartMs: Math.min(80, Math.round(durationMs * 0.2)),
    strokeEndMs: durationMs,
    dominant,
    // A one-part number is a handshape held up; nothing travels, and that is
    // the sign rather than a failure to build one.
    ...(parts.length === 1 && !teen ? { held: true } : {}),
    provenance: teen ? APPROXIMATE : GENERATED,
  };
}

function describe(value: number, parts: Part[]): string {
  if (value <= 10) return `The number ${value}.`;
  if (value >= 11 && value <= 15) return `The number ${value}, flicked. Approximated.`;
  if (value >= 16 && value <= 19) return `The number ${value}: the ${value - 10} hand turned over.`;
  if (value === 20) return 'The number 20: an L hand closing.';
  return `The number ${value}, as ${parts.map((p) => p.handshape).join(' then ')}.`;
}

/** Number signs already built, keyed by value. Composing is pure. */
const cache = new Map<number, SignDefinition | undefined>();

export function numberSignCached(value: number): SignDefinition | undefined {
  if (!cache.has(value)) cache.set(value, numberSign(value));
  return cache.get(value);
}
