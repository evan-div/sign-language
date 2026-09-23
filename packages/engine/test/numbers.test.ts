import { describe, it, expect } from 'vitest';
import {
  solveFK, tipPosition, jointPosition, vec3Distance, validatePose, sampleClip,
} from '@signflow/motion-format';
import {
  numberSign, numberSignCached, DIGIT_HANDSHAPES, TEN_HANDSHAPE, digitOrientation,
  MAX_COMPOSABLE, compileSign, lintSign, SIGN_HANDSHAPES, ASL_LETTERS, compileHandshape,
} from '../src/index.js';

const specOf = (id: string) => SIGN_HANDSHAPES[id] ?? ASL_LETTERS[id]!;
const solveShape = (id: string) => solveFK(compileHandshape(specOf(id), 'right'));
const tip = (s: ReturnType<typeof solveFK>, f: string) => tipPosition(s, `right_${f}_tip`);

describe('the digit handshapes', () => {
  it('resolves every digit to a handshape that exists', () => {
    for (let digit = 0; digit <= 9; digit++) {
      expect(specOf(DIGIT_HANDSHAPES[digit]!), String(digit)).toBeDefined();
    }
    expect(specOf(TEN_HANDSHAPE)).toBeDefined();
  });

  it('reuses shapes the library already had for seven of the ten digits', () => {
    // The point of handshape-as-parameter: ASL draws its numbers from the same
    // inventory as everything else, so adding numbers should mostly be adding
    // names, not adding geometry. Only 3, 6 and 7 needed new specs.
    const added = ['NUM_3', 'NUM_6', 'NUM_7'];
    const reused = Object.values(DIGIT_HANDSHAPES).filter((id) => !added.includes(id));
    expect(reused).toHaveLength(7);
  });

  it('touches exactly one finger to the thumb in 6, 7, 8 and 9', () => {
    // The same problem the letters M, N and T had: four shapes that differ only
    // in which fingertip the thumb meets. Each has to make its own contact and
    // leave the other three clear, or the four are one sign.
    const contacts: Record<string, string> = { NUM_6: 'pinky', NUM_7: 'ring', OPEN_8: 'middle', F: 'index' };
    for (const [id, finger] of Object.entries(contacts)) {
      const s = solveShape(id);
      expect(vec3Distance(tip(s, 'thumb'), tip(s, finger)), `${id} touches ${finger}`)
        .toBeLessThan(0.01);
      for (const other of ['index', 'middle', 'ring', 'pinky'].filter((f) => f !== finger)) {
        expect(vec3Distance(tip(s, 'thumb'), tip(s, other)), `${id} clear of ${other}`)
          .toBeGreaterThan(0.06);
      }
    }
  });

  it('keeps every digit handshape distinct from every other', () => {
    const signature = (id: string) => {
      const s = solveShape(id);
      return ['thumb', 'index', 'middle', 'ring', 'pinky'].flatMap((f) => [...tip(s, f)]);
    };
    const ids = [...Object.values(DIGIT_HANDSHAPES), TEN_HANDSHAPE];
    const tooClose: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const d = Math.hypot(...signature(ids[i]!).map((v, k) => v - signature(ids[j]!)[k]!));
        if (d < 0.02) tooClose.push(`${ids[i]}/${ids[j]} (${(d * 100).toFixed(1)}cm)`);
      }
    }
    expect(tooClose).toEqual([]);
  });

  it('states the palm convention in one place', () => {
    for (let digit = 1; digit <= 5; digit++) expect(digitOrientation(digit)).toBe('PALM_IN');
    for (let digit = 6; digit <= 9; digit++) expect(digitOrientation(digit)).toBe('PALM_OUT');
  });
});

describe('composing a number', () => {
  it('builds every number up to the limit without a linter error', () => {
    // Generated signs go through the same checks as authored ones. If numbers
    // could skip them, the checks would be worth much less.
    const problems: string[] = [];
    for (const value of [0, 1, 5, 9, 10, 11, 14, 16, 19, 20, 21, 33, 42, 99, 100, 101,
      305, 999, 1000, 2026, 12345, MAX_COMPOSABLE]) {
      const sign = numberSign(value);
      if (!sign) { problems.push(`${value}: not composable`); continue; }
      for (const finding of lintSign(sign).filter((f) => f.severity === 'error')) {
        problems.push(`${value}: ${finding.message}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('compiles to valid poses throughout', () => {
    for (const value of [7, 15, 42, 2026]) {
      const clip = compileSign(numberSign(value)!);
      for (let t = 0; t <= clip.durationMs; t += 20) {
        expect(validatePose(sampleClip(clip, t)), `${value} at ${t}ms`).toEqual([]);
      }
    }
  });

  it('marks a single digit as held rather than pretending it moves', () => {
    expect(numberSign(5)!.held).toBe(true);
    expect(numberSign(42)!.held).toBeUndefined();
  });

  it('moves a doubled digit sideways instead of holding it twice', () => {
    // 99 composed as "the 9 hand, then the 9 hand" shows the reader a single 9.
    const clip = compileSign(numberSign(99)!);
    const wristAt = (t: number) => jointPosition(solveFK(sampleClip(clip, t)), 'right_wrist');
    expect(vec3Distance(wristAt(0), wristAt(clip.durationMs))).toBeGreaterThan(0.1);
  });

  it('refuses what it cannot build rather than guessing', () => {
    expect(numberSign(MAX_COMPOSABLE + 1)).toBeUndefined();
    expect(numberSign(-1)).toBeUndefined();
    expect(numberSign(3.5)).toBeUndefined();
  });

  it('composes the same sign every time', () => {
    expect(numberSignCached(42)).toBe(numberSignCached(42));
    expect(JSON.stringify(numberSign(42))).toBe(JSON.stringify(numberSign(42)));
  });

  it('marks 11 to 15 as approximations, because they are', () => {
    // These move inside the hand -- a flick, a bend -- which the notation
    // cannot express. Alternating two whole handshapes is a stand-in.
    for (const value of [11, 12, 13, 14, 15]) {
      expect(numberSign(value)!.provenance.note, String(value)).toMatch(/cannot express/);
    }
    expect(numberSign(16)!.provenance.note).not.toMatch(/cannot express/);
  });

  it('builds larger numbers out of smaller ones', () => {
    expect(numberSign(305)!.description).toContain('NUM_3');
    expect(numberSign(305)!.description).toContain('C');
    expect(numberSign(1000)!.description).toContain('M');
  });
});
