"""The phonological handshape prior.

The architecture's central bet about extraction: we do not need the vision model
to get fingers right, because the lexicon already says what the handshape should
be. ASL-LEX annotates thousands of signs with handshape, location, movement and
orientation; if a sign is known to use an F hand, an extracted F hand that came
back mangled can be pulled back toward a correct one.

That is a bias-variance trade, and it is worth stating as one rather than as a
free win. Blending toward the canonical handshape removes extraction noise, and
introduces whatever the difference is between a real signer's articulation and
the dictionary form. Which effect dominates depends on how noisy the extractor
is and how much real signing departs from citation form. The first is published;
the second needs the corpus to measure, and until it is measured the weight this
module takes should be treated as a tuning knob rather than a settled value.

The prior does a second job that is not a trade at all: it is the quality gate.
An extracted hand that does not classify as the handshape the lexicon expects is
a sign to look at, and that flag is what makes a pipeline auditable past the
number of signs a person is willing to watch.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .handshapes import FINGERS, classify, load_handshapes, same_handshape
from .skeleton import IDENTITY, Pose, Skeleton, load_skeleton, quat_slerp


def hand_joint_names(side: str, skeleton: Skeleton | None = None) -> list[str]:
    sk = skeleton or load_skeleton()
    return sk.hand_joints(side)


@dataclass(frozen=True)
class PriorReport:
    """What the prior saw, for the quality gate to act on."""

    expected: str
    #: Nearest known handshape to the raw extraction, before any blending.
    observed: str
    #: Fingertip distance from the raw extraction to the expected handshape.
    distance_m: float
    #: Distance to whatever the extraction actually looked most like.
    best_distance_m: float
    #: True when the extraction already agreed with the lexicon.
    agrees: bool
    weight: float

    @property
    def needs_review(self) -> bool:
        return not self.agrees


def apply_handshape_prior(
    pose: Pose,
    expected: str,
    side: str = "right",
    weight: float = 0.5,
    skeleton: Skeleton | None = None,
) -> tuple[Pose, PriorReport]:
    """Pull an extracted hand toward the handshape the lexicon expects.

    Returns the adjusted pose and a report. A weight of 0 leaves the extraction
    alone; 1 replaces the fingers with the citation form outright, which throws
    away everything specific to how this signer made this sign.
    """
    sk = skeleton or load_skeleton()
    shapes = load_handshapes()
    if expected not in shapes:
        raise KeyError(f"Unknown handshape {expected!r}")

    ranked = classify(pose, side)
    observed, best_distance = ranked[0]
    distance = next(d for name, d in ranked if name == expected)

    canonical = shapes[expected].rotations
    mirror = side == "left"
    adjusted = dict(pose)

    for joint in hand_joint_names(side, sk):
        target = canonical.get(joint.replace(f"{side}_", "right_"))
        if target is None:
            continue
        if mirror:
            # Mirroring across the sagittal plane negates y and z.
            target = np.array([target[0], -target[1], -target[2], target[3]])
        current = np.asarray(pose.get(joint, IDENTITY))
        adjusted[joint] = quat_slerp(current, target, weight)

    report = PriorReport(
        expected=expected,
        observed=observed,
        distance_m=float(distance),
        best_distance_m=float(best_distance),
        agrees=same_handshape(expected, observed),
        weight=weight,
    )
    return adjusted, report


def perturb_hand(
    pose: Pose,
    side: str,
    degrees: float,
    rng: np.random.Generator,
    skeleton: Skeleton | None = None,
) -> Pose:
    """Nudge every finger joint by a small random rotation.

    Stands in for the difference between how a person actually articulates a
    sign and the dictionary form of its handshape. Without it, testing the prior
    is circular: motion authored from canonical handshapes is pulled back toward
    the very shapes it was built from, and the prior appears perfect.
    """
    sk = skeleton or load_skeleton()
    out = dict(pose)
    for joint in sk.hand_joints(side):
        axis = rng.normal(size=3)
        axis /= np.linalg.norm(axis) or 1.0
        angle = np.radians(rng.normal(0.0, degrees))
        half = angle / 2.0
        delta = np.array([*(axis * np.sin(half)), np.cos(half)])
        current = np.asarray(out.get(joint, IDENTITY))
        from .skeleton import quat_multiply

        out[joint] = quat_multiply(current, delta)
    return out
