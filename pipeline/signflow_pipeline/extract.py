"""Video to landmarks.

The one stage of the pipeline that cannot be exercised in this environment: it
needs a video of a signer, and the corpora worth using (ASL Citizen, WLASL) are
gated behind licences and are not downloadable here. Everything downstream --
the solver, the prior, the quality gate, the export -- is tested against
synthesised landmarks instead, so that when a corpus is available this is the
only piece that has never been run.

MediaPipe is the default because it installs on a CPU and needs no gated
weights, not because it is the best. A controlled comparison of pose estimators
for sign language translation found four systems beating it on downstream
translation quality, and hand keypoints are where it is weakest -- which is
exactly what signing depends on. The interface below takes landmark arrays, so
swapping in HaMeR or SMPLer-X output is a new function here and no change
anywhere else.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np

from . import landmarks as lm


@dataclass
class ExtractedFrame:
    """One frame of landmarks, in metres."""

    time_ms: float
    pose: dict[str, np.ndarray]
    hands: dict[str, np.ndarray | None]
    #: Per-source confidence, where the extractor reports one.
    confidence: float = 1.0


def extract_video(path: str | Path, fps: float | None = None) -> list[ExtractedFrame]:
    """Run MediaPipe Holistic over a video and return landmark frames.

    Imports MediaPipe lazily: the rest of the pipeline is useful without a
    vision stack installed, and the tests run without one.
    """
    try:
        import cv2  # noqa: F401
        import mediapipe as mp
    except ImportError as error:  # pragma: no cover - environment dependent
        raise RuntimeError(
            "extract_video needs mediapipe and opencv: pip install mediapipe opencv-python"
        ) from error

    import cv2

    holistic = mp.solutions.holistic.Holistic(
        static_image_mode=False,
        model_complexity=2,
        refine_face_landmarks=False,
    )
    capture = cv2.VideoCapture(str(path))
    source_fps = fps or capture.get(cv2.CAP_PROP_FPS) or 30.0
    frames: list[ExtractedFrame] = []
    index = 0

    try:
        while True:
            ok, image = capture.read()
            if not ok:
                break
            result = holistic.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

            pose: dict[str, np.ndarray] = {}
            if result.pose_world_landmarks:
                points = result.pose_world_landmarks.landmark
                for name, idx in lm.POSE_LANDMARKS.items():
                    point = points[idx]
                    pose[name] = np.array([point.x, point.y, point.z])

            hands: dict[str, np.ndarray | None] = {"right": None, "left": None}
            # MediaPipe labels hands from the subject's point of view, which is
            # the same convention the skeleton uses.
            for side, result_hand in (
                ("right", result.right_hand_landmarks),
                ("left", result.left_hand_landmarks),
            ):
                if result_hand is None:
                    continue
                hands[side] = np.array([[p.x, p.y, p.z] for p in result_hand.landmark])

            frames.append(ExtractedFrame(time_ms=index / source_fps * 1000.0, pose=pose, hands=hands))
            index += 1
    finally:
        capture.release()
        holistic.close()

    return frames


def synthesise_frames(
    poses: list[tuple[float, dict[str, np.ndarray]]],
    noise_mm: float = 0.0,
    seed: int = 0,
) -> list[ExtractedFrame]:
    """Landmarks from known poses, for testing the stages below extraction.

    Not a substitute for a real extractor: the noise is independent per landmark
    and real failures are correlated. It does let the solver, prior, gate and
    export be tested against ground truth, which video cannot provide.
    """
    from .skeleton import load_skeleton, solve_fk, tip_positions

    sk = load_skeleton()
    rng = np.random.default_rng(seed)
    frames: list[ExtractedFrame] = []

    for time_ms, pose in poses:
        positions, rotations = solve_fk(pose, sk)
        tips = tip_positions(positions, rotations, sk)

        body = {
            name: positions[sk.index[name]].copy()
            for name in lm.POSE_LANDMARKS
            if name in sk.index
        }
        hands = {
            side: lm.hand_landmarks_from_pose(positions, tips, side, sk)
            for side in ("right", "left")
        }
        if noise_mm:
            scale = noise_mm / 1000.0
            body = {k: v + rng.normal(0, scale, 3) for k, v in body.items()}
            hands = {k: v + rng.normal(0, scale, v.shape) for k, v in hands.items()}

        frames.append(ExtractedFrame(time_ms=time_ms, pose=body, hands=hands))

    return frames
