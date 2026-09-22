"""Landmark topology, and how it maps onto the canonical skeleton.

MediaPipe's 21-point hand happens to correspond one-to-one with the canonical
skeleton's hand: a wrist, three joints per finger and a tip. That is not a
coincidence worth relying on for the body, where the correspondence is looser,
but for hands it means no interpolation and no invented joints.

Landmarks are metric 3D positions. Nothing here assumes they came from
MediaPipe -- HaMeR, SMPLer-X and a mocap rig all produce the same shape of
data, which is the point of converting through a topology rather than wiring an
extractor straight to the skeleton.
"""

from __future__ import annotations

import numpy as np

# MediaPipe hand landmark order.
HAND_LANDMARKS = [
    "wrist",
    "thumb_cmc", "thumb_mcp", "thumb_ip", "thumb_tip",
    "index_mcp", "index_pip", "index_dip", "index_tip",
    "middle_mcp", "middle_pip", "middle_dip", "middle_tip",
    "ring_mcp", "ring_pip", "ring_dip", "ring_tip",
    "pinky_mcp", "pinky_pip", "pinky_dip", "pinky_tip",
]
HAND_INDEX = {name: i for i, name in enumerate(HAND_LANDMARKS)}

FINGERS = ("thumb", "index", "middle", "ring", "pinky")

#: Canonical joint suffixes for each finger, in landmark order.
FINGER_JOINTS = {
    "thumb": ("thumb1", "thumb2", "thumb3"),
    "index": ("index1", "index2", "index3"),
    "middle": ("middle1", "middle2", "middle3"),
    "ring": ("ring1", "ring2", "ring3"),
    "pinky": ("pinky1", "pinky2", "pinky3"),
}

#: Landmark names for each finger's chain, wrist-first.
FINGER_CHAIN = {
    "thumb": ("wrist", "thumb_cmc", "thumb_mcp", "thumb_ip", "thumb_tip"),
    "index": ("wrist", "index_mcp", "index_pip", "index_dip", "index_tip"),
    "middle": ("wrist", "middle_mcp", "middle_pip", "middle_dip", "middle_tip"),
    "ring": ("wrist", "ring_mcp", "ring_pip", "ring_dip", "ring_tip"),
    "pinky": ("wrist", "pinky_mcp", "pinky_pip", "pinky_dip", "pinky_tip"),
}

# MediaPipe pose landmark indices we use. The rest of the 33 describe the legs
# and face, which signing does not need and MediaPipe does not place well.
POSE_LANDMARKS = {
    "left_shoulder": 11, "right_shoulder": 12,
    "left_elbow": 13, "right_elbow": 14,
    "left_wrist": 15, "right_wrist": 16,
    "left_hip": 23, "right_hip": 24,
    "nose": 0,
}


def hand_landmarks_from_pose(
    positions: np.ndarray, tips: np.ndarray, side: str, skeleton
) -> np.ndarray:
    """Project a posed skeleton back out to hand landmarks.

    The inverse of what the solver does, and the basis of testing it: a pose we
    already know produces landmarks we can perturb and solve back, so the solver
    can be measured against ground truth without needing video.
    """
    out = np.zeros((21, 3))
    out[0] = positions[skeleton.index[f"{side}_wrist"]]
    for finger in FINGERS:
        base = HAND_INDEX[f"{finger}_cmc" if finger == "thumb" else f"{finger}_mcp"]
        for offset, joint in enumerate(FINGER_JOINTS[finger]):
            out[base + offset] = positions[skeleton.index[f"{side}_{joint}"]]
        out[base + 3] = tips[skeleton.tip_index[f"{side}_{finger}_tip"]]
    return out


#: The wrist and the four knuckles. These five move together as the palm, so
#: they are what the hand's orientation should be read from.
PALM_POINTS = ("wrist", "index_mcp", "middle_mcp", "ring_mcp", "pinky_mcp")


def palm_normal(hand: np.ndarray, side: str, robust: bool = True) -> np.ndarray:
    """Palm direction.

    Reading it from a single triangle -- wrist, index knuckle, little knuckle --
    is the obvious thing and the wrong one: three noisy points define a very
    noisy plane, and because every finger hangs off this orientation, its error
    dominates the whole hand. Fitting the plane to all five palm points instead
    averages the noise down.

    Handedness matters either way: taking the same cross product on both hands
    points one palm backwards, flipping the entire hand.
    """
    to_index = hand[HAND_INDEX["index_mcp"]] - hand[0]
    to_pinky = hand[HAND_INDEX["pinky_mcp"]] - hand[0]
    reference = np.cross(to_index, to_pinky) if side == "right" else np.cross(to_pinky, to_index)

    if not robust:
        length = np.linalg.norm(reference)
        return reference / length if length > 1e-9 else np.array([0.0, 0.0, 1.0])

    points = np.stack([hand[HAND_INDEX[name]] for name in PALM_POINTS])
    centred = points - points.mean(axis=0)
    # The plane's normal is the least-significant direction of the point cloud.
    _, _, vt = np.linalg.svd(centred, full_matrices=False)
    normal = vt[-1]
    # SVD gives no sign, so take the one that agrees with the triangle.
    if float(np.dot(normal, reference)) < 0:
        normal = -normal
    length = np.linalg.norm(normal)
    return normal / length if length > 1e-9 else np.array([0.0, 0.0, 1.0])


def finger_direction(hand: np.ndarray, robust: bool = True) -> np.ndarray:
    """Where the hand points.

    Averaged across the knuckles rather than taken from the middle one alone,
    for the same reason: one landmark's error becomes the whole hand's.
    """
    if robust:
        knuckles = np.stack([
            hand[HAND_INDEX[name]] for name in ("index_mcp", "middle_mcp", "ring_mcp", "pinky_mcp")
        ])
        direction = knuckles.mean(axis=0) - hand[0]
    else:
        direction = hand[HAND_INDEX["middle_mcp"]] - hand[0]
    length = np.linalg.norm(direction)
    return direction / length if length > 1e-9 else np.array([0.0, 1.0, 0.0])
