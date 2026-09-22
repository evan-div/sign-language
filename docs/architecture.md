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

## Locations instead of inverse kinematics

There is no IK, so "put the hand at the chin" cannot be asked for directly.
Instead fourteen named places in signing space are solved numerically once, by
`tools/solve-locations.ts`, and committed as generated constants. The cost
function balances hitting the target against keeping rotations modest and the
elbow below the wrist and outside the torso — without those last terms the
solver returns contortions that reach the point and read as a broken arm.

Each location carries a wrist correction that leaves the hand palm-out and
fingers-up wherever the arm put it. That is what lets a sign's orientation be a
delta which means the same thing at every location.

## Signs are handshape, location, orientation over time

That decomposition is not arbitrary: it is what ASL phonology describes signs
with, which is what later lets these entries carry ASL-LEX metadata and act as
the prior for extracted motion.

Two consequences worth stating:

- **A handshape contributes fingers only.** Letters G, H, P and Q carry a wrist
  rotation as part of being that letter, which is a fingerspelling concern.
  Borrowing H's fingers for NAME must not borrow the angle the letter H is held
  at, so sign compilation drops the handshape's own wrist.
- **Orientations are named by their two directions**, not by Euler angles.
  Euler triples hide their own mistakes — an orientation called PALM_UP can
  face the palm up and still leave the fingers pointing back at the signer, and
  nothing in the numbers says so. Stated as "fingers here, palm there", the name
  and the behaviour are the same thing, and a test can check them against each
  other. That test immediately caught seven orientations that were silently
  transposed.

## Why transitions scale with distance

The sequencer trims every clip to its stroke and generates the travel between
signs itself, because concatenating whole clips plays one sign's release
straight into the next sign's approach.

A fixed transition then fails as soon as distances vary. A one-handed sign
followed by a two-handed one has to bring the non-dominant hand roughly 40cm up
from rest; at the same duration as a 5cm adjustment that moved the wrist 24mm
per frame, a visible snap. Transition length is now a function of how far the
hands actually travel, which removes the whole class.

The end pause after a sentence is deliberately *not* a transition. Folding it
into the tail made punctuation silently ineffective, because the tail is
clamped like any other travel; the pause is now held at rest after the hands
are down.

## The plan is the contract

`ASLPlan` is the one structure the interface reads. Highlighting, click-to-replay,
the gloss line and the notices all come off it, which is why each segment carries
character offsets back into the original sentence: after dropping words and
moving the question word to the end, sign order no longer matches English order,
and only the spans still tie the two together.

Non-manual markers live beside the segments rather than on them, because they
are suprasegmental — a question's brow raise covers the whole clause, not one
sign. Today only head movement is rendered; brow raise and furrow are carried in
the data and stood in for by head tilt, because the placeholder mannequin has no
face. That is a rendering gap, not a data gap, and it is the right way round: a
face track cannot be retrofitted onto a format that assumed hands only.

## Translation is rules, on purpose

English-to-ASL machine translation is not solved. A system that quietly produces
confident nonsense is worse than one whose limits are legible, so every step
here is a stated rule that can be pointed at and argued with, and every departure
from the input comes back as a notice the interface shows.

The resolver never guesses across a meaning boundary. A lemma with more than one
sense stops and asks; the sentence still plays so it is not a dead end, but the
choice is visibly not ours to have made.
