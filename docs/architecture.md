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

## The fist letters, and R

M, N and T are the same fist three times over. What separates them is which
gap between the knuckles the thumb tip appears in: between ring and little for
M, middle and ring for N, index and middle for T. Those targets are solved
numerically and asserted, because a thumb "buried in the fist" is not a
specification — the emergence point is the whole letter.

T and K share a thumb position, and that is correct rather than a shortcut:
both wedge the thumb between index and middle. The contrast is in the fingers,
where T closes a fist around it and K leaves index and middle standing.

R needs two fingers genuinely crossed. Opposed lateral fan swaps which side of
the hand each finger occupies, but that alone leaves them in the same plane,
overlapping rather than crossed. A little extra knuckle flexion on the index
carries it forward off the middle finger's plane, so the middle passes behind
it. The tests assert all three properties — swapped order, depth separation,
and tips still close together — because any one alone can be satisfied by a
handshape that does not read as R.

## Remaining approximations

- **No collision response.** Fingers resting on the thumb are positioned to
  look right rather than actually touching, and interpolating between two
  handshapes can drive a finger through another. Real systems use collision
  avoidance; we do not yet.
- **K and P** place the thumb between index and middle by position only.
- The mannequin's finger segments are thick capsules, which under-resolves the
  M/N/T thumb cue. A properly modelled hand would show it more clearly than
  this placeholder can.

## What the tests can and cannot prove

The geometric assertions prove a handshape has the right measurements. They
cannot prove it is legible. That gap is why Milestone 2's completion criterion
is a human read-back, and why `tools/screenshot.mjs` exists.
