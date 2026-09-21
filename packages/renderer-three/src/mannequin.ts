/**
 * A procedurally built placeholder avatar.
 *
 * Deliberately ugly, and deliberately not a GLB. Building the rig in code means
 * the bone names and rest offsets cannot drift out of sync with the canonical
 * skeleton, and there is no binary asset to review. It is a placeholder: the
 * real avatar will be an authored VRM 1.0 character loaded through the same
 * AvatarPlayer interface, and nothing outside this file should care which.
 *
 * Limb meshes are parented to bones rather than skinned. For a mannequin that
 * is the better trade: no weight painting to get wrong, and crisply separated
 * finger segments, which is what readability actually depends on.
 */

import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { JOINTS, CANONICAL_TO_VRM, type Vec3 } from '@signflow/motion-format';

export interface MannequinOptions {
  readonly skinColor?: string;
  readonly accentColor?: string;
}

export interface Mannequin {
  readonly root: Group;
  /** Canonical joint name -> the Object3D carrying that joint's rotation. */
  readonly joints: ReadonlyMap<string, Object3D>;
  dispose(): void;
}

/** Limb thickness by joint. Fingers taper toward the tip so segments read apart. */
function radiusFor(jointName: string): number {
  if (/thumb1$/.test(jointName)) return 0.0125;
  if (/thumb[23]$/.test(jointName)) return 0.0105;
  if (/(index|middle|ring)1$/.test(jointName)) return 0.0105;
  if (/pinky1$/.test(jointName)) return 0.0092;
  if (/(index|middle|ring)2$/.test(jointName)) return 0.0095;
  if (/pinky2$/.test(jointName)) return 0.0082;
  if (/[a-z]3$/.test(jointName)) return 0.0085;
  if (/_shoulder$/.test(jointName)) return 0.046;
  if (/_elbow$/.test(jointName)) return 0.040;
  if (/_wrist$/.test(jointName)) return 0.034;
  if (/_hip$/.test(jointName)) return 0.055;
  if (/_knee$/.test(jointName)) return 0.048;
  if (/spine|neck/.test(jointName)) return 0.075;
  return 0.03;
}

const UP = new Vector3(0, 1, 0);

export function createMannequin(options: MannequinOptions = {}): Mannequin {
  const skin = new MeshStandardMaterial({
    color: new Color(options.skinColor ?? '#d8d3cc'),
    roughness: 0.62,
    metalness: 0.02,
  });
  const accent = new MeshStandardMaterial({
    color: new Color(options.accentColor ?? '#5b6572'),
    roughness: 0.72,
    metalness: 0.03,
  });

  const root = new Group();
  root.name = 'signflow-mannequin';

  const joints = new Map<string, Object3D>();
  const geometries: BufferGeometry[] = [];

  // One Object3D per canonical joint, positioned at its rest offset. Rest
  // rotations are identity by construction, which is what lets a canonical pose
  // be applied as a direct rotation copy.
  JOINTS.forEach((joint) => {
    const node = new Object3D();
    node.name = CANONICAL_TO_VRM[joint.name] ?? joint.name;
    node.position.set(joint.offset[0], joint.offset[1], joint.offset[2]);
    joints.set(joint.name, node);
    if (joint.parent < 0) root.add(node);
    else joints.get(JOINTS[joint.parent]!.name)!.add(node);
  });

  /** Draw a limb from a joint's origin toward one of its children. */
  const addLimb = (parentName: string, offset: Vec3, radius: number, material: Material) => {
    const length = Math.hypot(...offset);
    if (length < 1e-4) return;
    const geometry = new CapsuleGeometry(radius, Math.max(length - radius * 1.2, 0.004), 3, 10);
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    const direction = new Vector3(offset[0], offset[1], offset[2]).normalize();
    mesh.quaternion.copy(new Quaternion().setFromUnitVectors(UP, direction));
    // Capsules are centred, so push the mesh half a limb along its own axis.
    mesh.position.copy(direction).multiplyScalar(length / 2);
    mesh.castShadow = true;
    joints.get(parentName)!.add(mesh);
  };

  const skipLimb = new Set(['jaw', 'left_eye', 'right_eye']);

  JOINTS.forEach((joint) => {
    if (joint.parent < 0) return;
    if (skipLimb.has(joint.name)) return;
    const parentName = JOINTS[joint.parent]!.name;
    // The collar bones sit inside the torso box; drawing them adds clutter.
    if (/_collar$/.test(joint.name)) return;
    addLimb(parentName, joint.offset, radiusFor(joint.name), skin);
  });

  const addMesh = (jointName: string, geometry: BufferGeometry, material: Material, offset: Vec3 = [0, 0, 0]) => {
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(offset[0], offset[1], offset[2]);
    mesh.castShadow = true;
    joints.get(jointName)!.add(mesh);
  };

  // Torso, head and palms: the parts a chain of capsules does not describe well.
  // Kept narrow and dark so it reads as a body without competing with the hands.
  addMesh('spine1', new BoxGeometry(0.255, 0.33, 0.145), accent, [0, 0.165, -0.005]);
  addMesh('pelvis', new BoxGeometry(0.245, 0.13, 0.145), accent, [0, 0.005, -0.005]);
  addMesh('head', new SphereGeometry(0.098, 20, 16), skin, [0, 0.055, 0.012]);
  for (const side of ['left', 'right'] as const) {
    // A palm, so the hand is not just five floating fingers. Rounded rather
    // than a slab, so its silhouette does not cut across the finger segments.
    const palm = new SphereGeometry(0.5, 18, 12);
    palm.scale(0.078, 0.092, 0.030);
    addMesh(`${side}_wrist`, palm, skin, [0, 0.042, 0.001]);
    // Fingertip caps.
    for (const finger of ['index', 'middle', 'ring', 'pinky', 'thumb'] as const) {
      const r = radiusFor(`${side}_${finger}3`);
      addMesh(`${side}_${finger}3`, new SphereGeometry(r, 8, 6), skin, [0, r * 1.6, 0]);
    }
  }

  return {
    root,
    joints,
    dispose() {
      geometries.forEach((g) => g.dispose());
      skin.dispose();
      accent.dispose();
    },
  };
}
