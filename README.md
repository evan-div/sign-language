# SignFlow

Text-to-ASL. A user types English; a 3D avatar signs it.

This repository contains **Milestones 1 to 5**: a rigged placeholder avatar, the
animated manual alphabet, a small library of lexical signs, an English-to-ASL
sentence pipeline, and the offline motion pipeline that will eventually replace
the hand-authored signs with extracted motion. There is no backend and no
accounts — by design. See `docs/architecture.md` for why the build order runs
this way.

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
pnpm test         # 91 assertions across the skeleton, handshapes and timing
pnpm typecheck
pnpm build
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
- **Twenty lexical signs**, one- and two-handed, plus all 26 letters with J/Z
  movement and double-letter bounces.
- **Non-manual markers** as a parallel track: yes/no and WH questions and
  negation, rendered as head movement.
- Play, pause, scrub, five speeds, a gloss toggle, and click any word or gloss
  to replay that sign. Orbit and zoom, clamped so the hands stay readable.

**The sign vocabulary is placeholder.** It was authored from written
descriptions by someone who is not a fluent signer and reviewed by no Deaf
signer. It exists to exercise the pipeline, not to teach ASL.

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
| `data/` | Exported skeleton and handshape JSON, for the future motion pipeline |
| `pipeline/` | Python: landmarks, solver, handshape prior, smoothing, QC, export |
| `tools/` | QC report, data export, screenshot harness |

`packages/engine` must never import a renderer or anything browser-specific.
That one rule is what keeps the desktop and mobile paths open.

## Not built yet, deliberately

Accounts, a backend, the video-extraction pipeline, a face rig, numbers,
classifiers, spatial referencing, and a real avatar. Each is scheduled in the
architecture report, and none is needed to prove that the runtime produces
legible signing.
