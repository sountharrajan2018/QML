import math

import numpy as np
import pytest

from qml_encodings import ENCODINGS, encode, evaluate, get_dataset, simulate
from qml_encodings.simulator import bloch_vectors


def state(enc, raw):
    ds = get_dataset(ENCODINGS[enc]["dataset"])
    n, gates, x = encode(enc, raw, ds)
    return simulate(n, gates), x


def test_basis_encoding_is_a_computational_basis_state():
    psi, _ = state("basis", [1, 0, 1, 1])
    assert np.isclose(abs(psi[0b1011]), 1)


def test_angle_encoding_matches_product_formula():
    psi, x = state("angle", [2.5, 7.5])
    q = [np.array([math.cos(t / 2), math.sin(t / 2)]) for t in x]
    assert np.allclose(psi, np.kron(q[0], q[1]))


def test_phase_encoding_has_uniform_probabilities_and_is_periodic():
    psi, _ = state("phase", [90, 6])
    assert np.allclose(np.abs(psi) ** 2, 0.25)
    a, _ = state("phase", [0, 0])
    b, _ = state("phase", [360, 24])
    assert np.isclose(abs(np.vdot(a, b)) ** 2, 1)


def test_amplitude_encoding_reproduces_normalised_vector():
    rng = np.random.default_rng(0)
    for v in (rng.uniform(0, 1, 16), rng.normal(size=16)):
        psi, _ = state("amplitude", v.tolist())
        assert np.allclose(psi.real, v / np.linalg.norm(v))
        assert np.allclose(psi.imag, 0)


def test_hamiltonian_encoding_matches_exact_trotter_product():
    from qml_encodings.encodings import HAM_STEPS, HAM_TIME
    J, h = 0.7, 1.3
    psi, _ = state("hamiltonian", [J, h])
    X = np.array([[0, 1], [1, 0]]); Z = np.diag([1, -1]); I = np.eye(2)
    kron = lambda *m: m[0] if len(m) == 1 else np.kron(m[0], kron(*m[1:]))
    dt = HAM_TIME / HAM_STEPS
    zz = sum(kron(*[Z if k in (q, q + 1) else I for k in range(3)]) for q in range(2))
    xs = [kron(*[X if k == q else I for k in range(3)]) for q in range(3)]
    expm = lambda H: (lambda w, V: V @ np.diag(np.exp(-1j * w)) @ V.conj().T)(*np.linalg.eigh(H))
    step = expm(-h * dt * sum(xs)) @ expm(-J * dt * zz)
    plus = np.ones(8) / np.sqrt(8)
    assert np.allclose(psi, np.linalg.matrix_power(step, HAM_STEPS) @ plus)


def test_iqp_creates_entanglement():
    psi, _ = state("iqp", [0.3, -0.6])
    assert min(b["purity"] for b in bloch_vectors(psi, 2)) < 0.999


@pytest.mark.parametrize("enc", list(ENCODINGS))
def test_kernel_is_valid_and_classifier_beats_chance(enc):
    ds = get_dataset(ENCODINGS[enc]["dataset"])
    r = evaluate(enc, ds)
    K = np.array(r["kernel"])
    assert np.allclose(np.diag(K), 1, atol=1e-3)
    assert np.allclose(K, K.T)
    assert np.linalg.eigvalsh(K).min() > -1e-3
    assert r["test_accuracy"] >= 0.7


def test_quantum_kernels_beat_linear_baseline_on_nonlinear_data():
    for enc in ("phase", "iqp"):
        r = evaluate(enc, get_dataset(ENCODINGS[enc]["dataset"]))
        assert r["test_accuracy"] > r["baseline_test_accuracy"]
