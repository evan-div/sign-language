"""How much does the solver amplify landmark noise?

Direction matching turns a segment between two landmarks into a rotation. When
the segment is short, a small positional error is a large angular one -- a
distal phalanx is about 20mm long, so 5mm of noise on its endpoints is roughly
14 degrees -- and that angle propagates to everything below it. This measures
the amplification, which sets how good an extractor has to be before the output
is usable at all.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from signflow_pipeline import landmarks as lm  # noqa: E402
from signflow_pipeline.handshapes import FINGERS, load_handshapes  # noqa: E402
from signflow_pipeline.skeleton import load_skeleton, solve_fk, tip_positions  # noqa: E402
from signflow_pipeline.solve import solve_hand  # noqa: E402

SK = load_skeleton()
TIPS = [SK.tip_index[f"right_{f}_tip"] for f in FINGERS]

if __name__ == "__main__":
    rng = np.random.default_rng(11)
    shapes = load_handshapes()
    names = ["A", "B", "C", "F", "O", "S", "V", "Y", "POINT", "OPEN_5"]

    print("landmark noise -> fingertip error after solving")
    print(f"{'sigma':>6} {'mean':>8} {'worst':>8} {'x mean':>8}")
    print("-" * 34)

    for sigma in (0.0, 2.0, 5.0, 10.0, 15.0, 20.0, 30.0):
        means, worsts = [], []
        for name in names:
            pose = shapes[name].rotations
            positions, rotations = solve_fk(pose, SK)
            tips = tip_positions(positions, rotations, SK)
            truth = tips[TIPS]
            hand = lm.hand_landmarks_from_pose(positions, tips, "right", SK)
            for _ in range(20):
                noisy = hand + rng.normal(0, sigma / 1000.0, hand.shape) if sigma else hand
                solved = solve_hand(noisy, "right", rotations[SK.index["right_elbow"]], SK)
                p2, r2 = solve_fk(solved, SK)
                error = np.linalg.norm(tip_positions(p2, r2, SK)[TIPS] - truth, axis=1) * 1000
                means.append(error.mean())
                worsts.append(error.max())
        mean = float(np.mean(means))
        ratio = mean / sigma if sigma else 0.0
        print(f"{sigma:6.0f} {mean:8.1f} {float(np.mean(worsts)):8.1f} {ratio:8.1f}")

    print("\nAll figures in mm. 'x mean' is mean fingertip error divided by input noise.")
    print("Amplification above 1 means the solver makes fingertips less accurate than")
    print("the landmarks it was given, which is what short bones do to direction matching.")
