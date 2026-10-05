"""A tiny, dependency-light state-vector simulator (NumPy only).

Conventions
-----------
* Qubit 0 is the *left-most* (most significant) bit of a basis ket, so the
  index of |q0 q1 ... q(n-1)> is q0*2^(n-1) + ... + q(n-1).
* A circuit is a list of gate dictionaries, e.g.
  ``{"gate": "RY", "targets": [0], "params": [0.5]}``.  The same format is
  produced by the JavaScript engine in the frontend, so circuits can be
  drawn identically no matter which engine computed them.

Supported gates
---------------
H, X, RX(t), RY(t), RZ(t), P(l)           single-qubit gates
CNOT                                      controls=[c], targets=[t]
MCRY(t)                                   multi-controlled RY, ``ctrl_state`` gives
                                          the control values (0/1) that fire it
RZZ(t)                                    exp(-i t/2 Z(x)Z) on targets=[a, b]
SIGN                                      diagonal +-1 on the full register
PREP                                      load a normalised vector (only valid on |0..0>)
"""
from __future__ import annotations

import numpy as np

SQ2 = 1.0 / np.sqrt(2.0)


def single_qubit_matrix(name: str, params=()) -> np.ndarray:
    t = params[0] if params else 0.0
    if name == "H":
        return np.array([[SQ2, SQ2], [SQ2, -SQ2]], dtype=complex)
    if name in ("X", "CNOT"):
        return np.array([[0, 1], [1, 0]], dtype=complex)
    if name == "RX":
        c, s = np.cos(t / 2), np.sin(t / 2)
        return np.array([[c, -1j * s], [-1j * s, c]], dtype=complex)
    if name in ("RY", "MCRY"):
        c, s = np.cos(t / 2), np.sin(t / 2)
        return np.array([[c, -s], [s, c]], dtype=complex)
    if name == "RZ":
        return np.array([[np.exp(-1j * t / 2), 0], [0, np.exp(1j * t / 2)]], dtype=complex)
    if name == "P":
        return np.array([[1, 0], [0, np.exp(1j * t)]], dtype=complex)
    raise ValueError(f"Unknown single-qubit gate {name!r}")


def _bit(indices: np.ndarray, q: int, n: int) -> np.ndarray:
    return (indices >> (n - 1 - q)) & 1


def apply_gate(state: np.ndarray, gate: dict, n: int) -> np.ndarray:
    name = gate["gate"]
    params = gate.get("params", [])
    targets = gate.get("targets", [])
    idx = np.arange(2 ** n)

    if name == "PREP":
        vec = np.asarray(params, dtype=complex)
        return vec / np.linalg.norm(vec)
    if name == "SIGN":
        return state * np.asarray(params, dtype=float)
    if name == "RZZ":
        a, b = targets
        z = (1 - 2 * _bit(idx, a, n)) * (1 - 2 * _bit(idx, b, n))
        return state * np.exp(-1j * params[0] / 2 * z)

    # Generic (multi-)controlled single-qubit unitary.
    u = single_qubit_matrix(name, params)
    t = targets[0]
    controls = gate.get("controls", [])
    ctrl_state = gate.get("ctrl_state", [1] * len(controls))
    mask = _bit(idx, t, n) == 0
    for c, v in zip(controls, ctrl_state):
        mask &= _bit(idx, c, n) == v
    i0 = idx[mask]
    i1 = i0 | (1 << (n - 1 - t))
    a0, a1 = state[i0].copy(), state[i1].copy()
    new = state.copy()
    new[i0] = u[0, 0] * a0 + u[0, 1] * a1
    new[i1] = u[1, 0] * a0 + u[1, 1] * a1
    return new


def simulate(n: int, gates: list[dict]) -> np.ndarray:
    state = np.zeros(2 ** n, dtype=complex)
    state[0] = 1.0
    for g in gates:
        state = apply_gate(state, g, n)
    return state


def bloch_vectors(state: np.ndarray, n: int) -> list[dict]:
    """Bloch vector of every qubit's reduced density matrix.

    A vector shorter than 1 means the qubit is entangled with the others.
    """
    psi = state.reshape([2] * n)
    out = []
    for q in range(n):
        m = np.moveaxis(psi, q, 0).reshape(2, -1)
        rho = m @ m.conj().T
        x = 2 * rho[0, 1].real
        y = 2 * rho[1, 0].imag
        z = (rho[0, 0] - rho[1, 1]).real
        out.append({"x": float(x), "y": float(y), "z": float(z),
                    "purity": float(np.real(np.trace(rho @ rho)))})
    return out


def state_report(n: int, gates: list[dict]) -> dict:
    """Everything the frontend needs to draw a single encoded data point."""
    state = simulate(n, gates)
    state = np.where(np.abs(state) < 1e-12, 0, state)
    return {
        "n_qubits": n,
        "gates": gates,
        "statevector": [[float(a.real), float(a.imag)] for a in state],
        "probabilities": [float(p) for p in np.abs(state) ** 2],
        "bloch": bloch_vectors(state, n),
    }
