/**
 * A face for the placeholder mannequin.
 *
 * ASL carries sentence type on the face: a yes/no question, a WH question and
 * a statement can share identical hands. Until Milestone 7 this project carried
 * those markers in the data and rendered them as head tilt, which is a stand-in
 * for a marker rather than the marker, and meant the one part of the grammar
 * that most needs to be seen could not be seen at all.
 *
 * So the brows, eyes and mouth are built here and driven by the same
 * ARKit-named weights a real avatar would take. This is emphatically not a
 * face: it is four boxes and two spheres, sized for legibility at the default
 * camera rather than for looking like anyone. What it has to get right is that
 * a brow raise and a brow furrow are TELLABLE APART at a glance, because that
 * distinction is the difference between two sentence types.
 *
 * The weights, not this geometry, are the contract. Swapping in a VRM avatar
 * means mapping these channel names onto its expressions and deleting this file.
 */

import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { faceWeight, type FacePose } from '@signflow/motion-format';

/**
 * Where the features sit, in the head joint's local frame.
 *
 * The head is a sphere of radius 0.098 centred at (0, 0.055, 0.012), so
 * anything on its face has to be placed on that sphere rather than on a plane.
 * These are the surface points for the eyes, brows and mouth.
 */
const HEAD_CENTRE = [0, 0.055, 0.012] as const;
const HEAD_RADIUS = 0.098;

/** A point on the head's surface, given a direction from its centre. */
function onHead(dx: number, dy: number, dz: number, inset = 0.004): [number, number, number] {
  const length = Math.hypot(dx, dy, dz);
  const r = (HEAD_RADIUS - inset) / length;
  return [HEAD_CENTRE[0] + dx * r, HEAD_CENTRE[1] + dy * r, HEAD_CENTRE[2] + dz * r];
}

export interface FaceRig {
  readonly group: Group;
  apply(face: FacePose): void;
  dispose(): void;
}

interface Brow {
  readonly node: Object3D;
  readonly restY: number;
  readonly restX: number;
  /** +1 for the avatar's left brow, -1 for its right. */
  readonly side: number;
}

interface Eye {
  readonly lid: Object3D;
  readonly ball: Object3D;
  readonly openY: number;
  readonly height: number;
}

export function createFaceRig(options: { skin: Material } ): FaceRig {
  const geometries: BufferGeometry[] = [];
  const group = new Group();
  group.name = 'face';

  const dark = new MeshStandardMaterial({ color: new Color('#2b2f36'), roughness: 0.8, metalness: 0 });
  const white = new MeshStandardMaterial({ color: new Color('#f3f1ee'), roughness: 0.5, metalness: 0 });

  const add = (geometry: BufferGeometry, material: Material, at: readonly [number, number, number]) => {
    geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(at[0], at[1], at[2]);
    const holder = new Object3D();
    holder.position.set(at[0], at[1], at[2]);
    mesh.position.set(0, 0, 0);
    holder.add(mesh);
    group.add(holder);
    return holder;
  };

  const brows: Brow[] = [];
  const eyes: Eye[] = [];

  for (const side of [1, -1] as const) {
    const eyeAt = onHead(0.034 * side, 0.020, 0.073, 0.006);
    // The eye: a white ball with a dark iris in front of it, and a skin-coloured
    // lid that slides down over it. A lid that moves is the only part of this
    // that has to work, because squint and blink are grammar too.
    const ballHolder = add(new SphereGeometry(0.0155, 12, 10), white, eyeAt);
    const iris = new SphereGeometry(0.0072, 10, 8);
    geometries.push(iris);
    const irisMesh = new Mesh(iris, dark);
    irisMesh.position.set(0, 0, 0.011);
    ballHolder.add(irisMesh);

    // The lid is thin and sits close over the eye. An earlier version was 20mm
    // tall and rested 22mm up, which put it straight over the brows: every brow
    // movement happened behind it and a raise and a furrow looked identical,
    // which is the one thing this rig has to get right.
    const lidGeometry = new BoxGeometry(0.040, 0.012, 0.012);
    const lidHolder = add(lidGeometry, options.skin, [eyeAt[0], eyeAt[1] + 0.016, eyeAt[2] + 0.002]);
    eyes.push({ lid: lidHolder, ball: ballHolder, openY: eyeAt[1] + 0.016, height: 0.012 });

    // Placed relative to the eye rather than on the sphere. A point higher on
    // a sphere is also further BACK on it, so a brow positioned by latitude sat
    // 12mm behind the eyelid and was drawn over by it -- invisible at exactly
    // the moments it carries the grammar. Sitting a little proud of the head is
    // the better trade for a mannequin: it reads like a drawn-on brow.
    const browAt: [number, number, number] = [eyeAt[0], eyeAt[1] + 0.030, eyeAt[2] + 0.004];
    const browHolder = add(new BoxGeometry(0.042, 0.0105, 0.010), dark, browAt);
    brows.push({ node: browHolder, restY: browAt[1], restX: browAt[0], side });
  }

  // The mouth. Scaled rather than reshaped: a box that gets taller for jawOpen
  // and narrower for a pucker reads well enough at this size, and a mouth with
  // real corners would need a mesh this mannequin does not have.
  const mouthAt = onHead(0, -0.036, 0.082, 0.002);
  const mouth = add(new BoxGeometry(0.046, 0.009, 0.012), dark, mouthAt);

  // Cheeks, for cheekPuff. Small enough to be invisible until they are used.
  const cheeks = [1, -1].map((side) =>
    add(new SphereGeometry(0.019, 10, 8), options.skin, onHead(0.062 * side, -0.016, 0.052, 0.012)));

  const tongue = add(new BoxGeometry(0.018, 0.006, 0.014), new MeshStandardMaterial({
    color: new Color('#b4646c'), roughness: 0.6,
  }), [mouthAt[0], mouthAt[1] - 0.004, mouthAt[2] + 0.004]);
  tongue.visible = false;

  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

  return {
    group,
    apply(face: FacePose): void {
      const innerUp = clamp01(faceWeight(face, 'browInnerUp'));

      brows.forEach((brow, i) => {
        const outerUp = clamp01(faceWeight(face, i === 0 ? 'browOuterUpLeft' : 'browOuterUpRight'));
        const down = clamp01(faceWeight(face, i === 0 ? 'browDownLeft' : 'browDownRight'));
        // Raise and furrow are deliberately given different SHAPES, not just
        // different amounts: a raise lifts the whole brow and tilts the inner
        // end up, a furrow drops it and pulls it toward the nose. Two markers
        // that differed only in magnitude would be unreadable.
        brow.node.position.y = brow.restY + 0.013 * (innerUp * 0.7 + outerUp) - 0.008 * down;
        brow.node.position.x = brow.restX - brow.side * 0.009 * down;
        // Negative for the avatar's left brow: rotating about +Z by a positive
        // angle lifts the OUTER end, and a raise lifts the inner one. Getting
        // this backwards made a yes/no question read as a scowl.
        brow.node.rotation.z = -brow.side * (0.42 * innerUp - 0.34 * down);
      });

      eyes.forEach((eye, i) => {
        const wide = clamp01(faceWeight(face, i === 0 ? 'eyeWideLeft' : 'eyeWideRight'));
        const squint = clamp01(faceWeight(face, i === 0 ? 'eyeSquintLeft' : 'eyeSquintRight'));
        const blink = clamp01(faceWeight(face, i === 0 ? 'eyeBlinkLeft' : 'eyeBlinkRight'));
        const closed = Math.max(blink, squint * 0.55);
        eye.lid.position.y = eye.openY + eye.height * (0.28 * wide) - eye.height * 1.55 * closed;
        const open = 1 + 0.18 * wide - 0.2 * closed;
        eye.ball.scale.set(1, open, 1);
      });

      const jaw = clamp01(faceWeight(face, 'jawOpen'));
      const pucker = clamp01(faceWeight(face, 'mouthPucker'));
      const funnel = clamp01(faceWeight(face, 'mouthFunnel'));
      const press = Math.max(
        clamp01(faceWeight(face, 'mouthPressLeft')), clamp01(faceWeight(face, 'mouthPressRight')));
      const smile = Math.max(
        clamp01(faceWeight(face, 'mouthSmileLeft')), clamp01(faceWeight(face, 'mouthSmileRight')));
      const frown = Math.max(
        clamp01(faceWeight(face, 'mouthFrownLeft')), clamp01(faceWeight(face, 'mouthFrownRight')));

      mouth.scale.set(
        1 - 0.5 * pucker - 0.25 * funnel + 0.15 * smile,
        1 + 4.2 * jaw + 2.6 * funnel + 1.4 * pucker - 0.35 * press,
        1,
      );
      mouth.rotation.z = 0.28 * smile - 0.28 * frown;
      mouth.position.y = mouthAt[1] - 0.004 * jaw + 0.004 * smile - 0.006 * frown;

      const puff = clamp01(faceWeight(face, 'cheekPuff'));
      for (const cheek of cheeks) cheek.scale.setScalar(0.35 + 0.9 * puff);

      tongue.visible = faceWeight(face, 'tongueOut') > 0.05;
      tongue.scale.setScalar(clamp01(faceWeight(face, 'tongueOut')));
    },
    dispose(): void {
      geometries.forEach((g) => g.dispose());
      dark.dispose();
      white.dispose();
    },
  };
}
