"""Does a phonological handshape prior rescue noisy extraction?

The architecture bets that knowing what a sign's handshape should be can fix
what a vision model gets wrong about fingers. That bet is testable without video
by working backwards: take a pose we know, project it to landmarks, corrupt
them the way an extractor would, solve back, and measure how far the result sits
from the truth with and without the prior.

The trade being measured is bias against variance. Blending toward the citation
handshape removes extraction noise and adds the difference between citation form
and how a person actually articulates the sign. So the experiment sweeps both:
``sigma`` is landmark noise, ``delta`` is articulation departure from citation
form, and the question is which weight wins where.

WHAT THIS DOES NOT SHOW. The noise here is independent and Gaussian per
landmark. Real extractors fail in correlated ways -- a whole finger lands in the
wrong place when it is occluded -- so a second sweep adds gross single-finger
errors. Neither substitutes for measuring a real extractor on real signing, and
``delta`` in particular is assumed rather than measured: nobody here knows how
far real ASL articulation sits from citation form, and that number decides the
weight. Treat the crossover points as the shape of the answer, not the answer.

Run: python experiments/noise_sweep.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from signflow_pipeline import landmarks as lm  # noqa: E402
from signflow_pipeline.handshapes import (  # noqa: E402
    FINGERS, load_handshapes, classify, same_handshape,
)
from signflow_pipeline.prior import apply_handshape_prior, perturb_hand  # noqa: E402
from signflow_pipeline.skeleton import (  # noqa: E402
    load_skeleton, solve_fk, tip_positions,
)
from signflow_pipeline.solve import solve_hand  # noqa: E402

SK = load_skeleton()
TIP_IDX = [SK.tip_index[f"right_{f}_tip"] for f in FINGERS]
ELBOW = SK.index["right_elbow"]

#: Degrees of per-joint perturbation per millimetre of fingertip displacement,
#: measured by experiments/calibrate_perturbation.
DEG_PER_MM = 1.05

WEIGHTS = (0.0, 0.25, 0.5, 0.75, 1.0)


def distinct_handshapes() -> list[str]:
    """One representative per handshape, so equivalents are not counted twice."""
    shapes = load_handshapes()
    seen: set[frozenset[str]] = set()
    out = []
    for name in sorted(shapes):
        from signflow_pipeline.handshapes import equivalence_classes

        group = equivalence_classes()[name]
        if group in seen:
            continue
        seen.add(group)
        out.append(name)
    return out


def tips_of(pose) -> np.ndarray:
    positions, rotations = solve_fk(pose, SK)
    return tip_positions(positions, rotations, SK)[TIP_IDX]


def trial(
    canonical_id: str,
    sigma_mm: float,
    delta_mm: float,
    rng: np.random.Generator,
    occlusion: float = 0.0,
) -> tuple[dict[float, float], bool]:
    """One extraction, scored at every prior weight.

    Returns per-weight fingertip error in metres, and whether the raw extraction
    classified as the expected handshape.
    """
    canonical = load_handshapes()[canonical_id].rotations

    # Ground truth: the citation handshape as this signer actually made it.
    truth = perturb_hand(canonical, "right", delta_mm * DEG_PER_MM, rng, SK) if delta_mm else canonical
    truth_positions, truth_rotations = solve_fk(truth, SK)
    truth_tips_all = tip_positions(truth_positions, truth_rotations, SK)
    truth_tips = truth_tips_all[TIP_IDX]

    # What the extractor sees.
    observed = lm.hand_landmarks_from_pose(truth_positions, truth_tips_all, "right", SK)
    if sigma_mm:
        observed = observed + rng.normal(0.0, sigma_mm / 1000.0, observed.shape)
    if occlusion and rng.random() < occlusion:
        # One finger lands badly, as happens when it is hidden behind the hand.
        finger = FINGERS[rng.integers(0, len(FINGERS))]
        base = lm.HAND_INDEX[f"{finger}_cmc" if finger == "thumb" else f"{finger}_mcp"]
        observed[base:base + 4] += rng.normal(0.0, 0.030, (4, 3))

    solved = solve_hand(observed, "right", truth_rotations[ELBOW], SK)

    errors: dict[float, float] = {}
    for weight in WEIGHTS:
        adjusted, report = apply_handshape_prior(solved, canonical_id, "right", weight, SK)
        errors[weight] = float(np.linalg.norm(tips_of(adjusted) - truth_tips, axis=1).mean())

    _, raw_report = apply_handshape_prior(solved, canonical_id, "right", 0.0, SK)
    return errors, raw_report.agrees


def sweep(occlusion: float = 0.0, repeats: int = 14, seed: int = 20260922) -> None:
    rng = np.random.default_rng(seed)
    shapes = distinct_handshapes()

    header = f"{'sigma':>6} {'delta':>6} " + " ".join(f"w={w:<5.2f}" for w in WEIGHTS) + f"  {'best':>5} {'agree':>6}"
    print(header)
    print("-" * len(header))

    for delta in (0.0, 5.0, 10.0):
        for sigma in (0.0, 5.0, 10.0, 15.0, 20.0, 30.0):
            totals = {w: [] for w in WEIGHTS}
            agreements = []
            for name in shapes:
                for _ in range(repeats):
                    errors, agrees = trial(name, sigma, delta, rng, occlusion)
                    for w, e in errors.items():
                        totals[w].append(e)
                    agreements.append(agrees)
            means = {w: float(np.mean(v)) * 1000 for w, v in totals.items()}
            best = min(means, key=lambda w: means[w])
            cells = " ".join(f"{means[w]:6.1f}" for w in WEIGHTS)
            print(f"{sigma:6.0f} {delta:6.0f} {cells}  {best:5.2f} {np.mean(agreements) * 100:5.0f}%")
        print()


if __name__ == "__main__":
    print(__doc__.split("Run:")[0].strip().splitlines()[0])
    print("\nFingertip error in mm, averaged over every distinct handshape.")
    print("sigma = landmark noise (mm). delta = articulation departure from citation form (mm).")
    print("w = how far the hand is pulled toward the citation handshape.")
    print("agree = how often the raw extraction already classified as the expected handshape.\n")

    print("=== independent Gaussian landmark noise ===\n")
    sweep()

    print("=== with 25% chance of one finger badly misplaced (occlusion) ===\n")
    sweep(occlusion=0.25)
