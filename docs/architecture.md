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

## A location is a place, not a wrist

The solved location table gives arm rotations that put a joint at a point, and
until the vocabulary grew past twenty signs that joint was always the wrist.
This is wrong for most signs made at the face. A sign "at the chin" touches the
chin with the fingertips; the wrist sits a hand's length below. Putting the
wrist at the chin instead leaves the fingertips somewhere else entirely.

Measured, with the fingers pointing up: 18.4cm between wrist and middle
fingertip, which put the fingertips 12.4cm above the crown of the head at
FOREHEAD, 10.4cm above it at TEMPLE, 7.4cm at EAR. Five of the first twenty
signs were affected. Nothing in the test suite noticed, because every assertion
was about the wrist, which was exactly where it had been asked to go.

So a keyframe may name a **contact site** -- a fingertip, the thumb, the palm,
the knuckles -- and the arm is re-solved at compile time to put that part of the
hand on the point. This does not need general inverse kinematics. An orientation
is stated in world directions and so does not depend on how the arm got there:
if the hand's world rotation is O, the offset from the wrist to any point in the
hand is a known constant rotated by O. "Fingertip at T" is therefore "wrist at
T minus that offset", and what remains is the same three-degree-of-freedom
position solve the offline table already does, seeded from its answer.

The default stays `wrist`, so nothing that was right became wrong: the six signs
that were refactored onto the new notation compile bit-for-bit identically.

## What the arm cost function learned

Solved arms are scored by reach first and shaped by the other terms, and two of
those terms were wrong in opposite directions.

"Elbow at least 13cm off the midline" was a stand-in for "elbow not inside the
chest" that only looks sideways. For any target at the face -- where the elbow
naturally comes forward and in -- the only way to satisfy it was to raise the
elbow, and every face location solved with the elbow flared to shoulder height.
Measuring penetration properly, in all three axes, lets the elbow come in front
of the ribs where it belongs.

Replacing it with a ceiling on elbow height failed the other way: reaching above
your head *requires* the elbow above the shoulder, and as a hard rule it left
ABOVE_HEAD 15cm short of its target. It is a preference now, weighted so that it
settles ties between poses that both reach and yields to anything that does not.

Joints are not enough either. An upper arm can have its shoulder and its elbow
both outside the torso and its middle four centimetres inside it, so both limb
segments are sampled along their length. A contralateral reach still overlaps
the chest by about 1.3cm, which is the mannequin having no give rather than a
solver failure; a real arm flattens.

Three locations -- NOSE, CHEEK and BROW -- do not reach their targets, by 1.1 to
1.5cm. Those points are inside the head, and a wrist cannot be. They resolve to
the nearest reachable point outside it and are only meant to be used with a
contact site, which re-solves and does reach them.

## The notation says a thing once

Three shorthands, each earning its place by removing a duplication that was
already producing bugs:

- **symmetry: mirror** -- the non-dominant hand does what the dominant one does.
  WHAT was two identical five-keyframe tracks, maintained in parallel.
- **symmetry: alternate** -- the non-dominant hand is at time t where the
  dominant hand is at (duration - t). Time-reversal, not a phase offset: for an
  oscillating sign it is true alternation, for a one-way movement it is the
  hands travelling in opposite directions, and unlike a phase offset it is well
  defined on any track with no wrap-around ambiguity at the ends.
- **base** -- a non-dominant hand that holds one configuration throughout.
- **repeat** -- an interval played several times.

`expandSign` turns all four back into the explicit form, and it is the only
place that knows about them. That is what makes the claim testable: the sugar is
exactly the desugaring, and the tests state each expansion in full.

The first version of `repeat` emitted only the extra copies and not the cycle as
written, so every repeating sign played one cycle fewer than it asked for, with
a long slow drift where the first cycle should have been. The linter did not
catch it -- it was comparing the wrong two times -- and neither did the eye. A
test that stated the expected keyframe list in full caught it immediately.

## The linter is what makes a hundred signs possible

At twenty signs a person can watch every one. At a hundred they cannot, and the
failure is not a sign that looks slightly off -- it is a hand inside a head, or
two signs that compile to the same motion, and nobody notices for a month.

So every property that can be decided from geometry is decided on every commit:
timing and stroke bounds, name resolution, repeat continuity, whether a contact
site lands where it was aimed, whether a one-handed sign leaves the other hand
alone, hands occupying the same space, limbs inside the body, whether the sign
moves at all, peak wrist speed, elbow posture, and pairwise distinctness.

Thresholds are calibrated rather than guessed where there is data to calibrate
against. Peak wrist speed across the library has a median of 0.76 m/s and a 90th
percentile of 1.42, so the warning sits at 1.8.

It found, among others: HELLO's wrist 3.5cm inside the chest once the salute
was aimed by its fingertips; DEAF's finger cutting through the head between the
ear and the mouth; a C hand whose curled fingers went through the throat; two
handshapes that were duplicates of letters (POINT is the letter Z, and is now
declared as an alias so they cannot drift apart; CLAW measured 6mm from the
letter C, which would have rendered every CLAW sign as a C).

**What it cannot check is the only thing that finally matters.** No amount of
geometry will catch a sign that is fluent, smooth, well separated and simply not
the ASL for the word. Every entry stays `unvalidated` however clean the report.

## Distinctness has to be a trajectory

Comparing signs at the middle of the stroke seemed reasonable and is not. GO and
COME are the same hands in the same place travelling in opposite directions:
measured at the midpoint they are **0.0cm apart**. ASL distinguishes many pairs
by direction alone, so a check that cannot see direction is blind to exactly the
pairs it exists for. Signs are compared as five points through the stroke,
divided by the sample count so the number still reads as metres.

## Coverage, measured against a list we did not choose

Scoring a vocabulary against a word list chosen alongside it only proves the two
agree. The 2,000 most frequent English words (see `data/english/README.md`) were
fixed long before this project and have no connection to ASL.

Of the 100 most frequent English words, the system has an answer for 76% by
type and 93% weighted by frequency; at 2,000 words it is 13% and 65%. "An
answer" means a sign, a stated substitution, or a word deliberately dropped --
not a word spelled letter by letter.

Getting there needed a category that did not exist. Prepositions and
conjunctions were being fingerspelled, and spelling "w-i-t-h" is not what a
signer does, it is what a system does when it has run out of ideas. ASL carries
those in space and on the face. They are dropped now, with a notice that says so
in different words from the notice for "ASL does not sign this" -- the first is
a roadmap item, the second is a fact about the language, and running them
together would hide the roadmap. That distinction alone is the difference
between answering 10% of the top 2,000 and answering 63%.

## What the notation still cannot say

Honest gaps, in rough order of how much they matter:

- **Directional verbs.** GIVE-you and GIVE-me are one sign aimed at two places.
  There are no loci, so every verb is signed at its citation form.
- **Numbers**, and therefore anything counted or timed precisely.
- **Classifiers**, which is most of how ASL describes shape, movement and
  arrangement.
- **Internal movement of the fingers** -- wiggling, releasing -- is approximated
  by alternating between two whole handshapes.
- **Facial grammar** is carried in the data as spans and rendered only as head
  movement, because the mannequin has no face.
- **Contact** is positional, not physical: two hands that should touch are
  placed near each other and nothing enforces it.
- **Non-manual mouth morphemes**, which distinguish real minimal pairs.

## The face is a channel, not a joint

A face is driven by named weights, not by rotations, and every avatar pipeline
worth targeting -- VRM 1.0 expressions, ARKit, Live Link -- already speaks that
vocabulary. So the face is a parallel track named the way ARKit names its
blendshapes, and a real avatar can consume it with a lookup table rather than a
translation layer.

Keeping it parallel rather than folding it into the pose is not tidiness. A brow
raise spans a clause while the hands change six times underneath it; one
keyframe list would make every facial change a whole-body keyframe.

Two rules differ from the joint pose on purpose. Weights compose by taking the
**strongest** of each channel, where joints compose by replacement: a head can
only be in one place, so two markers moving it have to resolve to one rotation,
but two markers both raising the brows should raise them once rather than have
the later cancel the stronger earlier one. And a weight outside 0..1 from an
external clip is refused rather than clamped -- a weight of 3 means the producer
is using degrees or a percentage, and clamping hides that behind a face that is
merely wrong.

## Markers are named for what they do

A marker is a bundle. A yes/no question is raised brows AND widened eyes AND the
head carried forward, so naming them by articulation -- `brow_raise` -- named one
strand of a rope and left the rest unaccounted for. They are named for their
grammatical function now, and the articulation is a table that can be argued
with or replaced without renaming anything.

Two things that table has to get right. A yes/no question and a WH question must
differ in the **direction** the brows move, because that is the contrast ASL
uses and two markers separated only by magnitude are unreadable. And topic and
conditional are both brow raises, told apart by the head -- back for a topic,
tilted for a conditional -- which is why the head is part of the bundle.

Building the face rig proved the point twice over. The first version had the
brow rotation inverted, so a question read as a scowl, and eyelids tall enough to
cover the brows entirely, so every brow movement happened behind them. A raise
and a furrow came out identical -- the one thing the rig exists to distinguish.
Neither was visible in any test; both were obvious in a screenshot.

## A marker without a scope is decoration

Non-manual markers scope over clauses. A headshake that runs to the end of the
input negates things the signer did not negate, and a question marker over a
whole sentence tells the reader a conditional clause was part of the question.
Before this, negation ran to the end and the question markers covered
everything.

So clauses are found -- from punctuation and a two-word list, not a parser -- and
each marker is scoped to one: a conditional marks its own clause, a fronted
phrase before a comma is taken as a topic, a question marks the **main** clause,
and negation and affirmation run to the end of the clause they appear in.

It is a rule, so it can be wrong, and it was: a leading "No," was being read as a
topicalised noun phrase. The narrowest fix that answers it is that a clause
consisting of nothing but yes or no gets no topic marker, which is written down
where the marker is emitted rather than hidden in the clause finder.

Markers can also genuinely contradict. "If it is not good, I stop" is a
conditional, which raises the brows, containing a negation, which lowers them.
The plan linter found it by noticing the overlap. A signer does not compromise:
the brows stay up for the conditional and the negation is carried by the
headshake, which is its obligatory part anyway. So a marker declares which way
it pulls the brows, and a lowering marker yields its brows to a raising one
while keeping its head movement.

## Numbers come out as composition

A signed number is a short sequence of handshapes in one place, which means it
can be generated. The library does not grow by a thousand entries to cover a
thousand numbers, and "42" needs nobody to have thought about 42 in advance.

Seven of the ten digit handshapes already existed -- 0 is the letter O, 1 is the
pointing hand, 2 is V, 9 is F, and 4, 5, 8 and 10 were shapes the lexical signs
already needed. Only 3, 6 and 7 had to be added. That is the
handshape-as-parameter bet paying out: a number is not a new kind of thing, it
is the same parameter with a different value.

Number incorporation is the sharper test. ASL signs "three weeks" as WEEK made
with a three handshape -- one sign carrying both meanings -- and if a sign really
is handshape, location, orientation and movement, incorporating a number should
be substituting one parameter and nothing else. It is: the whole of
incorporation is a map over keyframes.

What the composer does not do is guess. Idiomatic forms for 21, 22, 23, 25 and
the 60s have their own shapes that are not their digits in sequence, and they are
not special-cased -- the general rule is stated and its exceptions are named.
11 to 15 move **inside** the hand, a flick or a bend this notation cannot
express, and are approximated by alternating two whole handshapes and marked as
the weakest entries. Years read as pairs ("nineteen eighty-four"), ordinals,
decimals, times and phone numbers are all signed differently and are not parsed
at all; a number past what the composer builds is signed digit by digit, which is
what ASL does for long strings anyway and is not the same as fingerspelling it,
because digits are not letters.

The palm-orientation convention -- 1 to 5 toward the signer, 6 to 9 toward the
addressee -- is a choice, stated in one place, and near the top of what a Deaf
reviewer should check first. A wrong palm is not a stylistic slip; for some
numbers it is a different sign.

## "Every sign moves" was false

The linter's motion check flagged every single-digit number, because a signed 5
is an open hand held up and nothing travels. That was the check being wrong, not
the signs: ASL has signs that are a configuration presented in place. A sign can
declare itself held, and the check then asks the question that still matters --
whether the hand ever leaves rest -- rather than the one that does not.

The same check caught a real fault in the same run. 99 composed as "the 9 hand,
then the 9 hand" shows the reader a single 9; it measured zero fingertip travel
across the whole sign. Doubled digits shift sideways now, which is what ASL does.
