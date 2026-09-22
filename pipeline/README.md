# SignFlow motion pipeline

The offline half of the architecture: video in, motion clips out. It never runs
in the browser and the app never imports it — its output is committed artefacts
the engine loads.

```
video ──▶ extract ──▶ solve ──▶ prior ──▶ smooth ──▶ QC gate ──▶ SFMC clip
          landmarks   rotations  handshape  temporal   accept /
                                            filter     review /
                                                       reject
```

## Status: the extraction stage has never been run

Milestone 5 asks for ten signs extracted from ASL Citizen through a
DexAvatar-style stack. **That was not possible here and has not been done.**

| Requirement | Status |
| --- | --- |
| ASL Citizen video | Licence-gated; the download is not reachable from this environment |
| DexAvatar / SMPLer-X / HaMeR | Need a GPU and gated SMPL-X weights; this machine has neither |
| MediaPipe | Installs and runs on CPU — but there is no video to feed it |

Everything downstream of extraction is built and tested against **synthesised
landmarks**: a known pose is projected out to landmark positions, corrupted the
way an extractor would corrupt it, and solved back, so the result can be
measured against ground truth. That is a real measurement of the solver, the
prior, the smoother and the gate. It is not a measurement of whether a vision
model can see a real signer, and nothing here should be read as one.

## What the measurements say

Run them: `python experiments/noise_amplification.py`, `error_budget.py`,
`noise_sweep.py`, `end_to_end.py`.

**The solver amplifies landmark noise about 2.7×.** A distal phalanx is roughly
20mm long, so a few millimetres of landmark error is many degrees of joint
error, and that angle propagates to everything below it. At 10mm of landmark
noise, fingertips land about 29mm from the truth.

| Landmark noise | Fingertip error (mean) | Amplification |
| --- | --- | --- |
| 5mm | 14mm | 2.8× |
| 10mm | 29mm | 2.9× |
| 20mm | 53mm | 2.6× |

For scale: published whole-body estimators report hand errors around 17–18mm,
and hand specialists do better. So the realistic operating range is the middle
of that table, not the top.

**Most of the error is wrist orientation, not finger flexion — 71–89% of it.**
This is the finding that most qualifies the architecture report. That report
argued the vision model does not need to get fingers right because the lexicon
already knows the handshape. True, and it addresses the minority of the error:
fixing the fingers to ground truth still leaves 19mm of the 27mm total at 10mm
noise, because the whole hand is pointing slightly wrong and every finger goes
with it.

Fitting the palm plane to all five palm landmarks instead of a three-point
triangle recovers 6–9% of the orientation error at low noise. Worth doing,
nowhere near sufficient.

**The handshape prior helps, modestly.** At 10mm noise it takes fingertip error
from 28.5mm to 21.6mm, about a quarter. The best weight is consistently 0.75,
never 1.0 — replacing the fingers outright throws away everything specific to
how this signer made this sign, and still cannot fix the wrist. The prior is a
bias-variance trade, not a free win, and the bias term depends on how far real
articulation sits from citation form, which nobody here has measured.

**Solving frames independently produces unusable motion.** Every frame draws
fresh noise, so consecutive frames disagree by roughly twice the per-frame
error even when the hand is still — 93 to 128mm of frame-to-frame fingertip
movement, against real signing that moves a fingertip a few centimetres between
frames. The quality gate caught this in the pipeline's own output. Gaussian
smoothing over rotations cuts reconstruction error from 36mm to 21mm and jitter
from 105mm to 56mm; wide enough windows pass the gate but start rounding off
the stops that make a stroke readable.

## The honest read on the go/no-go gate

The milestone's gate was "if cleanup exceeds roughly 15 minutes per sign,
reconsider". That gate cannot be answered without real video, and these numbers
do not answer it. What they do say is that the approach is harder than the
architecture report assumed, in a specific and actionable way: the report bet on
handshape accuracy, and handshape is not where most of the error is.

Two concrete consequences for whoever runs this against a real corpus:

1. **Budget for orientation, not just handshape.** ASL-LEX annotates orientation
   as well as handshape; extending the prior to cover it is where the remaining
   leverage is, and it is not built here.
2. **Temporal smoothing is not optional and is not free.** It is the difference
   between unusable and marginal, and its window length trades directly against
   the sharpness of a sign's stroke.

## Layout

| Path | What it does |
| --- | --- |
| `signflow_pipeline/skeleton.py` | Canonical skeleton and FK, loaded from the exported JSON |
| `signflow_pipeline/landmarks.py` | Landmark topology and the palm-plane fit |
| `signflow_pipeline/solve.py` | Landmarks to canonical rotations |
| `signflow_pipeline/handshapes.py` | Handshape classifier and equivalence classes |
| `signflow_pipeline/prior.py` | The phonological handshape prior |
| `signflow_pipeline/smooth.py` | Temporal smoothing over rotations |
| `signflow_pipeline/qc.py` | The quality gate |
| `signflow_pipeline/export.py` | SFMC clips the engine can play |
| `signflow_pipeline/extract.py` | MediaPipe adapter — **the one untested stage** |

## Running it

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest -q
.venv/bin/python experiments/end_to_end.py --noise 10 --weight 0.75 --smooth 3
```

The skeleton, handshapes and fixtures are read from `../data`, generated by
`pnpm export:data`. The TypeScript engine owns them; duplicating them here would
let the two drift, and `tests/test_fk_parity.py` pins the two forward-kinematics
implementations to the same numbers.

## A note from Milestone 6

The handshape prior is exercised by the solver's round-trip tests, which are
parameterised over the compiled handshape library. The vocabulary work added six
handshapes with no letter equivalent (bent-V, open-8, baby-O, bent-L, four,
thumb-out), so those tests grew from 67 to 73 without anything here changing:
the new shapes round-trip through the Python solver on the same terms as the
letters.

ASL-LEX itself is still out of reach. `asl-lex.org` and its OSF download are
blocked from this environment and the project's GitHub repository holds the
visualisation, not the data. That makes two milestones running in which the
phonological database the architecture's central bet rests on has not been
opened. The bet is not refuted; it is unchecked, and the distinction is worth
keeping in view.
