"""Synthetic datasets, one picked to suit each encoding.

Each dataset is generated with a fixed seed, so every run gives the same data.
``backend/scripts/export_static.py`` writes the same data to
``frontend/data/datasets.json`` so the frontend still works with no backend
(GitHub Pages).
"""
from __future__ import annotations

import numpy as np


def _split(n: int, rng: np.random.Generator, test_frac: float = 0.3) -> list[str]:
    order = rng.permutation(n)
    n_test = int(round(n * test_frac))
    split = np.array(["train"] * n, dtype=object)
    split[order[:n_test]] = "test"
    return split.tolist()


def _pack(name, title, story, feature_names, class_names, X, y, split, ranges, kind, **extra):
    return {
        "id": name,
        "title": title,
        "story": story,
        "feature_names": feature_names,
        "class_names": class_names,
        "feature_ranges": ranges,
        "kind": kind,
        "X": [[round(float(v), 4) for v in row] for row in X],
        "y": [int(v) for v in y],
        "split": split,
        **extra,
    }


def zoo_binary() -> dict:
    """Basis encoding: yes/no animal traits -> mammal or not."""
    rows = [
        # fur, eggs, flies, aquatic   label (1 = mammal)
        ("Dog", [1, 0, 0, 0], 1), ("Cat", [1, 0, 0, 0], 1),
        ("Bat", [1, 0, 1, 0], 1), ("Dolphin", [0, 0, 0, 1], 1),
        ("Seal", [1, 0, 0, 1], 1), ("Platypus", [1, 1, 0, 1], 1),
        ("Whale", [0, 0, 0, 1], 1), ("Otter", [1, 0, 0, 1], 1),
        ("Eagle", [0, 1, 1, 0], 0), ("Penguin", [0, 1, 0, 1], 0),
        ("Salmon", [0, 1, 0, 1], 0), ("Frog", [0, 1, 0, 1], 0),
        ("Bee", [1, 1, 1, 0], 0), ("Lizard", [0, 1, 0, 0], 0),
        ("Duck", [0, 1, 1, 1], 0), ("Snake", [0, 1, 0, 0], 0),
    ]
    rng = np.random.default_rng(1)
    return _pack(
        "zoo", "Mini-Zoo (binary traits)",
        "16 animals described by four yes/no traits. Discrete bits map one-to-one "
        "onto computational basis states, so basis encoding is the natural fit.",
        ["has fur", "lays eggs", "can fly", "aquatic"], ["not mammal", "mammal"],
        [r[1] for r in rows], [r[2] for r in rows], _split(len(rows), rng),
        [[0, 1]] * 4, "binary", names=[r[0] for r in rows],
    )


def fruit_ripeness() -> dict:
    """Angle encoding: two bounded continuous sensor readings."""
    rng = np.random.default_rng(7)
    n = 40
    unripe = rng.normal([4.0, 7.5], [1.1, 0.9], size=(n // 2, 2))
    ripe = rng.normal([7.0, 4.0], [1.1, 0.9], size=(n // 2, 2))
    X = np.clip(np.vstack([unripe, ripe]), 0.5, 9.5)
    y = np.array([0] * (n // 2) + [1] * (n // 2))
    return _pack(
        "fruit", "Fruit Ripeness (sugar vs firmness)",
        "Two bounded sensor readings (sugar level 0-10, firmness 0-10) per fruit. "
        "Each reading is rescaled to an angle in [0, pi] and becomes one RY rotation.",
        ["sugar (0-10)", "firmness (0-10)"], ["unripe", "ripe"],
        X, y, _split(n, rng), [[0, 10], [0, 10]], "continuous",
    )


def wind_and_time() -> dict:
    """Phase encoding: periodic features (compass direction, hour of day)."""
    rng = np.random.default_rng(11)
    n = 60
    direction = rng.uniform(0, 360, n)
    hour = rng.uniform(0, 24, n)
    a, b = np.deg2rad(direction), 2 * np.pi * hour / 24
    # Northerly wind (around 0/360 deg) at night (around 0/24 h) -> fog alert.
    y = (np.cos(a) + np.cos(b) > 0.4).astype(int)
    X = np.column_stack([direction, hour])
    return _pack(
        "wind", "Coastal Fog Alerts (wind direction, hour)",
        "Wind direction (0-360 deg) and hour of day (0-24 h) are both cyclic: 359 deg is "
        "next to 1 deg and 23:00 is next to 01:00. Phase encoding is periodic by "
        "construction, so it captures this wrap-around; a straight line in raw "
        "feature space cannot.",
        ["wind direction (deg)", "hour of day"], ["no fog", "fog alert"],
        X, y, _split(n, rng), [[0, 360], [0, 24]], "periodic",
    )


def bar_images() -> dict:
    """Amplitude encoding: 4x4 grey-scale images = 16 values -> 4 qubits."""
    rng = np.random.default_rng(3)
    imgs, labels = [], []
    for k in range(24):
        img = rng.uniform(0.0, 0.25, (4, 4))
        line = k % 4
        if k % 2 == 0:
            img[line, :] += rng.uniform(0.7, 1.0, 4)
            labels.append(0)
        else:
            img[:, line] += rng.uniform(0.7, 1.0, 4)
            labels.append(1)
        imgs.append(np.clip(img, 0, 1).ravel())
    return _pack(
        "bars", "Bars & Stripes (4x4 images)",
        "Tiny 4x4 grey-scale images with a horizontal or vertical bar plus noise. "
        "16 pixel intensities fit into the amplitudes of only 4 qubits "
        "(2^4 = 16): amplitude encoding is exponentially compact.",
        [f"p{r}{c}" for r in range(4) for c in range(4)], ["horizontal", "vertical"],
        imgs, labels, _split(24, rng), [[0, 1]] * 16, "image", image_shape=[4, 4],
    )


def ising_phases() -> dict:
    """Hamiltonian encoding: physical parameters of a spin chain."""
    rng = np.random.default_rng(5)
    n = 50
    J = rng.uniform(0.1, 2.0, n)
    h = rng.uniform(0.1, 2.0, n)
    y = (h > J).astype(int)  # transverse-field Ising: disordered when h > J
    X = np.column_stack([J, h])
    return _pack(
        "ising", "Spin-Chain Phases (coupling J, field h)",
        "Each sample is a transverse-field Ising magnet with coupling J and field h. "
        "The label is the phase: ordered (ferromagnet, h < J) or disordered "
        "(paramagnet, h > J). The data literally are Hamiltonian parameters, so we "
        "encode them as the time evolution exp(-i H(J,h) t).",
        ["coupling J", "field h"], ["ordered", "disordered"],
        X, y, _split(n, rng), [[0, 2.1], [0, 2.1]], "physical",
    )


def xor_quadrants() -> dict:
    """IQP encoding: XOR pattern needs the x1*x2 interaction term."""
    rng = np.random.default_rng(21)
    n = 60
    X = rng.uniform(-1, 1, (n, 2))
    X = X[np.abs(X).min(axis=1) > 0.08][:n]
    y = (X[:, 0] * X[:, 1] < 0).astype(int)
    return _pack(
        "xor", "XOR Quadrants",
        "Points are labelled by the sign of x1*x2, so the class depends on how "
        "the features interact. No linear model can separate it; the IQP circuit "
        "puts products of features into ZZ phases, giving the kernel those "
        "interaction terms.",
        ["x1", "x2"], ["same sign", "opposite sign"],
        X, y, _split(len(X), rng), [[-1, 1], [-1, 1]], "continuous",
    )


DATASETS = {
    "zoo": zoo_binary,
    "fruit": fruit_ripeness,
    "wind": wind_and_time,
    "bars": bar_images,
    "ising": ising_phases,
    "xor": xor_quadrants,
}

_CACHE: dict[str, dict] = {}


def get_dataset(name: str) -> dict:
    if name not in DATASETS:
        raise KeyError(name)
    if name not in _CACHE:
        _CACHE[name] = DATASETS[name]()
    return _CACHE[name]


def all_datasets() -> dict[str, dict]:
    return {k: get_dataset(k) for k in DATASETS}
