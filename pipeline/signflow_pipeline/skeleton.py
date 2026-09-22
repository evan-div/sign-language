"""The canonical skeleton, loaded from the exported JSON.

Deliberately reads ``data/skeleton/canonical-skeleton.json`` rather than
restating the joint table. The TypeScript engine owns the skeleton; duplicating
it here would let the two drift, and a drifting skeleton silently corrupts every
clip the pipeline produces. ``tests/test_fk_parity.py`` pins the two
implementations to the same numbers.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA = REPO_ROOT / "data"


@dataclass(frozen=True)
class Joint:
    name: str
    parent: int
    offset: np.ndarray


@dataclass(frozen=True)
class TipSite:
    name: str
    joint: str
    offset: np.ndarray


class Skeleton:
    def __init__(self, spec: dict) -> None:
        self.version: str = spec["version"]
        names = [j["name"] for j in spec["joints"]]
        self.index = {name: i for i, name in enumerate(names)}
        self.joints = [
            Joint(
                name=j["name"],
                parent=-1 if j["parent"] is None else self.index[j["parent"]],
                offset=np.asarray(j["offset"], dtype=np.float64),
            )
            for j in spec["joints"]
        ]
        self.tips = [
            TipSite(name=t["name"], joint=t["joint"], offset=np.asarray(t["offset"], dtype=np.float64))
            for t in spec["tipSites"]
        ]
        self.tip_index = {t.name: i for i, t in enumerate(self.tips)}

    def __len__(self) -> int:
        return len(self.joints)

    @property
    def names(self) -> list[str]:
        return [j.name for j in self.joints]

    def hand_joints(self, side: str) -> list[str]:
        """The fifteen joints below one wrist, in canonical order."""
        return [
            j.name
            for j in self.joints
            if j.name.startswith(f"{side}_")
            and j.name[-1] in "123"
            and any(f in j.name for f in ("index", "middle", "ring", "pinky", "thumb"))
        ]


@lru_cache(maxsize=1)
def load_skeleton() -> Skeleton:
    with (DATA / "skeleton" / "canonical-skeleton.json").open() as handle:
        return Skeleton(json.load(handle))


# --- quaternion helpers -------------------------------------------------
# Quaternions are [x, y, z, w], matching the TypeScript side.

IDENTITY = np.array([0.0, 0.0, 0.0, 1.0])


def quat_multiply(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return np.array([
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    ])


def quat_conjugate(q: np.ndarray) -> np.ndarray:
    return np.array([-q[0], -q[1], -q[2], q[3]])


def quat_rotate(q: np.ndarray, v: np.ndarray) -> np.ndarray:
    qv = q[:3]
    t = 2.0 * np.cross(qv, v)
    return v + q[3] * t + np.cross(qv, t)


def quat_normalize(q: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(q)
    return IDENTITY.copy() if n == 0 else q / n


def quat_from_euler_deg(x: float, y: float, z: float) -> np.ndarray:
    """Intrinsic XYZ, matching quatFromEuler in the TypeScript engine."""
    hx, hy, hz = np.radians([x, y, z]) / 2.0
    cx, sx = np.cos(hx), np.sin(hx)
    cy, sy = np.cos(hy), np.sin(hy)
    cz, sz = np.cos(hz), np.sin(hz)
    return np.array([
        sx * cy * cz + cx * sy * sz,
        cx * sy * cz - sx * cy * sz,
        cx * cy * sz + sx * sy * cz,
        cx * cy * cz - sx * sy * sz,
    ])


def quat_between(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Shortest-arc rotation taking unit vector ``a`` to unit vector ``b``."""
    a = a / (np.linalg.norm(a) or 1.0)
    b = b / (np.linalg.norm(b) or 1.0)
    d = float(np.dot(a, b))
    if d > 1.0 - 1e-9:
        return IDENTITY.copy()
    if d < -1.0 + 1e-9:
        # Opposed: any perpendicular axis will do; pick a stable one.
        axis = np.cross(a, np.array([1.0, 0.0, 0.0]))
        if np.linalg.norm(axis) < 1e-6:
            axis = np.cross(a, np.array([0.0, 1.0, 0.0]))
        axis /= np.linalg.norm(axis)
        return np.array([axis[0], axis[1], axis[2], 0.0])
    axis = np.cross(a, b)
    return quat_normalize(np.array([axis[0], axis[1], axis[2], 1.0 + d]))


def quat_slerp(a: np.ndarray, b: np.ndarray, t: float) -> np.ndarray:
    """Shortest-arc spherical interpolation."""
    b = np.asarray(b, dtype=np.float64).copy()
    a = np.asarray(a, dtype=np.float64)
    cos = float(np.dot(a, b))
    if cos < 0.0:
        cos, b = -cos, -b
    if cos > 0.9995:
        return quat_normalize(a + (b - a) * t)
    theta = np.arccos(np.clip(cos, -1.0, 1.0))
    sin = np.sin(theta)
    return (np.sin((1.0 - t) * theta) / sin) * a + (np.sin(t * theta) / sin) * b


def quat_from_basis(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> np.ndarray:
    """Quaternion from the images of +X, +Y and +Z. Columns, not rows."""
    trace = x[0] + y[1] + z[2]
    if trace > 0:
        s = np.sqrt(trace + 1.0) * 2.0
        return quat_normalize(np.array([(y[2] - z[1]) / s, (z[0] - x[2]) / s, (x[1] - y[0]) / s, 0.25 * s]))
    if x[0] > y[1] and x[0] > z[2]:
        s = np.sqrt(1.0 + x[0] - y[1] - z[2]) * 2.0
        return quat_normalize(np.array([0.25 * s, (y[0] + x[1]) / s, (z[0] + x[2]) / s, (y[2] - z[1]) / s]))
    if y[1] > z[2]:
        s = np.sqrt(1.0 + y[1] - x[0] - z[2]) * 2.0
        return quat_normalize(np.array([(y[0] + x[1]) / s, 0.25 * s, (z[1] + y[2]) / s, (z[0] - x[2]) / s]))
    s = np.sqrt(1.0 + z[2] - x[0] - y[1]) * 2.0
    return quat_normalize(np.array([(z[0] + x[2]) / s, (z[1] + y[2]) / s, 0.25 * s, (x[1] - y[0]) / s]))


def quat_from_hand_directions(fingers: np.ndarray, palm: np.ndarray) -> np.ndarray:
    """Rotation sending +Y to ``fingers`` and +Z to ``palm``."""
    f = fingers / (np.linalg.norm(fingers) or 1.0)
    side = np.cross(f, palm)
    side /= np.linalg.norm(side) or 1.0
    p = np.cross(side, f)
    # quat_from_basis takes the images of +X, +Y and +Z -- the basis columns.
    # Passing rows yields the transpose, which is the inverse rotation.
    return quat_from_basis(side, f, p)


Pose = dict[str, np.ndarray]


def solve_fk(pose: Pose, skeleton: Skeleton | None = None) -> tuple[np.ndarray, np.ndarray]:
    """World positions and rotations for every joint.

    Returns ``(positions, rotations)`` indexed as ``skeleton.joints``.
    """
    sk = skeleton or load_skeleton()
    n = len(sk)
    positions = np.zeros((n, 3))
    rotations = np.zeros((n, 4))

    for i, joint in enumerate(sk.joints):
        local = pose.get(joint.name)
        local = IDENTITY if local is None else np.asarray(local, dtype=np.float64)
        if joint.parent < 0:
            positions[i] = joint.offset
            rotations[i] = local
            continue
        parent_pos = positions[joint.parent]
        parent_rot = rotations[joint.parent]
        positions[i] = parent_pos + quat_rotate(parent_rot, joint.offset)
        rotations[i] = quat_multiply(parent_rot, local)

    return positions, rotations


def tip_positions(positions: np.ndarray, rotations: np.ndarray, skeleton: Skeleton | None = None) -> np.ndarray:
    sk = skeleton or load_skeleton()
    out = np.zeros((len(sk.tips), 3))
    for i, tip in enumerate(sk.tips):
        j = sk.index[tip.joint]
        out[i] = positions[j] + quat_rotate(rotations[j], tip.offset)
    return out
