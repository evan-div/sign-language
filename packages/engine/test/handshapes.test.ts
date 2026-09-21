import { describe, it, expect } from 'vitest';
import { solveFK, tipPosition, jointPosition, vec3Distance, validatePose,
  fingerDirection, palmNormal, type Vec3 } from '@signflow/motion-format';
import { ASL_LETTERS, compileHandshape, letterSpec, hasLetter, MOVING_LETTERS } from '../src/index.js';

/**
 * Handshapes are authored as joint rotations, so the only honest way to check
 * them is to solve the chain and measure the result. Each assertion below is
 * the geometric property that makes the letter that letter.
 */
const solveLetter = (letter: string) => solveFK(compileHandshape(ASL_LETTERS[letter]!, 'right'));
const tip = (s: ReturnType<typeof solveFK>, f: string) => tipPosition(s, `right_${f}_tip`);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const FINGERS = ['index', 'middle', 'ring', 'pinky'] as const;

/**
 * Wrist-to-fingertip distance, as a fraction of that finger's fully extended
 * reach.
 *
 * Measuring from the wrist rather than the knuckle matters: knuckle-to-tip
 * distance is invariant to knuckle rotation, so it cannot tell a finger folded
 * flat against the palm from one standing straight up. Reach captures both.
 */
const BIND = solveFK({});
const FULL_REACH: Record<string, number> = Object.fromEntries(
  FINGERS.map((f) => [f, vec3Distance(tipPosition(BIND, `right_${f}_tip`), jointPosition(BIND, 'right_wrist'))]),
);
const reach = (s: ReturnType<typeof solveFK>, f: string) =>
  vec3Distance(tip(s, f), jointPosition(s, 'right_wrist')) / FULL_REACH[f]!;

/** A finger standing straight out from the hand. */
const EXTENDED = 0.9;
/** A finger folded down against the palm. */
const CLOSED = 0.5;
/** Anything below this is not being presented as an extended finger. */
const NOT_EXTENDED = 0.7;
const PINCH_MAX = 0.02;

describe('the manual alphabet', () => {
  it('covers all 26 letters', () => {
    expect(Object.keys(ASL_LETTERS)).toHaveLength(26);
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') expect(hasLetter(ch)).toBe(true);
  });

  it('looks letters up case-insensitively', () => {
    expect(letterSpec('e')?.id).toBe('E');
    expect(letterSpec('4')).toBeUndefined();
  });

  it('marks J and Z as the moving letters', () => {
    expect([...MOVING_LETTERS].sort()).toEqual(['J', 'Z']);
  });

  it('compiles every letter to a valid pose on both hands', () => {
    for (const [name, spec] of Object.entries(ASL_LETTERS)) {
      for (const hand of ['left', 'right'] as const) {
        const problems = validatePose(compileHandshape(spec, hand));
        expect(problems, `${name} (${hand})`).toEqual([]);
      }
    }
  });

  it('drives all fifteen joints of the hand for every letter', () => {
    for (const [name, spec] of Object.entries(ASL_LETTERS)) {
      const joints = Object.keys(compileHandshape(spec, 'right'))
        .filter((j) => /(index|middle|ring|pinky|thumb)[123]$/.test(j));
      expect(joints, name).toHaveLength(15);
    }
  });

  it('mirrors to the left hand without changing finger flexion', () => {
    // Both hands curl the same way; only lateral terms flip.
    for (const letter of ['A', 'B', 'V', 'F']) {
      const r = solveFK(compileHandshape(ASL_LETTERS[letter]!, 'right'));
      const l = solveFK(compileHandshape(ASL_LETTERS[letter]!, 'left'));
      for (const finger of FINGERS) {
        const rr = vec3Distance(tipPosition(r, `right_${finger}_tip`), jointPosition(r, 'right_wrist'));
        const lr = vec3Distance(tipPosition(l, `left_${finger}_tip`), jointPosition(l, 'left_wrist'));
        expect(lr, `${letter}/${finger}`).toBeCloseTo(rr, 6);
      }
    }
  });
});

describe('closed handshapes', () => {
  it.each(['A', 'S', 'E', 'M', 'N', 'T'])('%s folds every finger against the palm', (letter) => {
    const s = solveLetter(letter);
    for (const finger of FINGERS) {
      expect(reach(s, finger), `${letter}/${finger}`).toBeLessThan(CLOSED);
    }
  });

  it('A holds the thumb clear of the fist, S clamps it across', () => {
    // Both are fists; the thumb is the only thing that distinguishes them.
    const a = solveLetter('A');
    const sh = solveLetter('S');
    expect(vec3Distance(tip(a, 'thumb'), tip(sh, 'thumb'))).toBeGreaterThan(0.02);
  });
});

describe('extended handshapes', () => {
  it('B extends all four fingers and keeps them together', () => {
    const s = solveLetter('B');
    for (const finger of FINGERS) {
      expect(reach(s, finger), finger).toBeGreaterThan(EXTENDED);
    }
    expect(vec3Distance(tip(s, 'index'), tip(s, 'middle'))).toBeLessThan(0.035);
  });

  it.each([['I', 'pinky'], ['L', 'index'], ['D', 'index'], ['G', 'index'], ['Z', 'index']])(
    '%s extends only the %s', (letter, extended) => {
      const s = solveLetter(letter);
      expect(reach(s, extended!), `${letter}/${extended}`).toBeGreaterThan(EXTENDED);
      for (const finger of FINGERS) {
        if (finger === extended) continue;
        expect(reach(s, finger), `${letter}/${finger}`).toBeLessThan(NOT_EXTENDED);
      }
    });

  it('Y extends the pinky and the thumb, nothing else', () => {
    const s = solveLetter('Y');
    expect(reach(s, 'pinky')).toBeGreaterThan(EXTENDED);
    expect(reach(s, 'index')).toBeLessThan(CLOSED);
    // The thumb reaches well away from the closed fingers.
    expect(vec3Distance(tip(s, 'thumb'), tip(s, 'index'))).toBeGreaterThan(0.06);
  });

  it('W extends three fingers and folds the pinky', () => {
    const s = solveLetter('W');
    for (const finger of ['index', 'middle', 'ring']) {
      expect(reach(s, finger), finger).toBeGreaterThan(EXTENDED);
    }
    expect(reach(s, 'pinky')).toBeLessThan(CLOSED);
  });
});

describe('U, V and R are distinguished only by finger separation', () => {
  const sep = (letter: string) => {
    const s = solveLetter(letter);
    return vec3Distance(tip(s, 'index'), tip(s, 'middle'));
  };

  it('U holds index and middle together', () => {
    expect(sep('U')).toBeLessThan(0.035);
  });

  it('V separates them clearly', () => {
    expect(sep('V')).toBeGreaterThan(0.05);
  });

  it('V is unambiguously wider than U', () => {
    expect(sep('V')).toBeGreaterThan(sep('U') * 2);
  });

  it('R brings them closer than U (approximating a cross)', () => {
    expect(sep('R')).toBeLessThan(sep('U'));
  });

  it('all three extend exactly index and middle', () => {
    for (const letter of ['U', 'V', 'R']) {
      const s = solveLetter(letter);
      expect(reach(s, 'index'), letter).toBeGreaterThan(EXTENDED);
      expect(reach(s, 'middle'), letter).toBeGreaterThan(EXTENDED);
      expect(reach(s, 'ring'), letter).toBeLessThan(CLOSED);
      expect(reach(s, 'pinky'), letter).toBeLessThan(CLOSED);
    }
  });
});

describe('contact handshapes', () => {
  it('F pinches thumb to index while the other three stay straight', () => {
    const s = solveLetter('F');
    expect(vec3Distance(tip(s, 'thumb'), tip(s, 'index'))).toBeLessThan(PINCH_MAX);
    for (const finger of ['middle', 'ring', 'pinky']) {
      expect(reach(s, finger), finger).toBeGreaterThan(EXTENDED);
    }
    // The pinching index is drawn in, neither extended nor fully closed.
    expect(reach(s, 'index')).toBeGreaterThan(CLOSED);
    expect(reach(s, 'index')).toBeLessThan(NOT_EXTENDED);
  });

  it('D closes the thumb onto the middle finger with the index up', () => {
    const s = solveLetter('D');
    expect(vec3Distance(tip(s, 'thumb'), tip(s, 'middle'))).toBeLessThan(PINCH_MAX);
    expect(reach(s, 'index')).toBeGreaterThan(EXTENDED);
  });

  it('O closes the thumb onto the fingertips', () => {
    const s = solveLetter('O');
    expect(vec3Distance(tip(s, 'thumb'), tip(s, 'index'))).toBeLessThan(PINCH_MAX);
    expect(vec3Distance(tip(s, 'thumb'), tip(s, 'middle'))).toBeLessThan(0.03);
  });

  it('C leaves an opening where O is closed', () => {
    const c = solveLetter('C');
    const o = solveLetter('O');
    const gap = (s: ReturnType<typeof solveFK>) => vec3Distance(tip(s, 'thumb'), tip(s, 'index'));
    expect(gap(c)).toBeGreaterThan(gap(o) + 0.015);
    expect(gap(c)).toBeLessThan(0.06);
  });

  it('X hooks the index rather than curling or extending it', () => {
    const s = solveLetter('X');
    expect(reach(s, 'index')).toBeGreaterThan(CLOSED);
    expect(reach(s, 'index')).toBeLessThan(NOT_EXTENDED);
    // The other three stay shut, which is what separates X from a pinch shape.
    for (const finger of ['middle', 'ring', 'pinky']) {
      expect(reach(s, finger), finger).toBeLessThan(CLOSED);
    }
  });

  it('C curves every finger without closing or extending any', () => {
    const s = solveLetter('C');
    for (const finger of FINGERS) {
      expect(reach(s, finger), finger).toBeGreaterThan(NOT_EXTENDED);
      expect(reach(s, finger), finger).toBeLessThan(EXTENDED);
    }
  });
});

describe('oriented handshapes', () => {
  it('G and H point the fingers across the body', () => {
    for (const letter of ['G', 'H']) {
      const s = solveLetter(letter);
      expect(dot(fingerDirection(s, 'right'), [1, 0, 0]), letter).toBeGreaterThan(0.9);
    }
  });

  it('P and Q point the fingers downward', () => {
    for (const letter of ['P', 'Q']) {
      const s = solveLetter(letter);
      expect(dot(fingerDirection(s, 'right'), [0, -1, 0]), letter).toBeGreaterThan(0.9);
    }
  });

  it('leaves every other letter palm-out and fingers-up', () => {
    const oriented = new Set(['G', 'H', 'P', 'Q']);
    for (const letter of Object.keys(ASL_LETTERS)) {
      if (oriented.has(letter)) continue;
      const s = solveLetter(letter);
      expect(dot(fingerDirection(s, 'right'), [0, 1, 0]), letter).toBeCloseTo(1, 5);
      expect(dot(palmNormal(s, 'right'), [0, 0, 1]), letter).toBeCloseTo(1, 5);
    }
  });

  it('distinguishes K from P, and G from Q, only by orientation', () => {
    // Same handshape, different wrist -- so the fingers must match.
    for (const [a, b] of [['K', 'P'], ['G', 'Q']]) {
      const sa = solveLetter(a!);
      const sb = solveLetter(b!);
      for (const finger of FINGERS) {
        expect(reach(sb, finger), `${a}/${b} ${finger}`).toBeCloseTo(reach(sa, finger), 6);
      }
    }
  });
});

describe('every letter is visually distinct', () => {
  it('no two letters produce the same fingertip geometry', () => {
    // A signature of all five tips relative to the wrist.
    const signature = (letter: string) => {
      const s = solveLetter(letter);
      const wrist = jointPosition(s, 'right_wrist');
      return ['thumb', ...FINGERS]
        .flatMap((f) => tip(s, f).map((v, i) => v - wrist[i]!));
    };
    const letters = Object.keys(ASL_LETTERS);
    const collisions: string[] = [];

    for (let i = 0; i < letters.length; i++) {
      for (let j = i + 1; j < letters.length; j++) {
        const a = signature(letters[i]!);
        const b = signature(letters[j]!);
        const d = Math.hypot(...a.map((v, k) => v - b[k]!));
        // J is I with movement and Z is D-like with movement; identical statically.
        const pair = [letters[i], letters[j]].sort().join('');
        if (d < 0.01 && pair !== 'IJ') collisions.push(`${pair} (${(d * 100).toFixed(2)}cm)`);
      }
    }
    expect(collisions).toEqual([]);
  });
});
