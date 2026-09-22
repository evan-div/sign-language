"""Writing extracted motion out as a clip the engine can play.

The format is the one the TypeScript engine already reads, so an extracted sign
and a hand-authored one are the same kind of thing downstream -- which is the
property that lets bad motion be replaced later without touching the app.

Provenance is not optional. Every clip records where it came from and how far it
should be trusted, because the difference between motion someone captured, a
model reconstructed and a person drew is exactly what a reviewer needs to know,
and it is unrecoverable once lost.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from .skeleton import Pose, load_skeleton


def to_clip(
    clip_id: str,
    frames: list[tuple[float, Pose]],
    *,
    stroke_start_ms: float | None = None,
    stroke_end_ms: float | None = None,
    source: str = "video-extraction",
    method: str = "mediapipe+direction-matching",
    dataset: str | None = None,
    license_note: str | None = None,
    validation: str = "unvalidated",
) -> dict:
    """Build an SFMC clip from solved frames."""
    if not frames:
        raise ValueError("no frames to export")

    sk = load_skeleton()
    duration = frames[-1][0]

    keyframes = []
    for time_ms, pose in frames:
        keyframes.append({
            "timeMs": round(float(time_ms), 3),
            "pose": {
                joint: [round(float(v), 6) for v in np.asarray(q)]
                for joint, q in pose.items()
                if joint in sk.index
            },
        })

    clip = {
        "id": clip_id,
        "skeletonVersion": sk.version,
        "durationMs": round(float(duration), 3),
        "keyframes": keyframes,
        "provenance": {
            "source": source,
            "method": method,
            **({"dataset": dataset} if dataset else {}),
            **({"license": license_note} if license_note else {}),
            "validation": validation,
        },
    }
    if stroke_start_ms is not None:
        clip["strokeStartMs"] = round(float(stroke_start_ms), 3)
    if stroke_end_ms is not None:
        clip["strokeEndMs"] = round(float(stroke_end_ms), 3)
    return clip


def write_clip(clip: dict, path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(clip, indent=2) + "\n")
    return target
