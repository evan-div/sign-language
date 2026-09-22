import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseClip, loadClip, sampleClip, solveFK, jointPosition, vec3Distance,
  validatePose, SKELETON_VERSION, quatFromEulerDeg,
} from '../src/index.js';

const EXTRACTED = resolve(import.meta.dirname, '../../../assets/motion/extracted');

const minimal = (overrides: Record<string, unknown> = {}) => ({
  id: 'test',
  skeletonVersion: SKELETON_VERSION,
  durationMs: 100,
  keyframes: [
    { timeMs: 0, pose: { right_wrist: [0, 0, 0, 1] } },
    { timeMs: 100, pose: { right_wrist: quatFromEulerDeg(0, 90, 0) } },
  ],
  ...overrides,
});

describe('parsing a motion clip', () => {
  it('accepts a well-formed clip', () => {
    const result = parseClip(minimal());
    expect(result.errors).toEqual([]);
    expect(result.clip?.keyframes).toHaveLength(2);
  });

  it('refuses a clip built for a different skeleton', () => {
    // Joint offsets moving between versions silently relocates every hand,
    // which is the kind of bug nobody traces back to a file.
    const result = parseClip(minimal({ skeletonVersion: 'sfcs-0.9.0' }));
    expect(result.clip).toBeUndefined();
    expect(result.errors[0]).toMatch(/skeleton version mismatch/);
  });

  it('refuses rotations that are not rotations', () => {
    expect(parseClip(minimal({
      keyframes: [{ timeMs: 0, pose: { right_wrist: [0, 0, 0, 5] } }],
    })).errors[0]).toMatch(/not normalised/);

    expect(parseClip(minimal({
      keyframes: [{ timeMs: 0, pose: { right_wrist: [0, 0, 1] } }],
    })).errors[0]).toMatch(/not a quaternion/);
  });

  it('refuses keyframes that go backwards', () => {
    expect(parseClip(minimal({
      keyframes: [
        { timeMs: 50, pose: {} },
        { timeMs: 10, pose: {} },
      ],
    })).errors[0]).toMatch(/goes backwards/);
  });

  it('refuses an empty clip', () => {
    expect(parseClip(minimal({ keyframes: [] })).errors[0]).toMatch(/no keyframes/);
  });

  it('drops unknown joints with a warning rather than failing', () => {
    // A clip from a newer skeleton should still play what this one has.
    const result = parseClip(minimal({
      keyframes: [{ timeMs: 0, pose: { right_wrist: [0, 0, 0, 1], tentacle_3: [0, 0, 0, 1] } }],
    }));
    expect(result.clip).toBeDefined();
    expect(result.warnings[0]).toMatch(/unknown joint "tentacle_3"/);
    expect(result.clip!.keyframes[0]!.pose.tentacle_3).toBeUndefined();
  });

  it('warns when a clip has no provenance', () => {
    // Motion with no recorded origin cannot be reviewed or confidently replaced.
    expect(parseClip(minimal()).warnings.some((w) => /provenance/.test(w))).toBe(true);
  });

  it('keeps provenance when it is there', () => {
    const result = parseClip(minimal({
      provenance: { source: 'video-extraction', method: 'direction-matching', dataset: 'synthetic' },
    }));
    expect(result.clip?.provenance?.source).toBe('video-extraction');
    expect(result.warnings.some((w) => /provenance/.test(w))).toBe(false);
  });

  it('throws from loadClip with every problem listed', () => {
    expect(() => loadClip({ id: '', skeletonVersion: 'nope', keyframes: [] }))
      .toThrow(/Invalid motion clip/);
  });
});

describe('clips written by the motion pipeline', () => {
  const read = (name: string) =>
    JSON.parse(readFileSync(resolve(EXTRACTED, `${name}.sfmc.json`), 'utf8'));

  it.each(['HELLO', 'NAME', 'THANK-YOU'])('%s loads and plays', (name) => {
    const clip = loadClip(read(name));
    expect(clip.keyframes.length).toBeGreaterThan(10);
    expect(clip.durationMs).toBeGreaterThan(100);

    // Every sampled pose must be usable by the renderer, not just parseable.
    for (let t = 0; t <= clip.durationMs; t += 17) {
      expect(validatePose(sampleClip(clip, t)), `${name} at ${t}ms`).toEqual([]);
    }
  });

  it('records where the motion came from', () => {
    const clip = loadClip(read('NAME'));
    expect(clip.provenance?.source).toBe('video-extraction');
    // The method string is how a reviewer knows what produced this and how far
    // to trust it -- here, that the landmarks were synthesised rather than seen.
    expect(clip.provenance?.method).toMatch(/synthetic-landmarks/);
    expect(clip.provenance?.dataset).toMatch(/not from video/);
  });

  it('carries a stroke, so the sequencer can trim to it', () => {
    const clip = loadClip(read('HELLO'));
    expect(clip.strokeStartMs).toBeGreaterThanOrEqual(0);
    expect(clip.strokeEndMs!).toBeGreaterThan(clip.strokeStartMs!);
    expect(clip.strokeEndMs!).toBeLessThanOrEqual(clip.durationMs);
  });

  it('moves the hands through signing space', () => {
    // A clip that parses but never moves would pass everything above.
    const clip = loadClip(read('HELLO'));
    const wristAt = (t: number) => jointPosition(solveFK(sampleClip(clip, t)), 'right_wrist');
    let travel = 0;
    for (let t = 17; t <= clip.durationMs; t += 17) {
      travel += vec3Distance(wristAt(t - 17), wristAt(t));
    }
    expect(travel).toBeGreaterThan(0.15);
  });
});
