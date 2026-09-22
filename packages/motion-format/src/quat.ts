/**
 * Minimal quaternion / vector math.
 *
 * Deliberately dependency-free: `@signflow/motion-format` and `@signflow/engine`
 * must never import a renderer (see the dependency rule in docs/architecture.md),
 * so we cannot borrow three.js here.
 *
 * Quaternions are [x, y, z, w]. Vectors are [x, y, z]. All angles are radians
 * unless a function name says otherwise.
 */

export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];

export const IDENTITY: Quat = [0, 0, 0, 1];
export const ZERO: Vec3 = [0, 0, 0];

export const DEG = Math.PI / 180;

export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const [x, y, z] = axis;
  const len = Math.hypot(x, y, z) || 1;
  const h = angle / 2;
  const s = Math.sin(h) / len;
  return [x * s, y * s, z * s, Math.cos(h)];
}

/** Intrinsic XYZ Euler angles (radians) to quaternion. */
export function quatFromEuler(x: number, y: number, z: number): Quat {
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2);
  const cy = Math.cos(y / 2), sy = Math.sin(y / 2);
  const cz = Math.cos(z / 2), sz = Math.sin(z / 2);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

/** Convenience: Euler angles given in degrees. */
export function quatFromEulerDeg(x: number, y: number, z: number): Quat {
  return quatFromEuler(x * DEG, y * DEG, z * DEG);
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatNormalize(q: Quat): Quat {
  const [x, y, z, w] = q;
  const len = Math.hypot(x, y, z, w);
  if (len === 0) return IDENTITY;
  return [x / len, y / len, z / len, w / len];
}

/**
 * Spherical linear interpolation, taking the shorter arc.
 *
 * This is the reason motion is stored as rotations rather than landmark
 * positions: slerping a joint rotation is meaningful, whereas lerping between
 * two landmark clouds is not.
 */
export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let [bx, by, bz, bw] = b;
  const [ax, ay, az, aw] = a;
  let cos = ax * bx + ay * by + az * bz + aw * bw;

  // Take the shorter path around the hypersphere.
  if (cos < 0) {
    cos = -cos;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }

  // Nearly parallel: fall back to normalised lerp to avoid a divide by ~0.
  if (cos > 0.9995) {
    return quatNormalize([
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      az + (bz - az) * t,
      aw + (bw - aw) * t,
    ]);
  }

  const theta = Math.acos(cos);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return [ax * wa + bx * wb, ay * wa + by * wb, az * wa + bz * wb, aw * wa + bw * wb];
}

/** Rotate a vector by a quaternion. */
export function quatRotateVec3(q: Quat, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;
  // t = 2 * cross(q.xyz, v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return [
    vx + qw * tx + (qy * tz - qz * ty),
    vy + qw * ty + (qz * tx - qx * tz),
    vz + qw * tz + (qx * ty - qy * tx),
  ];
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vec3Normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a[0], a[1], a[2]);
  return len === 0 ? [0, 0, 0] : [a[0] / len, a[1] / len, a[2] / len];
}

/**
 * Quaternion from an orthonormal basis, given as the images of +X, +Y and +Z.
 *
 * Useful when a rotation is easier to state as "where these axes end up" than
 * as Euler angles -- a hand orientation is naturally "fingers point here, palm
 * faces there", and writing that as a Euler triple hides whether it is right.
 */
export function quatFromBasis(x: Vec3, y: Vec3, z: Vec3): Quat {
  const trace = x[0] + y[1] + z[2];
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return quatNormalize([(y[2] - z[1]) / s, (z[0] - x[2]) / s, (x[1] - y[0]) / s, 0.25 * s]);
  }
  if (x[0] > y[1] && x[0] > z[2]) {
    const s = Math.sqrt(1 + x[0] - y[1] - z[2]) * 2;
    return quatNormalize([0.25 * s, (y[0] + x[1]) / s, (z[0] + x[2]) / s, (y[2] - z[1]) / s]);
  }
  if (y[1] > z[2]) {
    const s = Math.sqrt(1 + y[1] - x[0] - z[2]) * 2;
    return quatNormalize([(y[0] + x[1]) / s, 0.25 * s, (z[1] + y[2]) / s, (z[0] - x[2]) / s]);
  }
  const s = Math.sqrt(1 + z[2] - x[0] - y[1]) * 2;
  return quatNormalize([(z[0] + x[2]) / s, (z[1] + y[2]) / s, 0.25 * s, (x[1] - y[0]) / s]);
}

/**
 * Rotation that sends +Y to `fingers` and +Z to `palm`.
 *
 * The canonical bind pose points the fingers along +Y with the palm facing +Z,
 * so this turns a hand orientation stated in plain terms into the rotation that
 * produces it. `palm` is re-squared against `fingers`, so the two only have to
 * be roughly perpendicular.
 */
export function quatFromHandDirections(fingers: Vec3, palm: Vec3): Quat {
  const f = vec3Normalize(fingers);
  const side = vec3Normalize(vec3Cross(f, palm));
  const p = vec3Cross(side, f);
  // quatFromBasis takes the images of +X, +Y and +Z -- the basis columns.
  // Passing the rows instead yields the transpose, which is the inverse
  // rotation, and every asymmetric orientation comes out negated.
  return quatFromBasis(side, f, p);
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

export function vec3Length(a: Vec3): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function vec3Distance(a: Vec3, b: Vec3): number {
  return vec3Length(vec3Sub(a, b));
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
