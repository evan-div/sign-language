"""The quality gate.

A pipeline that can only be trusted as far as someone is willing to watch it is
not a pipeline. This is the part that decides, per sign, whether an extraction
is worth keeping, needs a person to look at it, or should be thrown away --
which is what makes scaling past a few dozen signs possible at all.

The checks are deliberately about things that can be wrong without looking
wrong in a single frame: a handshape that is not the one the lexicon expects, a
hand that jitters between frames, a hand that stops moving because tracking was
lost. None of them replaces a Deaf reviewer on the signs that pass.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .handshapes import FINGERS, classify, same_handshape
from .prior import apply_handshape_prior
from .skeleton import Pose, Skeleton, load_skeleton, solve_fk, tip_positions


@dataclass
class Finding:
    code: str
    detail: str
    severity: str  # "reject" | "review" | "note"


@dataclass
class QCReport:
    sign_id: str
    frames: int
    expected_handshape: str | None
    handshape_agreement: float
    worst_jitter_mm: float
    still_frames: int
    findings: list[Finding] = field(default_factory=list)

    @property
    def verdict(self) -> str:
        if any(f.severity == "reject" for f in self.findings):
            return "reject"
        if any(f.severity == "review" for f in self.findings):
            return "review"
        return "accept"

    def describe(self) -> str:
        lines = [
            f"{self.sign_id}: {self.verdict.upper()}  "
            f"({self.frames} frames, handshape agreement {self.handshape_agreement * 100:.0f}%, "
            f"worst jitter {self.worst_jitter_mm:.1f}mm)"
        ]
        for finding in self.findings:
            lines.append(f"    [{finding.severity}] {finding.code}: {finding.detail}")
        return "\n".join(lines)


#: Above this, frame-to-frame fingertip movement is noise rather than signing.
#: A fast sign moves a fingertip a few centimetres in 33ms; ten times that is
#: the tracker losing the hand and finding it again.
JITTER_LIMIT_MM = 45.0

#: Below this, nothing is moving and the tracker has probably frozen.
STILL_LIMIT_MM = 0.2


def check_sequence(
    sign_id: str,
    frames: list[tuple[float, Pose]],
    expected_handshape: str | None = None,
    side: str = "right",
    skeleton: Skeleton | None = None,
) -> QCReport:
    sk = skeleton or load_skeleton()
    tip_indices = [sk.tip_index[f"{side}_{finger}_tip"] for finger in FINGERS]

    tips_per_frame = []
    for _, pose in frames:
        positions, rotations = solve_fk(pose, sk)
        tips_per_frame.append(tip_positions(positions, rotations, sk)[tip_indices])

    steps = [
        float(np.linalg.norm(tips_per_frame[i] - tips_per_frame[i - 1], axis=1).max()) * 1000
        for i in range(1, len(tips_per_frame))
    ]
    worst_jitter = max(steps) if steps else 0.0
    still = sum(1 for s in steps if s < STILL_LIMIT_MM)

    agreement = 1.0
    if expected_handshape:
        agrees = []
        for _, pose in frames:
            _, report = apply_handshape_prior(pose, expected_handshape, side, 0.0, sk)
            agrees.append(report.agrees)
        agreement = float(np.mean(agrees)) if agrees else 0.0

    findings: list[Finding] = []
    if not frames:
        findings.append(Finding("empty", "no frames extracted", "reject"))
    if worst_jitter > JITTER_LIMIT_MM:
        findings.append(Finding(
            "jitter",
            f"fingertip moved {worst_jitter:.0f}mm between frames, above the {JITTER_LIMIT_MM:.0f}mm limit",
            "review",
        ))
    if steps and still > len(steps) * 0.4:
        findings.append(Finding(
            "frozen",
            f"{still} of {len(steps)} frames show no movement; tracking may have been lost",
            "review",
        ))
    if expected_handshape and agreement < 0.5:
        findings.append(Finding(
            "handshape",
            f"only {agreement * 100:.0f}% of frames look like {expected_handshape}; "
            f"the lexicon says this sign uses it",
            "review",
        ))
    elif expected_handshape and agreement < 0.8:
        findings.append(Finding(
            "handshape",
            f"{agreement * 100:.0f}% of frames look like {expected_handshape}",
            "note",
        ))

    return QCReport(
        sign_id=sign_id,
        frames=len(frames),
        expected_handshape=expected_handshape,
        handshape_agreement=agreement,
        worst_jitter_mm=worst_jitter,
        still_frames=still,
        findings=findings,
    )
