"""The landmark-to-rotation solver, measured against ground truth.

Every case works the same way: start from a pose we know, project it out to
landmarks, solve back, and compare. That is the only way to measure a solver
without video, and it is a real measurement -- it catches exactly the class of
bug that makes extracted motion subtly wrong rather than obviously broken.
"""

from __future__ import annotations

import numpy as np
import pytest

from signflow_pipeline import landmarks as lm
from signflow_pipeline.handshapes import FINGERS, load_handshapes
from signflow_pipeline.skeleton import (
    load_skeleton, quat_from_euler_deg, solve_fk, tip_positions,
)
from signflow_pipeline.solve import solve_arm, solve_frame, solve_hand

SK = load_skeleton()
TIPS = {side: [SK.tip_index[f"{side}_{f}_tip"] for f in FINGERS] for side in ("right", "left")}


def roundtrip_hand(pose: dict, side: str = "right", noise_mm: float = 0.0, seed: int = 0):
    """Project a pose to landmarks, solve it back, return worst tip error in mm."""
    positions, rotations = solve_fk(pose, SK)
    tips = tip_positions(positions, rotations, SK)
    hand = lm.hand_landmarks_from_pose(positions, tips, side, SK)
    if noise_mm:
        hand = hand + np.random.default_rng(seed).normal(0, noise_mm / 1000.0, hand.shape)

    solved = dict(pose)
    solved.update(solve_hand(hand, side, rotations[SK.index[f"{side}_elbow"]], SK))
    p2, r2 = solve_fk(solved, SK)
    t2 = tip_positions(p2, r2, SK)
    return float(np.linalg.norm(t2[TIPS[side]] - tips[TIPS[side]], axis=1).max()) * 1000


def test_bind_pose_round_trips_exactly() -> None:
    assert roundtrip_hand({}) < 1e-6


@pytest.mark.parametrize("name", sorted(load_handshapes()))
def test_every_handshape_round_trips_exactly(name: str) -> None:
    # Noiseless, so any error here is the solver's own, not the extractor's.
    assert roundtrip_hand(load_handshapes()[name].rotations) < 1e-6, name


def test_round_trips_through_a_rotated_wrist() -> None:
    # The wrist is solved from the palm plane rather than by direction matching,
    # so it is the piece most likely to be subtly transposed.
    for euler in [(30, -40, 15), (0, 90, 0), (-60, 20, 80), (120, 0, -45)]:
        pose = {"right_wrist": quat_from_euler_deg(*euler)}
        assert roundtrip_hand(pose) < 1e-6, euler


def test_round_trips_through_the_whole_arm() -> None:
    pose = {
        "right_shoulder": quat_from_euler_deg(12, 40, 18),
        "right_elbow": quat_from_euler_deg(28, -2, 4),
        "right_wrist": quat_from_euler_deg(-20, 35, 10),
        "right_index1": quat_from_euler_deg(50, 0, -8),
        "right_thumb1": quat_from_euler_deg(-3, -50, 31),
    }
    assert roundtrip_hand(pose) < 1e-6


def test_works_on_the_left_hand_too() -> None:
    # Handedness enters through the palm normal; getting it wrong flips the hand.
    assert roundtrip_hand(load_handshapes()["F"].rotations, side="left") < 1e-6


def test_is_scale_free() -> None:
    """A signer with longer fingers must not shift the solved rotations.

    Direction matching only uses directions, so scaling the landmarks about the
    wrist should change nothing. This is what lets extraction skip a per-signer
    calibration step.
    """
    pose = load_handshapes()["V"].rotations
    positions, rotations = solve_fk(pose, SK)
    tips = tip_positions(positions, rotations, SK)
    hand = lm.hand_landmarks_from_pose(positions, tips, "right", SK)

    grown = hand[0] + (hand - hand[0]) * 1.35
    a = solve_hand(hand, "right", rotations[SK.index["right_elbow"]], SK)
    b = solve_hand(grown, "right", rotations[SK.index["right_elbow"]], SK)

    for joint, qa in a.items():
        assert np.allclose(qa, b[joint], atol=1e-9), joint


def test_noise_degrades_gracefully() -> None:
    # Monotonic and never catastrophic: one bad landmark must degrade the hand
    # in proportion, not wreck it, which is what a global fit would do.
    errors = [roundtrip_hand(load_handshapes()["B"].rotations, noise_mm=s, seed=1) for s in (0, 5, 10, 20)]
    assert errors[0] < 1e-6
    assert errors == sorted(errors), errors
    assert errors[-1] < 120, errors


def test_the_solver_amplifies_landmark_noise() -> None:
    """Fingertips end up less accurate than the landmarks they came from.

    Direction matching turns a segment into a rotation, and a distal phalanx is
    only about 20mm long, so a few millimetres of landmark error is many degrees
    of joint error -- which then propagates to everything below it. Measured at
    roughly 2.5 to 3 times, and pinned here because it sets how good an
    extractor has to be before any of this is usable.
    """
    rng = np.random.default_rng(5)
    shapes = load_handshapes()
    ratios = []
    for sigma in (5.0, 10.0, 20.0):
        errors = []
        for name in ("A", "B", "F", "O", "V"):
            pose = shapes[name].rotations
            positions, rotations = solve_fk(pose, SK)
            tips = tip_positions(positions, rotations, SK)
            truth = tips[TIPS["right"]]
            hand = lm.hand_landmarks_from_pose(positions, tips, "right", SK)
            for _ in range(8):
                noisy = hand + rng.normal(0, sigma / 1000.0, hand.shape)
                solved = solve_hand(noisy, "right", rotations[SK.index["right_elbow"]], SK)
                p2, r2 = solve_fk(solved, SK)
                errors.append(np.linalg.norm(tip_positions(p2, r2, SK)[TIPS["right"]] - truth, axis=1).mean())
        ratios.append(float(np.mean(errors)) * 1000 / sigma)

    assert all(2.0 < r < 3.6 for r in ratios), ratios


def test_palm_plane_is_fitted_to_every_knuckle() -> None:
    """Orientation must not hang off three landmarks.

    The wrist's orientation carries every finger with it, so noise there costs
    more than noise anywhere else -- measured at around 80% of total fingertip
    error. Fitting the palm to all five points rather than one triangle is a
    small, cheap reduction in the largest error term.
    """
    rng = np.random.default_rng(9)
    pose = load_handshapes()["B"].rotations
    positions, rotations = solve_fk(pose, SK)
    tips = tip_positions(positions, rotations, SK)
    hand = lm.hand_landmarks_from_pose(positions, tips, "right", SK)

    naive, robust = [], []
    for use_robust, store in ((False, naive), (True, robust)):
        clean = lm.palm_normal(hand, "right", robust=use_robust)
        for _ in range(60):
            noisy = hand + rng.normal(0, 0.008, hand.shape)
            got = lm.palm_normal(noisy, "right", robust=use_robust)
            store.append(np.degrees(np.arccos(np.clip(float(np.dot(got, clean)), -1, 1))))

    assert float(np.mean(robust)) < float(np.mean(naive)), (np.mean(naive), np.mean(robust))


def test_arm_solver_recovers_shoulder_and_elbow() -> None:
    pose = {
        "right_shoulder": quat_from_euler_deg(12, 40, 18),
        "right_elbow": quat_from_euler_deg(28, -2, 4),
    }
    positions, _ = solve_fk(pose, SK)
    body = {name: positions[SK.index[name]] for name in
            ("right_shoulder", "right_elbow", "right_wrist", "left_shoulder", "left_elbow", "left_wrist")}

    solved = solve_arm(body, "right", SK)
    p2, _ = solve_fk(solved, SK)
    moved = float(np.linalg.norm(p2[SK.index["right_wrist"]] - positions[SK.index["right_wrist"]]))
    assert moved < 1e-9


def test_solve_frame_handles_a_missing_hand() -> None:
    positions, rotations = solve_fk({}, SK)
    tips = tip_positions(positions, rotations, SK)
    body = {name: positions[SK.index[name]] for name in lm.POSE_LANDMARKS if name in SK.index}
    hands = {"right": lm.hand_landmarks_from_pose(positions, tips, "right", SK), "left": None}

    pose = solve_frame(body, hands, SK)
    assert any(j.startswith("right_index") for j in pose)
    assert not any(j.startswith("left_index") for j in pose)
