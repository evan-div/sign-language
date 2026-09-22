"""The whole pipeline, end to end, on synthesised landmarks.

Runs every stage in order -- landmarks, solve, prior, quality gate, export --
and writes clips the TypeScript engine can play. What it proves is that the
stages fit together and the format survives the trip; what it cannot prove is
that a real extractor sees a real signer well enough for any of it to matter.
That needs video, and video needs a corpus this environment cannot reach.

Run: python experiments/end_to_end.py [--noise MM] [--out DIR]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from signflow_pipeline import landmarks as lm  # noqa: E402
from signflow_pipeline.export import to_clip, write_clip  # noqa: E402
from signflow_pipeline.handshapes import FINGERS  # noqa: E402
from signflow_pipeline.prior import apply_handshape_prior  # noqa: E402
from signflow_pipeline.qc import check_sequence  # noqa: E402
from signflow_pipeline.skeleton import DATA, load_skeleton, solve_fk, tip_positions  # noqa: E402
from signflow_pipeline.smooth import smooth_poses  # noqa: E402
from signflow_pipeline.solve import solve_frame  # noqa: E402

SK = load_skeleton()
TIPS = [SK.tip_index[f"right_{f}_tip"] for f in FINGERS]


def run(noise_mm: float, weight: float, out_dir: Path, smooth_radius: int = 3, seed: int = 4242) -> int:
    fixture = json.loads((DATA / "signs" / "extraction-fixture.json").read_text())
    rng = np.random.default_rng(seed)
    failures = 0

    print(f"landmark noise {noise_mm:.0f}mm, prior weight {weight:.2f}, "
          f"smoothing radius {smooth_radius} frames\n")

    for sign in fixture["signs"]:
        truth_frames = [
            (f["timeMs"], {j: np.asarray(q) for j, q in f["pose"].items()})
            for f in sign["frames"]
        ]

        solved_frames: list[tuple[float, dict]] = []
        truth_tips: list[np.ndarray] = []

        for time_ms, truth in truth_frames:
            positions, rotations = solve_fk(truth, SK)
            tips = tip_positions(positions, rotations, SK)

            # Stage 1: what an extractor would report.
            body = {n: positions[SK.index[n]] for n in lm.POSE_LANDMARKS if n in SK.index}
            hands = {s: lm.hand_landmarks_from_pose(positions, tips, s, SK) for s in ("right", "left")}
            if noise_mm:
                scale = noise_mm / 1000.0
                body = {k: v + rng.normal(0, scale, 3) for k, v in body.items()}
                hands = {k: v + rng.normal(0, scale, v.shape) for k, v in hands.items()}

            # Stage 2: landmarks to rotations.
            pose = solve_frame(body, hands, SK)

            # Stage 3: pull the dominant hand toward the handshape the lexicon expects.
            if weight > 0:
                pose, _ = apply_handshape_prior(pose, sign["dominantHandshape"], "right", weight, SK)

            solved_frames.append((time_ms, pose))
            truth_tips.append(tips[TIPS])

        # Stage 4: smooth across frames. Solving each frame independently leaves
        # noise of the same size as the motion, and no later stage can undo it.
        solved_frames = smooth_poses(solved_frames, radius=smooth_radius)

        errors = []
        for (_, pose), reference in zip(solved_frames, truth_tips):
            p2, r2 = solve_fk(pose, SK)
            errors.append(float(np.linalg.norm(
                tip_positions(p2, r2, SK)[TIPS] - reference, axis=1).mean()) * 1000)

        # Stage 5: does this clip deserve to be kept?
        report = check_sequence(sign["id"], solved_frames, sign["dominantHandshape"], "right", SK)
        print(report.describe())
        print(f"    reconstruction error vs ground truth: mean {np.mean(errors):.1f}mm, "
              f"worst {np.max(errors):.1f}mm")
        if report.verdict == "reject":
            failures += 1
            continue

        # Stage 6: a clip the engine can play.
        clip = to_clip(
            f"{sign['id']}__extracted",
            solved_frames,
            stroke_start_ms=sign.get("strokeStartMs"),
            stroke_end_ms=sign.get("strokeEndMs"),
            source="video-extraction",
            method=f"synthetic-landmarks(sigma={noise_mm:.0f}mm)+direction-matching"
                   f"+handshape-prior(w={weight:.2f})+gaussian-smoothing(r={smooth_radius})",
            dataset="synthetic: projected from the authored sign, not from video",
            validation="unvalidated",
        )
        path = write_clip(clip, out_dir / f"{sign['id']}.sfmc.json")
        print(f"    wrote {path.relative_to(Path.cwd().parent)} "
              f"({len(clip['keyframes'])} keyframes, {clip['durationMs']:.0f}ms)\n")

    return failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--noise", type=float, default=10.0, help="landmark noise in mm")
    parser.add_argument("--weight", type=float, default=0.75, help="handshape prior weight")
    parser.add_argument("--smooth", type=int, default=3, help="smoothing radius in frames")
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[2] / "assets" / "motion" / "extracted")
    args = parser.parse_args()
    raise SystemExit(run(args.noise, args.weight, args.out, args.smooth))
