# Architecture notes

Decisions that are expensive to reverse, and why they were made this way.
The full research and architecture report sits outside this repository.

## Why fingerspelling first

Fingerspelling is the only substantial capability in SignFlow with no dataset
dependency, no ML dependency and no licensing exposure — and it exercises the
entire runtime: posing, blending, sequencing, the timeline, highlighting and
the camera. Building it first means the risky part (acquiring accurate sign
motion from video) plugs into a runtime that already works, instead of being
debugged at the same time as everything else.

It is also most of the target demo: "hello my name is Evan" is roughly 60%
fingerspelling by duration.

## The canonical skeleton

`packages/motion-format/src/skeleton.ts` defines 55 joints matching SMPL-X's
topology and ordering. We adopt the topology, not the body model: nothing
stores shape or expression coefficients, which keeps licensing exposure on
datasets rather than on the motion format. The reason to match SMPL-X is
interop — every dataset, extractor and research model in this field speaks it.

Two conventions the whole handshape system depends on:

1. **Every joint's rest rotation is identity.** Bone geometry lives entirely in
   the rest offsets, so a joint's local rotation is expressed in world-aligned
   axes at bind time.
2. **The bind pose is a "goalpost"**, not a T-pose: forearms vertical, palms
   forward, fingers up. This aligns the hand frame with the world frame, so
   finger flexion is a rotation about +X and lateral fan about +Z, for both
   hands. Mirroring to the left hand negates the quaternion's Y and Z
   components, which leaves pure-X flexion untouched — correct, since both
   hands curl the same way.

## Rotations, not landmark positions

Much of the sign language processing community stores 3D landmark positions
(MediaPipe-derived `.pose` files). That is right for recognition research,
where the data feeds a network. It is wrong for driving a rigged avatar:
positions must be converted to rotations by IK, and IK over noisy finger
landmarks produces exactly the jitter that makes fingerspelling unreadable.
Rotations retarget directly and blend correctly — slerping a joint rotation is
meaningful, lerping between two landmark clouds is not.

## Poses are sparse

A handshape names finger joints; a posture names arm joints. Composing them is
how 26 letters reuse one arm pose. The consequence is a renderer contract:
**joints a pose omits must be reset to rest each frame**, or the previous
frame's rotation survives and fingers never uncurl. `MannequinPlayer.applyPose`
does this, and `fingerspell.test.ts` pins the expectation.

## The dependency rule

`packages/engine` may not import `packages/renderer-three`, `apps/web`, or
anything browser-specific. The engine takes a plan and emits timed poses;
rendering is an adapter behind the `AvatarPlayer` interface. This is what keeps
Tauri, Capacitor and a React Native renderer available later without a rewrite,
and what would make swapping Three.js for Babylon a package replacement rather
than a rewrite.

## Per-frame data never enters React state

The scene is composed with React Three Fiber, but bone quaternions are written
imperatively in `useFrame`. Reconciling 55 bones at 60Hz would dominate the
frame budget. React hears about playback time only at roughly 20Hz, and only to
move the scrub handle and highlight a letter.

One consequence worth knowing: the UI's `playing` flag mirrors the clock and is
refreshed on rendered frames, so under very low frame rates it can lag the
clock briefly. It self-corrects on the next frame.

## The thumb is specified outright

Fingers are authored as flexion and spread parameters, which read like ASL
phonology and can be reviewed. The thumb resists that parameterisation — its
rest axis is diagonal and its meaningful positions (across the palm, tucked,
pinching, extended) are not points on a single curl axis. Rather than invent a
parameterisation that would be subtly wrong, thumb joint rotations are stated
as explicit Euler angles, solved numerically against target fingertip positions
and then verified by assertion.

## Known approximations

- **M, N, T** bury the thumb under or between curled fingers. A bone hierarchy
  with no collision response cannot express that contact; the thumb is placed
  plausibly but does not truly tuck.
- **R** crosses index over middle, approximated by opposed lateral fan. It
  reads as "close together and leaning" rather than genuinely crossed.
- **K, P** place the thumb between index and middle; contact is approximate.
- Interpolating between two letter handshapes can drive fingers through each
  other. Real systems use collision avoidance; we do not yet.

## What the tests can and cannot prove

The geometric assertions prove a handshape has the right measurements. They
cannot prove it is legible. That gap is why Milestone 2's completion criterion
is a human read-back, and why `tools/screenshot.mjs` exists.
