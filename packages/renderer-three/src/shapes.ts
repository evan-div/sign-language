/**
 * Shapes for the avatar's body.
 *
 * Limb meshes are parented to bones rather than skinned, so everything here is
 * a rigid piece that follows one joint. The torso is a lofted surface and the
 * head an egg, which is enough to stop it reading as a robot of boxes without
 * needing weight painting.
 */

import { BufferGeometry, Float32BufferAttribute, SphereGeometry } from 'three';

export interface Ring {
  /** Height in the owning joint's frame. */
  readonly y: number;
  /** Half-width (x) and half-depth (z) of the cross-section. */
  readonly rx: number;
  readonly rz: number;
  /** Forward shift of the section's centre. */
  readonly cz?: number;
}

/** Uniform Catmull-Rom through four values at t in [0, 1] between b and c. */
function spline(a: number, b: number, c: number, d: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
}

/**
 * A smooth surface through elliptical cross-sections.
 *
 * The rings are a handful of anatomical landmarks (hip, waist, chest, shoulder
 * line); the spline fills in the curve between them, so the silhouette is
 * continuous instead of faceted.
 */
export function loft(rings: readonly Ring[], radial = 44, steps = 14): BufferGeometry {
  const n = rings.length;
  const at = (i: number) => rings[Math.min(n - 1, Math.max(0, i))]!;
  const rows = (n - 1) * steps + 1;

  const positions: number[] = [];
  for (let j = 0; j < rows; j++) {
    const seg = Math.min(n - 2, Math.floor(j / steps));
    const t = j / steps - seg;
    const [p0, p1, p2, p3] = [at(seg - 1), at(seg), at(seg + 1), at(seg + 2)];
    const sample = (f: (r: Ring) => number) => spline(f(p0), f(p1), f(p2), f(p3), t);
    const y = sample((r) => r.y);
    const rx = sample((r) => r.rx);
    const rz = sample((r) => r.rz);
    const cz = sample((r) => r.cz ?? 0);
    for (let k = 0; k < radial; k++) {
      const a = (k / radial) * Math.PI * 2;
      positions.push(rx * Math.cos(a), y, cz + rz * Math.sin(a));
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let k = 0; k < radial; k++) {
      const a = j * radial + k;
      const b = j * radial + ((k + 1) % radial);
      const c = (j + 1) * radial + k;
      const d = (j + 1) * radial + ((k + 1) % radial);
      indices.push(a, c, b, b, c, d);
    }
  }

  // Close both ends with a fan, so the shape is a solid and not a tube.
  const base = positions.length / 3;
  const bottom = rings[0]!;
  const top = rings[n - 1]!;
  positions.push(0, bottom.y, bottom.cz ?? 0, 0, top.y, top.cz ?? 0);
  for (let k = 0; k < radial; k++) {
    const k1 = (k + 1) % radial;
    indices.push(base, k, k1);
    const o = (rows - 1) * radial;
    indices.push(base + 1, o + k1, o + k);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// --- the head -----------------------------------------------------------------

/** The head is an ellipsoid whose lower half narrows toward the chin. */
const HEAD = { cx: 0, cy: 0.055, cz: 0.012, rx: 0.080, ry: 0.100, rz: 0.092 } as const;

/**
 * A point on the head's surface, in the head joint's frame.
 *
 * Takes a direction out from the centre rather than coordinates, so anything
 * placed with it -- an eye, a nose, a hairline -- is on the same surface as the
 * mesh and cannot float or sink when the shape is tuned.
 */
export function headPoint(dx: number, dy: number, dz: number, scale = 1): [number, number, number] {
  const length = Math.hypot(dx, dy, dz) || 1;
  const nx = dx / length;
  const ny = dy / length;
  const nz = dz / length;
  const low = Math.max(0, -ny) ** 1.3;
  // The jaw is narrower than the cranium and the chin sits behind the brow.
  const fx = 1 - 0.30 * low;
  const fz = (1 - 0.13 * low) * (nz < 0 ? 1.04 : 1);
  return [
    HEAD.cx + HEAD.rx * nx * fx * scale,
    HEAD.cy + HEAD.ry * ny * scale,
    HEAD.cz + HEAD.rz * nz * fz * scale,
  ];
}

export function headGeometry(): BufferGeometry {
  const geometry = new SphereGeometry(1, 48, 36);
  const p = geometry.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = headPoint(p.getX(i), p.getY(i), p.getZ(i));
    p.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Hair as the part of a slightly larger head above a hairline.
 *
 * The hairline sits high on the forehead and drops to the nape, which is what
 * makes the cap read as hair and not as a helmet.
 */
export function hairGeometry(): BufferGeometry {
  const sphere = new SphereGeometry(1, 192, 128);
  const src = sphere.attributes.position!;
  const keeps = (i: number): boolean => {
    const x = src.getX(i);
    const y = src.getY(i);
    const z = src.getZ(i);
    // Front: start well above where the brows travel, so a raise stays visible.
    // Sides and back: come down past the ear.
    const hairline = z > 0 ? 0.80 - 0.66 * (1 - z) : 0.14 - 0.62 * -z;
    return y > hairline;
  };

  const positions: number[] = [];
  const indices: number[] = [];
  const remap = new Map<number, number>();
  const index = sphere.index!;
  for (let t = 0; t < index.count; t += 3) {
    const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    if (!tri.every(keeps)) continue;
    for (const v of tri) {
      if (!remap.has(v)) {
        remap.set(v, positions.length / 3);
        const [x, y, z] = headPoint(src.getX(v), src.getY(v) * 1.03, src.getZ(v), 1.045);
        positions.push(x, y, z);
      }
      indices.push(remap.get(v)!);
    }
  }
  sphere.dispose();

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
