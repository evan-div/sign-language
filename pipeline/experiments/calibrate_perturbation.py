"""How many degrees of per-joint noise make a millimetre of fingertip error.

Used to express the articulation parameter in the noise sweep in millimetres,
which is comparable with published extractor accuracy, rather than in degrees,
which is not.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from signflow_pipeline.handshapes import FINGERS, load_handshapes  # noqa: E402
from signflow_pipeline.prior import perturb_hand  # noqa: E402
from signflow_pipeline.skeleton import load_skeleton, solve_fk, tip_positions  # noqa: E402

SK = load_skeleton()
TIPS = [SK.tip_index[f"right_{f}_tip"] for f in FINGERS]

if __name__ == "__main__":
    rng = np.random.default_rng(3)
    shapes = load_handshapes()
    print("degrees -> mean fingertip displacement")
    ratios = []
    for degrees in (2, 4, 6, 8, 12, 16):
        errors = []
        for name in ("A", "B", "C", "F", "V", "O", "S", "Y"):
            base = shapes[name].rotations
            p0, r0 = solve_fk(base, SK)
            reference = tip_positions(p0, r0, SK)[TIPS]
            for _ in range(20):
                p1, r1 = solve_fk(perturb_hand(base, "right", degrees, rng, SK), SK)
                errors.append(np.linalg.norm(tip_positions(p1, r1, SK)[TIPS] - reference, axis=1).mean())
        mm = float(np.mean(errors)) * 1000
        ratios.append(degrees / mm)
        print(f"  {degrees:2d} deg -> {mm:5.2f}mm")
    print(f"\ndegrees per mm: {np.mean(ratios):.2f}")
