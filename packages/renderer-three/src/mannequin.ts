/**
 * A procedurally built placeholder avatar.
 *
 * Deliberately not a GLB. Building the rig in code means the bone names and rest
 * offsets cannot drift out of sync with the canonical skeleton, and there is no
 * binary asset to review. The real avatar will be an authored VRM 1.0 character
 * loaded through the same AvatarPlayer interface, and nothing outside this file
 * should care which.
 *
 * It is dressed the way interpreters dress: a plain dark top with long sleeves
 * and bare hands, so the hands -- which carry the language -- are the only skin
 * below the neck and read cleanly against it.
 *
 * Limb meshes are parented to bones rather than skinned. For a figure this
 * simple that is the better trade: no weight painting to get wrong, and crisply
 * separated finger segments, which is what readability actually depends on.
 */

import {
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { JOINTS, CANONICAL_TO_VRM, type FacePose, type Vec3 } from '@signflow/motion-format';
import { createFaceRig, type FaceRig } from './face-rig.js';
import { headGeometry, hairGeometry, loft, headPoint, type Ring } from './shapes.js';

export interface MannequinOptions {
  readonly skinColor?: string;
  /** Clothing. */
  readonly accentColor?: string;
  readonly hairColor?: string;
}

export interface Mannequin {
  readonly root: Group;
  /** Canonical joint name -> the Object3D carrying that joint's rotation. */
  readonly joints: ReadonlyMap<string, Object3D>;
  /** Drive the face from ARKit-named expression weights. */
  applyFace(face: FacePose): void;
  dispose(): void;
}

/** Finger and hand thickness by joint. Fingers taper toward the tip so segments read apart. */
function radiusFor(jointName: string): number {
  if (/thumb1$/.test(jointName)) return 0.0125;
  if (/thumb[23]$/.test(jointName)) return 0.0105;
  if (/(index|middle|ring)1$/.test(jointName)) return 0.0105;
  if (/pinky1$/.test(jointName)) return 0.0092;
  if (/(index|middle|ring)2$/.test(jointName)) return 0.0095;
  if (/pinky2$/.test(jointName)) return 0.0082;
  if (/[a-z]3$/.test(jointName)) return 0.0085;
  if (/_hip$/.test(jointName)) return 0.066;
  if (/_knee$/.test(jointName)) return 0.052;
  return 0.03;
}

/** Sleeve radius at the start and end of each arm segment. */
const SLEEVE: Readonly<Record<string, readonly [number, number]>> = {
  shoulder: [0.046, 0.043],
  elbow: [0.043, 0.032],
};

/** How far below the shoulder joint the sleeve is drawn from, in metres. */
const SHOULDER_DROP = 0.032;

/** The torso, as cross-sections in the spine1 frame (spine1 sits at y=1.05). */
const TORSO: readonly Ring[] = [
  { y: -0.14, rx: 0.138, rz: 0.090 },
  { y: -0.06, rx: 0.152, rz: 0.098 },
  { y: 0.07, rx: 0.132, rz: 0.088, cz: 0.002 },
  { y: 0.20, rx: 0.142, rz: 0.094, cz: 0.004 },
  { y: 0.29, rx: 0.157, rz: 0.098, cz: 0.006 },
  { y: 0.335, rx: 0.172, rz: 0.088, cz: 0.002 },
  { y: 0.360, rx: 0.152, rz: 0.078, cz: 0.001 },
  { y: 0.378, rx: 0.104, rz: 0.066 },
  { y: 0.392, rx: 0.064, rz: 0.056 },
  { y: 0.400, rx: 0.056, rz: 0.052 },
];

const UP = new Vector3(0, 1, 0);

export function createMannequin(options: MannequinOptions = {}): Mannequin {
  const skin = new MeshStandardMaterial({
    color: new Color(options.skinColor ?? '#d8a888'),
    roughness: 0.58,
    metalness: 0,
  });
  const cloth = new MeshStandardMaterial({
    color: new Color(options.accentColor ?? '#3d4b60'),
    roughness: 0.82,
    metalness: 0,
  });
  const trim = new MeshStandardMaterial({
    color: new Color(options.accentColor ?? '#3d4b60').offsetHSL(0, 0, 0.07),
    roughness: 0.78,
    metalness: 0,
  });
  const trousers = new MeshStandardMaterial({ color: new Color('#1d232c'), roughness: 0.86, metalness: 0 });
  const hair = new MeshStandardMaterial({
    color: new Color(options.hairColor ?? '#2b211d'),
    roughness: 0.7,
    metalness: 0,
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

  const addMesh = (jointName: string, geometry: BufferGeometry, material: Material, offset: Vec3 = [0, 0, 0]) => {
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(offset[0], offset[1], offset[2]);
    mesh.castShadow = true;
    joints.get(jointName)!.add(mesh);
    return mesh;
  };

  /** Lay a mesh built along +Y from a joint's origin toward one of its children. */
  const along = (mesh: Mesh, offset: Vec3, length: number) => {
    const direction = new Vector3(offset[0], offset[1], offset[2]).normalize();
    mesh.quaternion.copy(new Quaternion().setFromUnitVectors(UP, direction));
    mesh.position.copy(direction).multiplyScalar(length / 2);
  };

  /** A rounded limb: a capsule between a joint and its child. */
  const addLimb = (parentName: string, offset: Vec3, radius: number, material: Material) => {
    const length = Math.hypot(...offset);
    if (length < 1e-4) return;
    const mesh = addMesh(parentName, new CapsuleGeometry(radius, Math.max(length - radius * 1.2, 0.004), 3, 12), material);
    along(mesh, offset, length);
  };

  /**
   * A tapered sleeve segment, with a rounded joint at its start.
   *
   * The shoulder's drawn root sits a little below the joint it pivots on. The
   * skeleton's shoulder is where reach is solved and cannot move, but drawn at
   * that height the sleeve starts level with the base of the neck and the
   * shoulders read as hunched. A few centimetres of offset is invisible when the
   * arm moves and fixes the silhouette at rest.
   */
  const addSleeve = (parentName: string, offset: Vec3, [r0, r1]: readonly [number, number]) => {
    const isShoulder = /_shoulder$/.test(parentName);
    const root: Vec3 = [0, isShoulder ? -SHOULDER_DROP : 0, 0];
    const span: Vec3 = [offset[0] - root[0], offset[1] - root[1], offset[2] - root[2]];
    const length = Math.hypot(...span);
    const mesh = addMesh(parentName, new CylinderGeometry(r1, r0, length, 24, 1), cloth);
    const direction = new Vector3(...span).normalize();
    mesh.quaternion.copy(new Quaternion().setFromUnitVectors(UP, direction));
    mesh.position.set(...root).addScaledVector(direction, length / 2);
    // Flattened on top at the shoulder: a full sphere stands proud of the line.
    const cap = addMesh(parentName, new SphereGeometry(r0, 24, 16), cloth, root);
    if (isShoulder) cap.scale.set(1, 0.85, 1);
  };

  JOINTS.forEach((joint) => {
    if (joint.parent < 0) return;
    const parentName = JOINTS[joint.parent]!.name;
    const side = /^(left|right)_/.exec(parentName)?.[1];
    if (/^(jaw|left_eye|right_eye)$/.test(joint.name)) return;
    // The torso and neck are drawn as shapes, not as chains of capsules.
    if (/^(spine|neck|head)/.test(parentName) || /_collar$/.test(parentName) || /_collar$/.test(joint.name)) return;
    if (/_(shoulder|elbow)$/.test(parentName) && side) {
      addSleeve(parentName, joint.offset, SLEEVE[parentName.replace(`${side}_`, '')]!);
      return;
    }
    if (/_(hip|knee)$/.test(parentName)) {
      addLimb(parentName, joint.offset, radiusFor(parentName), trousers);
      return;
    }
    if (parentName === 'pelvis') return;
    if (/_(ankle|foot)$/.test(parentName)) return;
    addLimb(parentName, joint.offset, radiusFor(joint.name), skin);
  });

  // Torso, neck, head. The torso hangs from spine1 so it follows any lean.
  addMesh('spine1', loft(TORSO), cloth);
  // The neckline: a soft ring of the cuff colour where the neck leaves the top.
  const neckline = new TorusGeometry(0.056, 0.0085, 10, 36);
  neckline.rotateX(Math.PI / 2);
  addMesh('neck', neckline, trim, [0, -0.012, 0.003]);
  addMesh('neck', new CylinderGeometry(0.052, 0.058, 0.15, 24, 1), skin, [0, 0.035, 0.003]);
  addMesh('head', headGeometry(), skin);
  addMesh('head', hairGeometry(), hair);

  // Ears and nose. Placed with the same surface function as the face, so they
  // sit on the head however its shape is tuned.
  for (const side of [1, -1] as const) {
    const ear = new SphereGeometry(1, 12, 10);
    ear.scale(0.0085, 0.024, 0.016);
    const at = headPoint(side, -0.02, -0.04, 0.985);
    addMesh('head', ear, skin, at);
  }
  const nose = new SphereGeometry(1, 14, 12);
  nose.scale(0.0115, 0.0165, 0.0155);
  const bridge = headPoint(0, -0.30, 1, 1);
  addMesh('head', nose, skin, [bridge[0], bridge[1], bridge[2] + 0.002]);

  // A wrist, so the skin below the cuff has somewhere to come from, and the
  // cuff itself, a shade lighter than the sleeve so the hand has a clean edge.
  for (const side of ['left', 'right'] as const) {
    const wrist = `${side}_wrist`;
    const cuff = new CylinderGeometry(0.0335, 0.0335, 0.022, 24, 1);
    addMesh(wrist, cuff, trim, [0, -0.011, 0]);
    addMesh(wrist, new CylinderGeometry(0.0265, 0.0285, 0.05, 20, 1), skin, [0, 0.014, 0]);
    // A palm, so the hand is not just five floating fingers. Rounded rather
    // than a slab, so its silhouette does not cut across the finger segments.
    const palm = new SphereGeometry(0.5, 20, 14);
    palm.scale(0.078, 0.092, 0.032);
    addMesh(wrist, palm, skin, [0, 0.042, 0.001]);
    // Fingertip caps.
    for (const finger of ['index', 'middle', 'ring', 'pinky', 'thumb'] as const) {
      const r = radiusFor(`${side}_${finger}3`);
      addMesh(`${side}_${finger}3`, new SphereGeometry(r, 10, 8), skin, [0, r * 1.6, 0]);
    }
  }

  // The face rides on the head joint, so it follows head rotation for free --
  // which matters, because a headshake and a brow raise are often the same
  // marker and have to move together.
  const face: FaceRig = createFaceRig({ skin, hair });
  joints.get('head')!.add(face.group);

  return {
    root,
    joints,
    applyFace(weights) { face.apply(weights); },
    dispose() {
      geometries.forEach((g) => g.dispose());
      face.dispose();
      for (const m of [skin, cloth, trim, trousers, hair]) m.dispose();
    },
  };
}
