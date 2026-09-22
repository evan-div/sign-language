"""Recognising and comparing handshapes.

Classification is what makes the extraction pipeline auditable. An extracted
sign either shows the handshape the lexicon says it should, or it does not, and
a pipeline that cannot tell the difference cannot be trusted to scale past the
handful of signs someone is willing to watch by eye.

Features are the five fingertips expressed in the hand's own frame. Working in
the hand's frame rather than the world's makes the comparison independent of
where the arm happens to be, so the same handshape at the chin and at the chest
compares equal -- which is exactly the property a handshape has.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache

import numpy as np

from .skeleton import (
    DATA, Pose, Skeleton, load_skeleton, quat_conjugate, quat_rotate,
    solve_fk, tip_positions,
)

FINGERS = ("thumb", "index", "middle", "ring", "pinky")


@dataclass(frozen=True)
class Handshape:
    id: str
    kind: str
    description: str
    rotations: dict[str, np.ndarray]


@lru_cache(maxsize=1)
def load_handshapes() -> dict[str, Handshape]:
    spec = json.loads((DATA / "handshapes" / "compiled.json").read_text())
    return {
        key: Handshape(
            id=key,
            kind=entry["kind"],
            description=entry["description"],
            rotations={j: np.asarray(q) for j, q in entry["rotations"].items()},
        )
        for key, entry in spec["handshapes"].items()
    }


def hand_frame_features(pose: Pose, side: str = "right", skeleton: Skeleton | None = None) -> np.ndarray:
    """Fingertips relative to the wrist, in the wrist's own frame.

    Fifteen numbers. Independent of where the arm is, which is what lets the
    same handshape compare equal wherever it is made.
    """
    sk = skeleton or load_skeleton()
    positions, rotations = solve_fk(pose, sk)
    tips = tip_positions(positions, rotations, sk)
    wrist_index = sk.index[f"{side}_wrist"]
    origin = positions[wrist_index]
    inverse = quat_conjugate(rotations[wrist_index])
    return np.concatenate([
        quat_rotate(inverse, tips[sk.tip_index[f"{side}_{finger}_tip"]] - origin)
        for finger in FINGERS
    ])


@lru_cache(maxsize=1)
def _reference_features() -> tuple[list[str], np.ndarray]:
    shapes = load_handshapes()
    ids = sorted(shapes)
    matrix = np.stack([hand_frame_features(shapes[i].rotations) for i in ids])
    return ids, matrix


def classify(pose: Pose, side: str = "right", candidates: list[str] | None = None) -> list[tuple[str, float]]:
    """Rank known handshapes against a pose, nearest first.

    Distances are in metres, summed in quadrature over the five fingertips, so a
    figure of 0.02 means the tips sit about 2cm from where that handshape puts
    them once orientation is taken out.
    """
    ids, matrix = _reference_features()
    if candidates is not None:
        keep = [i for i, name in enumerate(ids) if name in set(candidates)]
        ids = [ids[i] for i in keep]
        matrix = matrix[keep]
    features = hand_frame_features(pose, side)
    distances = np.linalg.norm(matrix - features, axis=1)
    order = np.argsort(distances)
    return [(ids[i], float(distances[i])) for i in order]


def best_match(pose: Pose, side: str = "right") -> tuple[str, float]:
    return classify(pose, side)[0]


#: Two handshapes count as the same if their fingertips sit this close once
#: orientation is removed. Well below the separation between genuinely
#: different shapes, and well above floating-point noise.
EQUIVALENCE_MM = 2.0


@lru_cache(maxsize=1)
def equivalence_classes() -> dict[str, frozenset[str]]:
    """Handshapes that are the same shape held differently.

    Several letters share a handshape and differ only in orientation or
    movement: H and U are the same fingers at different wrist angles, J is I
    with a path, Z is a pointing hand with a path. A classifier working in the
    hand's own frame cannot tell them apart, and should not pretend to -- so the
    quality gate accepts any member of the expected shape's class and leaves
    orientation to be checked separately.
    """
    ids, matrix = _reference_features()
    groups: dict[str, set[str]] = {name: {name} for name in ids}
    for i, a in enumerate(ids):
        for j, b in enumerate(ids):
            if i >= j:
                continue
            if float(np.linalg.norm(matrix[i] - matrix[j])) * 1000 < EQUIVALENCE_MM:
                groups[a].add(b)
                groups[b].add(a)
    return {name: frozenset(members) for name, members in groups.items()}


def same_handshape(a: str, b: str) -> bool:
    return b in equivalence_classes().get(a, frozenset({a}))
