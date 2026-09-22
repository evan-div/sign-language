"""The handshape prior and the quality gate.

The prior's job is not to make classification look good -- pulling a hand toward
the shape you told it to expect will always do that. Its job is to bring the
extracted motion closer to what the signer actually did, and the tests below
measure that against ground truth, including the case where the signer's
articulation differs from the citation form and the prior is therefore wrong.
"""

from __future__ import annotations

import numpy as np
import pytest

from signflow_pipeline import landmarks as lm
from signflow_pipeline.handshapes import (
    FINGERS, classify, equivalence_classes, load_handshapes, same_handshape,
)
from signflow_pipeline.prior import apply_handshape_prior, perturb_hand
from signflow_pipeline.qc import check_sequence
from signflow_pipeline.skeleton import load_skeleton, solve_fk, tip_positions
from signflow_pipeline.solve import solve_hand

SK = load_skeleton()
TIPS = [SK.tip_index[f"right_{f}_tip"] for f in FINGERS]


def tips_of(pose) -> np.ndarray:
    positions, rotations = solve_fk(pose, SK)
    return tip_positions(positions, rotations, SK)[TIPS]


class TestClassifier:
    def test_every_handshape_recognises_itself(self) -> None:
        for name, shape in load_handshapes().items():
            assert same_handshape(name, classify(shape.rotations)[0][0]), name

    def test_shapes_that_differ_only_in_orientation_are_grouped(self) -> None:
        # H and U are the same fingers at different wrist angles; J is I with a
        # path; Z is a pointing hand with a path. A classifier working in the
        # hand's own frame cannot separate them and should not claim to.
        groups = {tuple(sorted(g)) for g in equivalence_classes().values() if len(g) > 1}
        assert ("G", "Q") in groups
        assert ("H", "U") in groups
        assert ("I", "J") in groups
        assert ("K", "P") in groups

    def test_distinct_handshapes_are_well_separated(self) -> None:
        from signflow_pipeline.handshapes import _reference_features

        ids, matrix = _reference_features()
        distances = [
            float(np.linalg.norm(matrix[i] - matrix[j]))
            for i in range(len(ids)) for j in range(i + 1, len(ids))
            if not same_handshape(ids[i], ids[j])
        ]
        # Median separation is far larger than realistic reconstruction error;
        # the minimum is not, which is where confusions will come from.
        assert float(np.median(distances)) * 1000 > 100


class TestPrior:
    def test_a_weight_of_zero_changes_nothing(self) -> None:
        pose = load_handshapes()["F"].rotations
        adjusted, _ = apply_handshape_prior(pose, "F", "right", 0.0, SK)
        for joint, q in pose.items():
            assert np.allclose(adjusted[joint], q, atol=1e-9), joint

    def test_a_weight_of_one_replaces_the_fingers(self) -> None:
        wrong = load_handshapes()["A"].rotations
        adjusted, _ = apply_handshape_prior(wrong, "V", "right", 1.0, SK)
        assert classify(adjusted)[0][0] == "V"

    def test_it_reports_disagreement_rather_than_hiding_it(self) -> None:
        # An A hand where the lexicon expects V is exactly what the gate is for.
        _, report = apply_handshape_prior(load_handshapes()["A"].rotations, "V", "right", 0.5, SK)
        assert report.observed == "A"
        assert report.expected == "V"
        assert not report.agrees
        assert report.needs_review

    def test_it_stays_quiet_when_the_extraction_already_agrees(self) -> None:
        _, report = apply_handshape_prior(load_handshapes()["V"].rotations, "V", "right", 0.5, SK)
        assert report.agrees and not report.needs_review

    def test_it_rejects_a_handshape_it_does_not_know(self) -> None:
        with pytest.raises(KeyError):
            apply_handshape_prior(load_handshapes()["A"].rotations, "NOT_A_SHAPE", "right", 0.5, SK)

    def test_it_reduces_error_on_a_noisy_extraction(self) -> None:
        """The claim worth testing: closer to the truth, not just tidier."""
        rng = np.random.default_rng(31)
        improved = 0
        trials = 0
        for name in ("A", "B", "F", "O", "V", "S", "Y"):
            truth = load_handshapes()[name].rotations
            positions, rotations = solve_fk(truth, SK)
            tips = tip_positions(positions, rotations, SK)
            reference = tips[TIPS]
            hand = lm.hand_landmarks_from_pose(positions, tips, "right", SK)
            for _ in range(6):
                noisy = hand + rng.normal(0, 0.012, hand.shape)
                solved = solve_hand(noisy, "right", rotations[SK.index["right_elbow"]], SK)
                raw = float(np.linalg.norm(tips_of(solved) - reference, axis=1).mean())
                adjusted, _ = apply_handshape_prior(solved, name, "right", 0.75, SK)
                blended = float(np.linalg.norm(tips_of(adjusted) - reference, axis=1).mean())
                trials += 1
                improved += blended < raw
        assert improved / trials > 0.75, f"{improved}/{trials}"

    def test_it_can_hurt_when_the_signer_departs_from_citation_form(self) -> None:
        """The other half of the trade, which must not be hidden.

        With clean landmarks and a signer whose handshape is their own, pulling
        toward the dictionary form moves away from the truth. A prior weight is
        a judgement about noise, not a free improvement.
        """
        rng = np.random.default_rng(13)
        worse = 0
        for name in ("A", "B", "F", "V"):
            canonical = load_handshapes()[name].rotations
            for _ in range(6):
                truth = perturb_hand(canonical, "right", 10.0, rng, SK)
                reference = tips_of(truth)
                raw = float(np.linalg.norm(tips_of(truth) - reference, axis=1).mean())
                adjusted, _ = apply_handshape_prior(truth, name, "right", 1.0, SK)
                blended = float(np.linalg.norm(tips_of(adjusted) - reference, axis=1).mean())
                worse += blended > raw
        assert worse >= 20, worse


class TestQualityGate:
    def _frames(self, pose, count: int = 10, step: float = 33.0):
        return [(i * step, pose) for i in range(count)]

    def test_a_clean_sequence_passes(self) -> None:
        # Perfectly still would trip the frozen check, so vary it slightly.
        rng = np.random.default_rng(2)
        canonical = load_handshapes()["V"].rotations
        frames = [(i * 33.0, perturb_hand(canonical, "right", 1.5, rng, SK)) for i in range(10)]
        report = check_sequence("TEST", frames, "V", "right", SK)
        assert report.verdict == "accept", report.describe()

    def test_it_flags_the_wrong_handshape(self) -> None:
        rng = np.random.default_rng(4)
        canonical = load_handshapes()["A"].rotations
        frames = [(i * 33.0, perturb_hand(canonical, "right", 1.5, rng, SK)) for i in range(10)]
        report = check_sequence("TEST", frames, "V", "right", SK)
        assert report.verdict == "review"
        assert any(f.code == "handshape" for f in report.findings)

    def test_it_flags_jitter(self) -> None:
        rng = np.random.default_rng(6)
        canonical = load_handshapes()["B"].rotations
        frames = [(i * 33.0, perturb_hand(canonical, "right", 40.0, rng, SK)) for i in range(10)]
        report = check_sequence("TEST", frames, None, "right", SK)
        assert any(f.code == "jitter" for f in report.findings), report.describe()

    def test_it_flags_a_frozen_tracker(self) -> None:
        frames = self._frames(load_handshapes()["B"].rotations, count=10)
        report = check_sequence("TEST", frames, None, "right", SK)
        assert any(f.code == "frozen" for f in report.findings), report.describe()

    def test_it_rejects_an_empty_sequence(self) -> None:
        report = check_sequence("TEST", [], None, "right", SK)
        assert report.verdict == "reject"
