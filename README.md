# SignFlow

Text-to-ASL. A user types English; a 3D avatar signs it.

This repository contains **Milestones 1 to 6**: a rigged placeholder avatar, the
animated manual alphabet, a hundred lexical signs, an English-to-ASL sentence
pipeline, the offline motion pipeline that will eventually replace the
hand-authored signs with extracted motion, and a linter that makes a vocabulary
this size reviewable at all. There is no backend and no accounts — by design.
See `docs/architecture.md` for why the build order runs this way.

**The extraction stage has never been run against video.** ASL Citizen is
licence-gated, and the reconstruction stack it needs wants a GPU and gated
model weights. Everything downstream of extraction is built and measured
against synthesised landmarks; `pipeline/README.md` says exactly what that does
and does not show.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

```bash
pnpm test         # 200 assertions across the skeleton, handshapes, signs and timing
pnpm typecheck
pnpm build
pnpm lint:signs   # geometric checks over the whole sign library
pnpm coverage     # how much ordinary English the lexicon answers for
```

## What works today

Type a sentence; the avatar signs it.

- **Translation**: phrase matching ("thank you" is one sign), function-word
  dropping, WH-movement, synonym substitution, and fingerspelling for anything
  it does not know.
- **Ambiguity**: a word with more than one meaning is never guessed at. "right"
  stops and asks which sense you meant.
- **Honesty**: every departure from what you typed — a dropped word, a
  substituted sign, a word it had to spell — is reported, and marked in the
  sentence itself.
- **A hundred lexical signs**, one- and two-handed, plus all 26 letters with
  J/Z movement and double-letter bounces. Browse them in the Vocabulary tab:
  each carries its description, the English that reaches it, and how far it
  should be trusted.
- **Words ASL carries in space** — prepositions, conjunctions, "it", "this" —
  are dropped with a notice that says so, rather than spelled out. Of the 100
  most frequent English words the system has an answer for 92% weighted by
  frequency; `pnpm coverage` prints the table.
- **Non-manual markers** as a parallel track: yes/no and WH questions and
  negation, rendered as head movement.
- Play, pause, scrub, five speeds, a gloss toggle, and click any word or gloss
  to replay that sign. Orbit and zoom, clamped so the hands stay readable.

**The sign vocabulary is placeholder.** All hundred signs were authored from
written descriptions by someone who is not a fluent signer and reviewed by no
Deaf signer. They exist to exercise the pipeline, not to teach ASL. Going from
twenty to a hundred did not make them more trustworthy; it made the machinery
around them measurable.

## How a hundred signs stay reviewable

Nobody can watch a hundred signs on every commit, so `pnpm lint:signs` decides
everything that geometry can decide: hands inside the head or chest, limbs
through the torso, a contact point that misses the landmark it names, a repeated
movement whose cycle does not close, two signs that compile to the same motion,
wrist speeds that read as a snap, a one-handed sign that moves the other hand.
Errors fail the test suite; warnings are judgement calls and are printed.

It cannot check the one thing that matters most. A sign can be smooth, distinct,
anatomically sound and simply not the ASL for the word, and only a Deaf reviewer
will catch that. Every entry stays `unvalidated` however clean the report.

## How handshapes are verified

Handshapes are authored as joint rotations, so "does this look like an F?"
cannot be answered by reading the source. Instead the skeleton carries forward
kinematics, and every letter is asserted geometrically — `F` and `O` must close
the thumb onto a fingertip to within 2 cm, `V` must separate index and middle by
more than twice `U` does, `G` and `H` must point the fingers across the body.

```bash
pnpm handshapes:report   # measured geometry for all 26 letters
pnpm solve:locations     # re-solve signing-space locations
pnpm export:data         # skeleton, handshapes, signs and lexicon as JSON
pnpm lint:signs          # geometric checks over the sign library
pnpm coverage            # English coverage against an independent frequency list
pnpm screenshot          # visual QC via headless Chromium (dev server must be running)
```

Geometry is necessary but not sufficient. **Milestone 2 is not complete until a
fluent signer reads back 8 of 10 spelled words correctly.**

M, N and T are near-identical fists distinguished only by which gap the thumb
tip emerges from, and R depends on two fingers genuinely crossing. Those
positions are solved against explicit targets and asserted, but they are the
subtlest letters in the set and are worth a reviewer's attention first.

## Layout

| Path | Contains |
| --- | --- |
| `apps/web` | React + Vite app |
| `packages/motion-format` | Canonical skeleton, quaternion maths, forward kinematics, VRM retarget map |
| `packages/engine` | Handshapes, postures, signs, sequencer, lexicon, translation, playback clock |
| `packages/renderer-three` | Three.js adapter and the procedural mannequin |
| `data/` | Exported skeleton, handshape and sign JSON for the motion pipeline, and the English frequency list coverage is measured against |
| `pipeline/` | Python: landmarks, solver, handshape prior, smoothing, QC, export |
| `tools/` | QC report, sign linter, coverage measurement, data export, screenshot harness |

`packages/engine` must never import a renderer or anything browser-specific.
That one rule is what keeps the desktop and mobile paths open.

## Not built yet, deliberately

Accounts, a backend, the video-extraction pipeline, a face rig, numbers,
classifiers, spatial referencing, and a real avatar. Each is scheduled in the
architecture report, and none is needed to prove that the runtime produces
legible signing. `docs/architecture.md` ends with the list of things the sign
notation still cannot express, which is the honest version of this section.
