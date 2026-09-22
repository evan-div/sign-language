"""Landmarks to canonical rotations.

Every extractor worth using -- MediaPipe, HaMeR, SMPLer-X, a mocap rig --
produces positions. The motion format stores rotations, because rotations
retarget to another avatar and blend correctly where positions do not. This
module is the conversion, and it is needed whichever extractor ends up winning.

The method is direction matching rather than general inverse kinematics: each
bone is rotated to point along the observed segment. Two properties make that
the right choice here.

* **It is scale-free.** Only directions are used, so a signer whose forearm is
  longer than the avatar's needs no rescaling and contributes no error from it.
* **It is local.** A badly-estimated fingertip corrupts one joint, not the whole
  hand, which matters because fingertips are exactly what extractors get wrong.

What it cannot recover is twist about a bone's own axis, which no chain of
positions determines. For the hand that is solved separately and exactly: the
wrist's full orientation comes from the plane of the palm. The forearm's twist
is absorbed into the wrist joint, which is a real approximation and is called
out in the pipeline README.
"""

from __future__ import annotations

from functools import lru_cache

import numpy as np

from . import landmarks as lm
from .skeleton import (
    IDENTITY, Pose, Skeleton, load_skeleton, quat_between, quat_conjugate,
    quat_from_hand_directions, quat_multiply, quat_rotate, solve_fk,
)


def _rest_direction(skeleton: Skeleton, parent: str, child: str) -> np.ndarray:
    """Unit direction from a joint toward one of its children, in the parent's frame."""
    offset = skeleton.joints[skeleton.index[child]].offset
    length = np.linalg.norm(offset)
    return offset / length if length > 1e-12 else np.array([0.0, 1.0, 0.0])


@lru_cache(maxsize=2)
def _bind_hand_basis(side: str) -> tuple[float, ...]:
    """The hand basis the measurement assigns to the bind pose.

    The palm plane is read off the knuckles, and the middle knuckle does not sit
    exactly above the wrist -- it is a centimetre to one side, about six degrees.
    So the basis measured from a bind-pose hand is not identity, and using it
    directly as the wrist's world rotation tilts every finger with it. Measuring
    the bind pose the same way and cancelling it keeps the solver consistent
    with the skeleton's own definition of a neutral hand.
    """
    sk = load_skeleton()
    positions, rotations = solve_fk({}, sk)
    from .skeleton import tip_positions  # local import: avoids a cycle at module load

    tips = tip_positions(positions, rotations, sk)
    hand = lm.hand_landmarks_from_pose(positions, tips, side, sk)
    basis = quat_from_hand_directions(lm.finger_direction(hand), lm.palm_normal(hand, side))
    return tuple(float(v) for v in basis)


def solve_hand(
    hand: np.ndarray,
    side: str,
    parent_world_rotation: np.ndarray,
    skeleton: Skeleton | None = None,
) -> Pose:
    """Solve one hand's wrist and fifteen finger joints from 21 landmarks.

    ``parent_world_rotation`` is the accumulated rotation at the elbow, needed
    to express the wrist's solved world orientation as a local rotation.
    """
    sk = skeleton or load_skeleton()
    pose: Pose = {}

    # The wrist is solved as a full orientation, not a direction: the palm's
    # plane determines it, and getting it wrong rotates every finger with it.
    measured = quat_from_hand_directions(lm.finger_direction(hand), lm.palm_normal(hand, side))
    wrist_world = quat_multiply(measured, quat_conjugate(np.asarray(_bind_hand_basis(side))))
    pose[f"{side}_wrist"] = quat_multiply(quat_conjugate(parent_world_rotation), wrist_world)

    for finger in lm.FINGERS:
        chain = lm.FINGER_CHAIN[finger]
        joints = lm.FINGER_JOINTS[finger]
        parent_rotation = wrist_world
        parent_name = f"{side}_wrist"

        for depth, joint in enumerate(joints):
            name = f"{side}_{joint}"
            observed = hand[lm.HAND_INDEX[chain[depth + 2]]] - hand[lm.HAND_INDEX[chain[depth + 1]]]
            length = np.linalg.norm(observed)
            if length < 1e-9:
                pose[name] = IDENTITY.copy()
                continue
            observed = observed / length

            # The bone this joint drives points at the next joint down the
            # chain; for the last one, at the fingertip site.
            if depth < len(joints) - 1:
                rest = _rest_direction(sk, name, f"{side}_{joints[depth + 1]}")
            else:
                tip = sk.tips[sk.tip_index[f"{side}_{finger}_tip"]].offset
                rest = tip / (np.linalg.norm(tip) or 1.0)

            # Rotate into the joint's own frame before matching, so the result
            # is a local rotation rather than a world one.
            local_target = quat_rotate(quat_conjugate(parent_rotation), observed)
            pose[name] = quat_between(rest, local_target)
            parent_rotation = quat_multiply(parent_rotation, pose[name])
            parent_name = name

        del parent_name

    return pose


def solve_arm(pose_landmarks: dict[str, np.ndarray], side: str, skeleton: Skeleton | None = None) -> Pose:
    """Solve shoulder and elbow from body landmarks.

    The collar and spine are left at rest: body landmarks do not constrain them,
    and guessing a torso from a shoulder line produces drift that reads as the
    avatar swaying for no reason.
    """
    sk = skeleton or load_skeleton()
    pose: Pose = {}

    shoulder = pose_landmarks.get(f"{side}_shoulder")
    elbow = pose_landmarks.get(f"{side}_elbow")
    wrist = pose_landmarks.get(f"{side}_wrist")
    if shoulder is None or elbow is None or wrist is None:
        return pose

    # The collar is unsolved, so the shoulder's parent rotation is whatever the
    # rest pose gives; recompute it rather than assuming identity.
    positions, rotations = solve_fk({}, sk)
    collar_rotation = rotations[sk.index[f"{side}_collar"]]

    upper = elbow - shoulder
    if np.linalg.norm(upper) > 1e-9:
        rest = _rest_direction(sk, f"{side}_shoulder", f"{side}_elbow")
        target = quat_rotate(quat_conjugate(collar_rotation), upper / np.linalg.norm(upper))
        pose[f"{side}_shoulder"] = quat_between(rest, target)

    shoulder_world = quat_multiply(collar_rotation, pose.get(f"{side}_shoulder", IDENTITY))
    fore = wrist - elbow
    if np.linalg.norm(fore) > 1e-9:
        rest = _rest_direction(sk, f"{side}_elbow", f"{side}_wrist")
        target = quat_rotate(quat_conjugate(shoulder_world), fore / np.linalg.norm(fore))
        pose[f"{side}_elbow"] = quat_between(rest, target)

    del positions
    return pose


def elbow_world_rotation(pose: Pose, side: str, skeleton: Skeleton | None = None) -> np.ndarray:
    """Accumulated rotation at the elbow for a partially solved pose."""
    sk = skeleton or load_skeleton()
    _, rotations = solve_fk(pose, sk)
    return rotations[sk.index[f"{side}_elbow"]]


def solve_frame(
    pose_landmarks: dict[str, np.ndarray],
    hands: dict[str, np.ndarray],
    skeleton: Skeleton | None = None,
) -> Pose:
    """Solve a whole frame: both arms, then both hands on top of them."""
    sk = skeleton or load_skeleton()
    pose: Pose = {}
    for side in ("right", "left"):
        pose.update(solve_arm(pose_landmarks, side, sk))
    for side, hand in hands.items():
        if hand is None:
            continue
        parent = elbow_world_rotation(pose, side, sk)
        pose.update(solve_hand(hand, side, parent, sk))
    return pose
