import { describe, it, expect } from 'vitest';
import {
  JOINTS, JOINT_COUNT, TIP_SITES, jointIndex, handJoints,
  solveFK, jointPosition, tipPosition, palmNormal, fingerDirection,
  quatFromEulerDeg, quatSlerp, quatRotateVec3, quatMultiply,
  IDENTITY, vec3Distance, validatePose, blendPoses, sampleClip,
  CANONICAL_TO_VRM, VRM_TO_CANONICAL,
} from '../src/index.js';

describe('canonical skeleton', () => {
  it('has the SMPL-X joint count', () => {
    expect(JOINT_COUNT).toBe(55);
  });

  it('orders parents before children, so a single FK pass is valid', () => {
    JOINTS.forEach((joint, i) => {
      expect(joint.parent).toBeLessThan(i);
    });
  });

  it('has exactly one root', () => {
    expect(JOINTS.filter((j) => j.parent === -1)).toHaveLength(1);
  });

  it('has unique joint names', () => {
    expect(new Set(JOINTS.map((j) => j.name)).size).toBe(JOINT_COUNT);
  });

  it('gives each hand 15 joints', () => {
    expect(handJoints('left')).toHaveLength(15);
    expect(handJoints('right')).toHaveLength(15);
  });

  it('defines five fingertips per hand', () => {
    expect(TIP_SITES).toHaveLength(10);
  });

  it('rejects unknown joint names', () => {
    expect(() => jointIndex('nope')).toThrow(/Unknown canonical joint/);
  });
});

describe('bind pose', () => {
  const solved = solveFK({});

  it('puts the palms forward and the fingers up', () => {
    for (const side of ['left', 'right'] as const) {
      expect(palmNormal(solved, side)[2]).toBeCloseTo(1, 5);
      expect(fingerDirection(solved, side)[1]).toBeCloseTo(1, 5);
    }
  });

  it('is symmetric across the midline', () => {
    const l = jointPosition(solved, 'left_wrist');
    const r = jointPosition(solved, 'right_wrist');
    expect(l[0]).toBeCloseTo(-r[0], 6);
    expect(l[1]).toBeCloseTo(r[1], 6);
    expect(l[2]).toBeCloseTo(r[2], 6);
  });

  it('mirrors fingertips too, so handshapes measure the same on both hands', () => {
    const l = tipPosition(solved, 'left_index_tip');
    const r = tipPosition(solved, 'right_index_tip');
    expect(l[0]).toBeCloseTo(-r[0], 6);
    expect(l[1]).toBeCloseTo(r[1], 6);
  });

  it('has plausible human proportions', () => {
    const head = jointPosition(solved, 'head')[1];
    const ankle = jointPosition(solved, 'left_ankle')[1];
    expect(head - ankle).toBeGreaterThan(1.3);
    expect(head - ankle).toBeLessThan(1.7);
  });
});

describe('forward kinematics', () => {
  it('rotates a child about its parent', () => {
    // Ninety degrees about X at the elbow swings the forearm from up to forward.
    const solved = solveFK({ right_elbow: quatFromEulerDeg(90, 0, 0) });
    const elbow = jointPosition(solved, 'right_elbow');
    const wrist = jointPosition(solved, 'right_wrist');
    expect(wrist[2] - elbow[2]).toBeCloseTo(0.255, 3);
    expect(wrist[1] - elbow[1]).toBeCloseTo(0, 3);
  });

  it('preserves bone lengths under rotation', () => {
    const rest = solveFK({});
    const posed = solveFK({ right_shoulder: quatFromEulerDeg(31, -17, 44) });
    const len = (s: ReturnType<typeof solveFK>) =>
      vec3Distance(jointPosition(s, 'right_shoulder'), jointPosition(s, 'right_elbow'));
    expect(len(posed)).toBeCloseTo(len(rest), 9);
  });
});

describe('quaternion maths', () => {
  it('slerps to its endpoints exactly', () => {
    const a = quatFromEulerDeg(10, 20, 30);
    const b = quatFromEulerDeg(-40, 15, 70);
    expect(quatSlerp(a, b, 0)).toEqual(a);
    expect(quatSlerp(a, b, 1)).toEqual(b);
  });

  it('takes the short way round', () => {
    const a = quatFromEulerDeg(0, 0, 0);
    const b = quatFromEulerDeg(0, 0, 350);
    const mid = quatSlerp(a, b, 0.5);
    const v = quatRotateVec3(mid, [1, 0, 0]);
    // Halfway to -10 degrees, not halfway to +350.
    expect(Math.atan2(v[1], v[0]) * (180 / Math.PI)).toBeCloseTo(-5, 3);
  });

  it('applies the right-hand operand first', () => {
    // Rz(90) * Rx(90) acting on +Z: Rx sends it to -Y, then Rz sends that to +X.
    const q = quatMultiply(quatFromEulerDeg(0, 0, 90), quatFromEulerDeg(90, 0, 0));
    const v = quatRotateVec3(q, [0, 0, 1]);
    expect(v[0]).toBeCloseTo(1, 6);
    expect(v[1]).toBeCloseTo(0, 6);
    expect(v[2]).toBeCloseTo(0, 6);
  });
});

describe('pose validation', () => {
  it('accepts a well-formed pose', () => {
    expect(validatePose({ right_wrist: quatFromEulerDeg(10, 0, 0) })).toEqual([]);
  });

  it('rejects unknown joints and unnormalised rotations', () => {
    expect(validatePose({ elbow_of_doom: IDENTITY })[0]).toMatch(/unknown joint/);
    expect(validatePose({ right_wrist: [0, 0, 0, 5] })[0]).toMatch(/not normalised/);
  });
});

describe('blending and sampling', () => {
  it('blends across the union of both poses', () => {
    const blended = blendPoses({ right_wrist: quatFromEulerDeg(90, 0, 0) }, { head: quatFromEulerDeg(0, 45, 0) }, 0.5);
    expect(Object.keys(blended).sort()).toEqual(['head', 'right_wrist']);
  });

  it('clamps a clip at both ends', () => {
    const clip = {
      id: 'c', skeletonVersion: 'sfcs-1.0.0', durationMs: 100,
      keyframes: [
        { timeMs: 0, pose: { head: IDENTITY } },
        { timeMs: 100, pose: { head: quatFromEulerDeg(0, 90, 0) } },
      ],
    };
    expect(sampleClip(clip, -50).head).toEqual(IDENTITY);
    expect(sampleClip(clip, 500).head![1]).toBeCloseTo(Math.sin(Math.PI / 4), 6);
  });
});

describe('VRM retarget map', () => {
  it('maps every canonical joint that a humanoid rig has', () => {
    // Everything but the eyes and jaw, which VRM treats separately.
    expect(Object.keys(CANONICAL_TO_VRM).length).toBeGreaterThanOrEqual(53);
  });

  it('uses VRM finger naming, including little and thumbMetacarpal', () => {
    expect(CANONICAL_TO_VRM.right_pinky1).toBe('rightLittleProximal');
    expect(CANONICAL_TO_VRM.right_thumb1).toBe('rightThumbMetacarpal');
    expect(CANONICAL_TO_VRM.left_index3).toBe('leftIndexDistal');
  });

  it('round-trips', () => {
    for (const [canonical, vrm] of Object.entries(CANONICAL_TO_VRM)) {
      expect(VRM_TO_CANONICAL[vrm]).toBe(canonical);
    }
  });
});
