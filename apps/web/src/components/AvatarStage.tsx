import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { createAvatarPlayer, type AvatarPlayer } from '@signflow/renderer-three';
import { sampleFingerspell, type FingerspellPlan, type PlaybackClock } from '@signflow/engine';

/** Chest-up and front-on. The primary reading view; orbit is a departure from it. */
export const DEFAULT_CAMERA = {
  position: [-0.05, 1.36, 1.30] as const,
  // Framed on the signing space rather than the middle of the torso: the
  // dominant hand works beside the shoulder around x=-0.20, y=1.34, so the
  // target sits slightly off-midline toward it.
  target: [-0.07, 1.30, 0.06] as const,
  fov: 34,
};

interface RigProps {
  plan: FingerspellPlan;
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
function Rig({ plan, clock, onTime }: RigProps) {
  const player = useMemo<AvatarPlayer>(() => createAvatarPlayer(), []);
  const lastReport = useRef(0);

  useEffect(() => () => player.dispose(), [player]);

  useFrame((_, delta) => {
    const timeMs = clock.tick(delta * 1000);
    player.applyPose(sampleFingerspell(plan, timeMs));

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
  plan: FingerspellPlan;
  clock: PlaybackClock;
  onTime: (timeMs: number) => void;
  resetSignal: number;
}

export function AvatarStage({ plan, clock, onTime, resetSignal }: AvatarStageProps) {
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
      <Rig plan={plan} clock={clock} onTime={onTime} />
      <CameraRig resetSignal={resetSignal} />
    </Canvas>
  );
}
