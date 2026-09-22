"""Temporal smoothing.

Solving each frame independently is the obvious way to build an extraction
pipeline and it produces unusable motion. Every frame's landmark error is drawn
fresh, so consecutive frames disagree by roughly twice the per-frame error even
when the hand is still -- measured at 90 to 130mm of frame-to-frame fingertip
movement at 10mm landmark noise, against real signing that moves a fingertip a
few centimetres between frames. The signal is there; it is buried in noise of
the same size.

Smoothing across frames is what separates them, because the error is
independent between frames and the motion is not. It is applied to rotations
rather than to landmarks so that the result stays a valid pose, and it uses a
proper quaternion mean rather than averaging components, which would drift off
the unit sphere and shrink rotations toward identity.

The cost is latency and detail: a window wide enough to kill the jitter also
rounds off the sharp stops that make a sign's stroke readable. That trade is
why the window is a parameter and why the quality gate still checks jitter
afterwards.
"""

from __future__ import annotations

import numpy as np

from .skeleton import Pose


def quaternion_mean(quaternions: np.ndarray, weights: np.ndarray | None = None) -> np.ndarray:
    """The average of several rotations.

    Averaging quaternion components and renormalising is wrong in a way that is
    easy to miss: it pulls toward whichever hemisphere the samples happen to sit
    in and shrinks the rotation. The principal eigenvector of the weighted outer
    products is the actual mean, and costs nothing at this size.
    """
    q = np.asarray(quaternions, dtype=np.float64)
    if len(q) == 1:
        return q[0]
    # Put every sample in the same hemisphere as the first, or opposite signs
    # of the same rotation cancel.
    reference = q[0]
    signs = np.where(q @ reference < 0, -1.0, 1.0)
    q = q * signs[:, None]
    w = np.ones(len(q)) if weights is None else np.asarray(weights, dtype=np.float64)
    matrix = (q * w[:, None]).T @ q
    _, vectors = np.linalg.eigh(matrix)
    mean = vectors[:, -1]
    return mean if mean[3] >= 0 else -mean


def gaussian_weights(radius: int, sigma: float) -> np.ndarray:
    offsets = np.arange(-radius, radius + 1, dtype=np.float64)
    return np.exp(-0.5 * (offsets / sigma) ** 2)


def smooth_poses(
    frames: list[tuple[float, Pose]],
    radius: int = 2,
    sigma: float | None = None,
) -> list[tuple[float, Pose]]:
    """Smooth every joint across time with a Gaussian window.

    ``radius`` is in frames either side. At 30fps a radius of 2 averages over
    about 165ms, which is short enough to keep a sign's stroke and long enough
    to halve independent per-frame noise.
    """
    if radius <= 0 or len(frames) < 3:
        return frames

    sigma = sigma if sigma is not None else max(radius / 2.0, 0.5)
    kernel = gaussian_weights(radius, sigma)
    joints = sorted({joint for _, pose in frames for joint in pose})
    identity = np.array([0.0, 0.0, 0.0, 1.0])

    smoothed: list[tuple[float, Pose]] = []
    for i, (time_ms, _) in enumerate(frames):
        low, high = max(0, i - radius), min(len(frames) - 1, i + radius)
        window = range(low, high + 1)
        weights = kernel[[j - i + radius for j in window]]

        pose: Pose = {}
        for joint in joints:
            samples = np.stack([
                np.asarray(frames[j][1].get(joint, identity), dtype=np.float64) for j in window
            ])
            pose[joint] = quaternion_mean(samples, weights)
        smoothed.append((time_ms, pose))

    return smoothed
