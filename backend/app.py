"""Flask API for the QML encodings demo.

Run:  python backend/app.py   -> http://localhost:5000 (also serves the frontend)

The public GitHub Pages site does not need this server: it uses the JavaScript
port in frontend/js/quantum.js instead.
"""
from __future__ import annotations

import os
import sys

import numpy as np
from flask import Flask, jsonify, request, send_from_directory

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from qml_encodings import (ENCODINGS, all_datasets, encode, encoding_metadata,  # noqa: E402
                           evaluate, get_dataset, state_report)
from qml_encodings.simulator import bloch_vectors  # noqa: E402

FRONTEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")

app = Flask(__name__, static_folder=None)


@app.after_request
def cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp


def _error(msg, code=400):
    return jsonify({"error": msg}), code


def _encoding_and_dataset(body):
    enc = body.get("encoding")
    if enc not in ENCODINGS:
        raise ValueError(f"unknown encoding {enc!r}; choose from {list(ENCODINGS)}")
    return enc, get_dataset(ENCODINGS[enc]["dataset"])


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "engine": "python", "numpy": np.__version__})


@app.get("/api/encodings")
def encodings():
    return jsonify(encoding_metadata())


@app.get("/api/datasets")
def datasets():
    return jsonify(all_datasets())


@app.get("/api/datasets/<name>")
def dataset(name):
    try:
        return jsonify(get_dataset(name))
    except KeyError:
        return _error(f"unknown dataset {name!r}", 404)


@app.route("/api/encode", methods=["POST", "OPTIONS"])
def encode_point():
    if request.method == "OPTIONS":
        return "", 204
    body = request.get_json(silent=True) or {}
    try:
        enc, ds = _encoding_and_dataset(body)
        raw = [float(v) for v in body.get("x", [])]
        if len(raw) != len(ds["feature_names"]):
            raise ValueError(f"expected {len(ds['feature_names'])} features, got {len(raw)}")
        n, gates, x = encode(enc, raw, ds, body.get("options"))
    except (TypeError, ValueError) as exc:
        return _error(str(exc))
    report = state_report(n, gates)
    report["encoded_values"] = x
    return jsonify(report)


@app.route("/api/evaluate", methods=["POST", "OPTIONS"])
def evaluate_encoding():
    if request.method == "OPTIONS":
        return "", 204
    body = request.get_json(silent=True) or {}
    try:
        enc, ds = _encoding_and_dataset(body)
    except ValueError as exc:
        return _error(str(exc))
    return jsonify(evaluate(enc, ds, body.get("options")))


@app.route("/api/superposition", methods=["POST", "OPTIONS"])
def superposition():
    """Basis-encode a whole dataset at once: |D> = 1/sqrt(M) sum_m |x^m>.

    Duplicate records add up, so P(x) is the frequency of x in the dataset.
    """
    if request.method == "OPTIONS":
        return "", 204
    body = request.get_json(silent=True) or {}
    rows = body.get("rows") or []
    if not rows:
        return _error("rows must be a non-empty list of bit lists")
    n = len(rows[0])
    if n > 10 or any(len(r) != n for r in rows):
        return _error("rows must all have the same length (at most 10 bits)")
    amp = np.zeros(2 ** n)
    for r in rows:
        amp[int("".join("1" if float(b) >= 0.5 else "0" for b in r), 2)] += 1
    # sqrt(count) amplitudes: measuring gives each record with its empirical frequency
    amp = np.sqrt(amp / amp.sum())
    gates = [{"gate": "PREP", "targets": list(range(n)), "params": amp.tolist()}]
    report = state_report(n, gates)
    report["bloch"] = bloch_vectors(np.asarray(amp, dtype=complex), n)
    return jsonify(report)


# ------------------------------------------------------------- static frontend (local use)

@app.get("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND, path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"QML Encodings demo running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=bool(os.environ.get("DEBUG")))
