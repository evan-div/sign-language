import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { createAvatarPlayer, type AvatarPlayer } from '@signflow/renderer-three';
import {
  samplePlan, type ASLPlan, type PlaybackClock, type Prepared, type Sequence,
} from '@signflow/engine';

/** Chest-up and front-on. The primary reading view; orbit is a departure from it. */
export const DEFAULT_CAMERA = {
  position: [0, 1.38, 1.74] as const,
  // Framed on the signing space rather than the middle of the torso. Signing
  // space runs roughly 0.9m wide once both hands and a raised salute are in it,
  // so the default has to be wide enough to hold a hand at full reach; orbit
  // and zoom are for looking closer, not for seeing the sign at all.
  target: [-0.02, 1.32, 0.05] as const,
  fov: 34,
};

interface RigProps {
  plan: ASLPlan;
  prepared: readonly Prepared[];
  sequence: Sequence;
  clock: PlaybackClock;
  onTime: (timeMs: number) => void;
}

/**
 * Drives the avatar every frame.
 *
 * Pose data deliberately never touches React state: reconciling 55 bones at
 * 60Hz would dominate the frame budget. React hears about time only at UI rate,
 * through `onTime`, and only to move the scrub handle and highlight a letter.
 */
function Rig({ plan, prepared, sequence, clock, onTime }: RigProps) {
  const player = useMemo<AvatarPlayer>(() => createAvatarPlayer(), []);
  const lastReport = useRef(0);

  useEffect(() => () => player.dispose(), [player]);

  useFrame((_, delta) => {
    const timeMs = clock.tick(delta * 1000);
    player.applyPose(samplePlan(plan, prepared, sequence, timeMs));

    // Throttle the React-facing update to roughly 20Hz.
    const now = performance.now();
    if (now - lastReport.current > 50) {
      lastReport.current = now;
      onTime(timeMs);
    }
  });

  return <primitive object={player.root} />;
}

function CameraRig({ resetSignal }: { resetSignal: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA.position);
    controls.current?.target.set(...DEFAULT_CAMERA.target);
    controls.current?.update();
  }, [resetSignal, camera]);

  return (
    <OrbitControls
      ref={controls}
      target={[...DEFAULT_CAMERA.target]}
      enablePan={false}
      minDistance={0.45}
      maxDistance={2.4}
      // Clamped so the avatar cannot be orbited to where the hands stop reading.
      minPolarAngle={Math.PI * 0.22}
      maxPolarAngle={Math.PI * 0.72}
      minAzimuthAngle={-Math.PI * 0.42}
      maxAzimuthAngle={Math.PI * 0.42}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

interface AvatarStageProps {
  plan: ASLPlan;
  prepared: readonly Prepared[];
  sequence: Sequence;
  clock: PlaybackClock;
  onTime: (timeMs: number) => void;
  resetSignal: number;
}

export function AvatarStage({ plan, prepared, sequence, clock, onTime, resetSignal }: AvatarStageProps) {
  return (
    <Canvas
      className="stage"
      shadows
      dpr={[1, 2]}
      camera={{ position: [...DEFAULT_CAMERA.position], fov: DEFAULT_CAMERA.fov, near: 0.05, far: 40 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0e1116']} />
      <hemisphereLight intensity={0.55} groundColor="#1a1f28" color="#cdd8e6" />
      {/* Key light from the front-left, so knuckles cast readable shadows. */}
      <directionalLight position={[1.4, 2.2, 2.0]} intensity={1.5} castShadow />
      {/* Rim light: separates fingers from the palm and from the torso behind. */}
      <directionalLight position={[-1.8, 1.4, -1.6]} intensity={0.85} color="#8ab4ff" />
      <Rig plan={plan} prepared={prepared} sequence={sequence} clock={clock} onTime={onTime} />
      <CameraRig resetSignal={resetSignal} />
    </Canvas>
  );
}
