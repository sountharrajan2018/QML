"""The six data-encoding (feature-map) circuits.

Every encoding exposes:
* ``prepare(raw, dataset)``  raw feature values -> circuit parameters
* ``circuit(x)``             circuit parameters -> (n_qubits, gate list)
plus metadata the frontend shows on the slides.
"""
from __future__ import annotations

import math

import numpy as np

# ---------------------------------------------------------------- helpers


def _rescale(raw, ranges, lo, hi):
    out = []
    for v, (a, b) in zip(raw, ranges):
        out.append(lo + (hi - lo) * (float(v) - a) / (b - a))
    return out


# ---------------------------------------------------------------- basis


def basis_prepare(raw, ds):
    return [1 if float(v) >= 0.5 else 0 for v in raw]


def basis_circuit(x):
    gates = [{"gate": "X", "targets": [q]} for q, b in enumerate(x) if b]
    return len(x), gates


# ---------------------------------------------------------------- angle


def angle_prepare(raw, ds):
    return _rescale(raw, ds["feature_ranges"], 0.0, math.pi)


def angle_circuit(x):
    return len(x), [{"gate": "RY", "targets": [q], "params": [t]} for q, t in enumerate(x)]


# ---------------------------------------------------------------- phase


def phase_prepare(raw, ds):
    return _rescale(raw, ds["feature_ranges"], 0.0, 2 * math.pi)


def phase_circuit(x):
    n = len(x)
    gates = [{"gate": "H", "targets": [q]} for q in range(n)]
    gates += [{"gate": "P", "targets": [q], "params": [t]} for q, t in enumerate(x)]
    return n, gates


# ---------------------------------------------------------------- amplitude


def amplitude_prepare(raw, ds):
    v = np.asarray(raw, dtype=float)
    size = 1 << max(1, math.ceil(math.log2(len(v))))
    v = np.pad(v, (0, size - len(v)))
    norm = np.linalg.norm(v)
    if norm == 0:
        v[0], norm = 1.0, 1.0
    return (v / norm).tolist()


def amplitude_circuit(x):
    """Binary-tree state preparation (Mottonen et al. for real amplitudes).

    Level k rotates qubit k by RY(theta) controlled on the value of qubits
    0..k-1, where theta splits the probability mass between the two halves of
    each sub-tree.  A final diagonal SIGN gate restores negative entries.
    """
    a = np.asarray(x, dtype=float)
    n = int(round(math.log2(len(a))))
    mag2 = a ** 2
    gates = []
    for k in range(n):
        block = 1 << (n - k)
        for p in range(1 << k):
            seg = mag2[p * block:(p + 1) * block]
            left, right = seg[: block // 2].sum(), seg[block // 2:].sum()
            theta = 2 * math.atan2(math.sqrt(right), math.sqrt(left))
            if k == 0:
                gates.append({"gate": "RY", "targets": [0], "params": [theta]})
            else:
                bits = [(p >> (k - 1 - j)) & 1 for j in range(k)]
                gates.append({"gate": "MCRY", "targets": [k], "controls": list(range(k)),
                              "ctrl_state": bits, "params": [theta]})
    if np.any(a < 0):
        gates.append({"gate": "SIGN", "targets": list(range(n)),
                      "params": [(-1.0 if v < 0 else 1.0) for v in a]})
    return n, gates


# ---------------------------------------------------------------- Hamiltonian

HAM_QUBITS = 3
HAM_TIME = 1.0
HAM_STEPS = 2


def hamiltonian_prepare(raw, ds):
    return [float(v) for v in raw]  # J and h are already physical parameters


def hamiltonian_circuit(x):
    """|psi(J,h)> = exp(-i H t)|+++>, H = -J sum Z_i Z_{i+1} - h sum X_i.

    exp(-i H t) is Trotterised into HAM_STEPS steps of RZZ and RX gates.
    """
    J, h = x
    n, dt = HAM_QUBITS, HAM_TIME / HAM_STEPS
    gates = [{"gate": "H", "targets": [q]} for q in range(n)]
    for _ in range(HAM_STEPS):
        for q in range(n - 1):
            gates.append({"gate": "RZZ", "targets": [q, q + 1], "params": [-2 * J * dt]})
        for q in range(n):
            gates.append({"gate": "RX", "targets": [q], "params": [-2 * h * dt]})
    return n, gates


# ---------------------------------------------------------------- IQP

IQP_REPS = 1  # default; 2 is the original Havlicek circuit (try it: it overfits here)


def iqp_prepare(raw, ds):
    return _rescale(raw, ds["feature_ranges"], 0.0, math.pi)


def iqp_circuit(x, reps=None):
    """Havlicek et al. (2019) IQP / ZZ feature map: (U_Z(x) H^n)^reps.

    U_Z(x) = prod_i RZ(2 x_i) * prod_{i<j} RZZ(2 (pi - x_i)(pi - x_j)).
    """
    n = len(x)
    gates = []
    for _ in range(reps or IQP_REPS):
        gates += [{"gate": "H", "targets": [q]} for q in range(n)]
        gates += [{"gate": "RZ", "targets": [q], "params": [2 * x[q]]} for q in range(n)]
        for i in range(n):
            for j in range(i + 1, n):
                phi = (math.pi - x[i]) * (math.pi - x[j])
                gates.append({"gate": "RZZ", "targets": [i, j], "params": [2 * phi]})
    return n, gates


# ---------------------------------------------------------------- registry

ENCODINGS = {
    "basis": {
        "name": "Basis Encoding",
        "dataset": "zoo",
        "prepare": basis_prepare,
        "circuit": basis_circuit,
        "formula": "x = (b1, ..., bn) in {0,1}^n  ->  |x> = |b1 b2 ... bn>",
        "qubits": "n qubits for n bits",
        "depth": "1 layer of X gates",
        "data_type": "Binary / categorical",
        "pros": ["Exact and trivially simple", "Basis for quantum arithmetic, oracles, Grover search"],
        "cons": ["Different inputs give orthogonal states, so the kernel is a delta and nothing generalises",
                 "Continuous data must first be binarised"],
    },
    "angle": {
        "name": "Angle Encoding",
        "dataset": "fruit",
        "prepare": angle_prepare,
        "circuit": angle_circuit,
        "formula": "|x> = prod_i RY(x_i)|0> = prod_i [cos(x_i/2)|0> + sin(x_i/2)|1>]",
        "qubits": "n qubits for n features",
        "depth": "1 (all rotations in parallel)",
        "data_type": "Bounded continuous features",
        "pros": ["Constant depth, easy on today's hardware", "Kernel = prod cos^2((x_i - x'_i)/2) is smooth"],
        "cons": ["No entanglement: a product state", "One qubit per feature"],
    },
    "phase": {
        "name": "Phase Encoding",
        "dataset": "wind",
        "prepare": phase_prepare,
        "circuit": phase_circuit,
        "formula": "|x> = prod_i P(x_i) H |0> = prod_i (|0> + e^{i x_i}|1>)/sqrt(2)",
        "qubits": "n qubits for n features",
        "depth": "2 (Hadamard + phase)",
        "data_type": "Periodic / angular features",
        "pros": ["2pi-periodic: wrap-around is built in", "Information sits in relative phases"],
        "cons": ["All Z-basis probabilities are equal: you must interfere or rotate before measuring",
                 "Values 2pi apart are indistinguishable"],
    },
    "amplitude": {
        "name": "Amplitude Encoding",
        "dataset": "bars",
        "prepare": amplitude_prepare,
        "circuit": amplitude_circuit,
        "formula": "|x> = (1/||x||) sum_i x_i |i>   (N values -> log2 N qubits)",
        "qubits": "log2(N) qubits for N features",
        "depth": "O(N) gates, many multi-controlled",
        "data_type": "Vectors, images, spectra",
        "pros": ["Exponential compression: 16 pixels on 4 qubits", "Kernel = squared cosine similarity"],
        "cons": ["State preparation is deep in general", "Loses the vector's norm"],
    },
    "hamiltonian": {
        "name": "Hamiltonian Encoding",
        "dataset": "ising",
        "prepare": hamiltonian_prepare,
        "circuit": hamiltonian_circuit,
        "formula": "|x> = exp(-i H(x) t)|+>^n,   H(J,h) = -J sum Z_i Z_(i+1) - h sum X_i",
        "qubits": "set by the physical model (3 here)",
        "depth": f"{HAM_STEPS} Trotter steps",
        "data_type": "Physical parameters / time evolution",
        "pros": ["Natural for physics and chemistry data", "Creates entanglement driven by the data"],
        "cons": ["Trotter error versus circuit depth", "You need to choose a meaningful H"],
    },
    "iqp": {
        "name": "IQP Encoding",
        "dataset": "xor",
        "prepare": iqp_prepare,
        "circuit": iqp_circuit,
        "formula": "|x> = (U_Z(x) H^n)^reps |0>,  U_Z = exp(i [sum x_i Z_i + sum (pi-x_i)(pi-x_j) Z_i Z_j])",
        "qubits": "n qubits for n features",
        "depth": "reps x (H layer + diagonal ZZ layer)",
        "data_type": "Features with interactions (non-linear)",
        "pros": ["Feature products in ZZ phases enable non-linear boundaries",
                 "Believed hard to simulate classically at scale (Havlicek et al. 2019)"],
        "cons": ["Expressive kernels can concentrate (all values near 0) at many qubits",
                 "Deeper, entangling circuits are noisier"],
    },
}


def encoding_metadata() -> list[dict]:
    return [{"id": k, **{f: v for f, v in e.items() if f not in ("prepare", "circuit")}}
            for k, e in ENCODINGS.items()]


def encode(encoding: str, raw, ds, options: dict | None = None) -> tuple[int, list[dict], list[float]]:
    enc = ENCODINGS[encoding]
    x = enc["prepare"](raw, ds)
    if encoding == "iqp":
        n, gates = iqp_circuit(x, int((options or {}).get("reps") or IQP_REPS))
    else:
        n, gates = enc["circuit"](x)
    return n, gates, x
