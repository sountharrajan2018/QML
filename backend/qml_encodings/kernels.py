"""Fidelity quantum kernel + kernel-ridge classifier.

k(x, x') = |<psi(x)|psi(x')>|^2. A kernel ridge model fitted to +-1 labels
classifies with the sign of its prediction. The same model with a linear
kernel on the raw features is the classical baseline.
"""
from __future__ import annotations

import numpy as np

from .encodings import encode
from .simulator import simulate

RIDGE = 1e-2
GRID = 30


def states_for(encoding: str, rows, ds, options=None) -> np.ndarray:
    out = []
    for raw in rows:
        n, gates, _ = encode(encoding, raw, ds, options)
        out.append(simulate(n, gates))
    return np.array(out)


def fidelity_kernel(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    return np.abs(A.conj() @ B.T) ** 2


def _fit_predict(K_train, y_pm, K_eval):
    alpha = np.linalg.solve(K_train + RIDGE * np.eye(len(K_train)), y_pm)
    return K_eval @ alpha


def _accuracy(scores, y):
    return float(np.mean((scores > 0).astype(int) == y))


def evaluate(encoding: str, ds: dict, options: dict | None = None) -> dict:
    X = np.asarray(ds["X"], dtype=float)
    y = np.asarray(ds["y"], dtype=int)
    split = np.asarray(ds["split"])
    tr, te = split == "train", split == "test"
    y_pm = 2.0 * y[tr] - 1.0

    S = states_for(encoding, X, ds, options)
    K = fidelity_kernel(S, S)
    s_tr = _fit_predict(K[np.ix_(tr, tr)], y_pm, K[np.ix_(tr, tr)])
    s_te = _fit_predict(K[np.ix_(tr, tr)], y_pm, K[np.ix_(te, tr)])

    # Classical baseline: linear kernel (plus bias) on the raw features.
    lo = np.array([r[0] for r in ds["feature_ranges"]])
    hi = np.array([r[1] for r in ds["feature_ranges"]])
    Z = np.hstack([(X - lo) / (hi - lo), np.ones((len(X), 1))])
    L = Z @ Z.T
    b_te = _fit_predict(L[np.ix_(tr, tr)], y_pm, L[np.ix_(te, tr)])

    all_scores = _fit_predict(K[np.ix_(tr, tr)], y_pm, K[:, tr])
    result = {
        "encoding": encoding,
        "dataset": ds["id"],
        "kernel": np.round(K, 4).tolist(),
        "train_accuracy": _accuracy(s_tr, y[tr]),
        "test_accuracy": _accuracy(s_te, y[te]),
        "baseline_test_accuracy": _accuracy(b_te, y[te]),
        "predictions": (all_scores > 0).astype(int).tolist(),
        "grid": None,
    }

    if X.shape[1] == 2:
        (a0, a1), (b0, b1) = ds["feature_ranges"]
        gx = np.linspace(a0, a1, GRID)
        gy = np.linspace(b0, b1, GRID)
        pts = [[u, v] for v in gy for u in gx]
        G = states_for(encoding, pts, ds, options)
        scores = _fit_predict(K[np.ix_(tr, tr)], y_pm, fidelity_kernel(G, S[tr]))
        result["grid"] = {"size": GRID, "x": gx.tolist(), "y": gy.tolist(),
                          "scores": np.round(scores, 4).tolist()}
    return result
