# SignFlow

Text-to-ASL. A user types English; a 3D avatar signs it.

This repository currently contains **Milestones 1 and 2 only**: a rigged
placeholder avatar and a complete, animated ASL manual alphabet. There is no
translation layer, no sign lexicon, and no backend yet — by design. See
`docs/architecture.md` for why the build order starts here.

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

- Type any word; the avatar fingerspells it with eased, continuous transitions.
- All 26 letters, including J and Z path movement and double-letter bounces.
- Play, pause, scrub, five playback speeds, click a letter to replay it.
- Orbit and zoom, clamped so the hands stay readable; reset to the front view.

## How handshapes are verified

Handshapes are authored as joint rotations, so "does this look like an F?"
cannot be answered by reading the source. Instead the skeleton carries forward
kinematics, and every letter is asserted geometrically — `F` and `O` must close
the thumb onto a fingertip to within 2 cm, `V` must separate index and middle by
more than twice `U` does, `G` and `H` must point the fingers across the body.

```bash
pnpm handshapes:report   # measured geometry for all 26 letters
pnpm screenshot          # visual QC via headless Chromium (dev server must be running)
```

Geometry is necessary but not sufficient. **Milestone 2 is not complete until a
fluent signer reads back 8 of 10 spelled words correctly.** M, N, T and R are
known approximations and should be reviewed first.

## Layout

| Path | Contains |
| --- | --- |
| `apps/web` | React + Vite app |
| `packages/motion-format` | Canonical skeleton, quaternion maths, forward kinematics, VRM retarget map |
| `packages/engine` | Handshapes, postures, fingerspelling synthesis, playback clock |
| `packages/renderer-three` | Three.js adapter and the procedural mannequin |
| `data/` | Exported skeleton and handshape JSON, for the future motion pipeline |
| `tools/` | QC report, data export, screenshot harness |

`packages/engine` must never import a renderer or anything browser-specific.
That one rule is what keeps the desktop and mobile paths open.

## Not built yet, deliberately

Accounts, a sign lexicon, English→ASL translation, the video extraction
pipeline, facial animation, numbers, and a real avatar. Each is scheduled in
the architecture report, and none of them is needed to prove that the runtime
produces legible signing.
