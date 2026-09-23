import { describe, it, expect } from 'vitest';
import {
  FACE_CHANNELS, composeFaces, blendFaces, scaleFace, validateFace,
  sampleFaceTrack, sampleClipFace, parseClip, SKELETON_VERSION,
  type FacePose,
} from '../src/index.js';

describe('the face channel', () => {
  it('names every channel the way ARKit does', () => {
    // The names are the interop contract: a real avatar should be able to
    // consume this track with a lookup table rather than a translation layer.
    // ARKit names are lowerCamelCase with a side suffix where the shape is
    // paired, and nothing here should drift from that.
    for (const channel of FACE_CHANNELS) {
      expect(channel, channel).toMatch(/^[a-z][A-Za-z]*(Left|Right)?$/);
    }
    expect(new Set(FACE_CHANNELS).size).toBe(FACE_CHANNELS.length);
  });

  it('takes the strongest weight when two markers overlap', () => {
    // Deliberately not "later wins", which is how joint poses compose. Two
    // markers on one joint must resolve to a single rotation -- a head cannot
    // be in two places -- but two markers both raising the brows should raise
    // them once, at the stronger of the two, not have the weaker cancel it.
    const a: FacePose = { browInnerUp: 0.8, eyeWideLeft: 0.3 };
    const b: FacePose = { browInnerUp: 0.4, jawOpen: 0.5 };
    expect(composeFaces(a, b)).toEqual({ browInnerUp: 0.8, eyeWideLeft: 0.3, jawOpen: 0.5 });
  });

  it('blends channels that only one side names, against neutral', () => {
    const mid = blendFaces({ browInnerUp: 1 }, { jawOpen: 1 }, 0.5);
    expect(mid.browInnerUp).toBeCloseTo(0.5, 9);
    expect(mid.jawOpen).toBeCloseTo(0.5, 9);
  });

  it('scales every channel for ramping', () => {
    expect(scaleFace({ browInnerUp: 0.8, jawOpen: 0.5 }, 0.5))
      .toEqual({ browInnerUp: 0.4, jawOpen: 0.25 });
    expect(scaleFace({ browInnerUp: 0.8 }, 0)).toEqual({});
  });

  it('rejects unknown channels and out-of-range weights', () => {
    expect(validateFace({ browInnerUp: 0.5 })).toEqual([]);
    expect(validateFace({ eyebrowUp: 0.5 } as never)).toEqual(['unknown face channel "eyebrowUp"']);
    expect(validateFace({ browInnerUp: 1.5 })).toEqual(['face channel "browInnerUp" is 1.5, outside 0..1']);
    expect(validateFace({ browInnerUp: -0.1 })).toEqual(['face channel "browInnerUp" is -0.1, outside 0..1']);
  });

  it('samples a track, clamping past both ends', () => {
    const track = [
      { timeMs: 0, face: { browInnerUp: 0 } },
      { timeMs: 100, face: { browInnerUp: 1 } },
    ];
    expect(sampleFaceTrack(track, -50).browInnerUp).toBe(0);
    expect(sampleFaceTrack(track, 50).browInnerUp).toBeCloseTo(0.5, 9);
    expect(sampleFaceTrack(track, 500).browInnerUp).toBe(1);
    expect(sampleFaceTrack([], 0)).toEqual({});
  });

  it('gives a clip with no face track a neutral face', () => {
    const clip = {
      id: 'x', skeletonVersion: SKELETON_VERSION, durationMs: 100,
      keyframes: [{ timeMs: 0, pose: {} }],
    };
    expect(sampleClipFace(clip, 50)).toEqual({});
  });
});

describe('reading a face track from outside', () => {
  const base = {
    id: 'x',
    skeletonVersion: SKELETON_VERSION,
    durationMs: 100,
    keyframes: [{ timeMs: 0, pose: {} }, { timeMs: 100, pose: {} }],
    provenance: { source: 'test' },
  };

  it('accepts a well-formed track', () => {
    const result = parseClip({
      ...base,
      faceKeyframes: [{ timeMs: 0, face: { browInnerUp: 0 } }, { timeMs: 100, face: { browInnerUp: 1 } }],
    });
    expect(result.errors).toEqual([]);
    expect(result.clip?.faceKeyframes).toHaveLength(2);
  });

  it('drops an unknown channel with a warning rather than failing', () => {
    // Same rule as unknown joints: a clip from a newer face model should still
    // play the channels this one has.
    const result = parseClip({
      ...base,
      faceKeyframes: [{ timeMs: 0, face: { browInnerUp: 0.5, cheekSquintLeft: 0.5 } }],
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toContain('cheekSquintLeft');
    expect(result.clip?.faceKeyframes?.[0]!.face).toEqual({ browInnerUp: 0.5 });
  });

  it('refuses a weight outside 0..1 instead of clamping it', () => {
    // A weight of 3 means the producer is using another convention -- degrees,
    // or a percentage. Clamping hides that behind a face that is merely wrong.
    const result = parseClip({ ...base, faceKeyframes: [{ timeMs: 0, face: { jawOpen: 3 } }] });
    expect(result.clip).toBeUndefined();
    expect(result.errors.join(' ')).toContain('outside 0..1');
  });

  it('refuses a face track that goes backwards in time', () => {
    const result = parseClip({
      ...base,
      faceKeyframes: [{ timeMs: 100, face: {} }, { timeMs: 0, face: {} }],
    });
    expect(result.clip).toBeUndefined();
    expect(result.errors.join(' ')).toContain('goes backwards');
  });
});
