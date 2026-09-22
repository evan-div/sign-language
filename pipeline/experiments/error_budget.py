"""Where does the reconstruction error actually come from?

The noise sweep shows the handshape prior bottoming out well above zero even
when the truth is exactly the citation handshape, which should be impossible if
fingers were all that mattered. This splits the error into the two things that
can be wrong -- how the fingers are bent, and which way the whole hand is
pointing -- by fixing one and solving the other.

It matters for what to build next. A handshape prior can only fix fingers, so if
most of the error is orientation then the next lever is somewhere else.
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
HAND_JOINTS = SK.hand_joints("right")

if __name__ == "__main__":
    rng = np.random.default_rng(23)
    shapes = load_handshapes()
    names = ["A", "B", "C", "F", "O", "S", "V", "Y", "POINT", "OPEN_5"]

    print(f"{'sigma':>6} {'total':>8} {'wrist only':>11} {'fingers only':>13} {'wrist share':>12}")
    print("-" * 54)

    for sigma in (5.0, 10.0, 15.0, 20.0):
        totals, wrist_only, finger_only = [], [], []
        for name in names:
            truth = shapes[name].rotations
            positions, rotations = solve_fk(truth, SK)
            tips = tip_positions(positions, rotations, SK)
            reference = tips[TIPS]
            hand = lm.hand_landmarks_from_pose(positions, tips, "right", SK)

            for _ in range(25):
                noisy = hand + rng.normal(0, sigma / 1000.0, hand.shape)
                solved = solve_hand(noisy, "right", rotations[SK.index["right_elbow"]], SK)

                def error(pose) -> float:
                    p, r = solve_fk(pose, SK)
                    return float(np.linalg.norm(tip_positions(p, r, SK)[TIPS] - reference, axis=1).mean()) * 1000

                totals.append(error(solved))
                # Perfect fingers, solved wrist: what orientation error alone costs.
                wrist_only.append(error({**solved, **{j: truth[j] for j in HAND_JOINTS if j in truth}}))
                # Perfect wrist, solved fingers: what finger error alone costs.
                finger_only.append(error({**solved, "right_wrist": truth.get("right_wrist", np.array([0., 0., 0., 1.]))}))

        total = float(np.mean(totals))
        wrist = float(np.mean(wrist_only))
        print(f"{sigma:6.0f} {total:8.1f} {wrist:11.1f} {float(np.mean(finger_only)):13.1f} {wrist / total * 100:11.0f}%")

    print("\nAll in mm, mean fingertip error. 'wrist only' fixes the fingers to ground truth")
    print("and keeps the solved wrist; 'fingers only' does the reverse. A handshape prior")
    print("can only address the fingers column.")

    # Does fitting the palm plane to all five points beat the three-point one?
    print("\n\nwrist orientation: three-point triangle vs five-point plane fit\n")
    print(f"{'sigma':>6} {'triangle':>10} {'plane fit':>11} {'improvement':>12}")
    print("-" * 42)
    import signflow_pipeline.landmarks as _lm
    from signflow_pipeline.skeleton import quat_from_hand_directions, quat_conjugate, quat_multiply

    for sigma in (5.0, 10.0, 15.0, 20.0):
        naive, robust = [], []
        for name in names:
            truth = shapes[name].rotations
            positions, rotations = solve_fk(truth, SK)
            tips = tip_positions(positions, rotations, SK)
            hand = _lm.hand_landmarks_from_pose(positions, tips, "right", SK)
            # Each method is scored against its own reading of the clean hand:
            # the two define slightly different bases, so comparing one to the
            # other's reference measures the difference in definition, not error.
            exact = {
                use_robust: quat_from_hand_directions(
                    _lm.finger_direction(hand, robust=use_robust),
                    _lm.palm_normal(hand, "right", robust=use_robust))
                for use_robust in (False, True)
            }
            for _ in range(25):
                noisy = hand + rng.normal(0, sigma / 1000.0, hand.shape)
                for store, use_robust in ((naive, False), (robust, True)):
                    got = quat_from_hand_directions(
                        _lm.finger_direction(noisy, robust=use_robust),
                        _lm.palm_normal(noisy, "right", robust=use_robust))
                    delta = quat_multiply(got, quat_conjugate(exact[use_robust]))
                    store.append(np.degrees(2 * np.arccos(np.clip(abs(delta[3]), -1, 1))))
        a, b = float(np.mean(naive)), float(np.mean(robust))
        print(f"{sigma:6.0f} {a:9.1f}d {b:10.1f}d {(a - b) / a * 100:11.0f}%")
    print("\nMean wrist orientation error in degrees.")
