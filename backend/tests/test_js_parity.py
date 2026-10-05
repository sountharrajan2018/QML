"""The in-browser JavaScript engine must agree with the Python backend."""
import json
import os
import shutil
import subprocess

import numpy as np
import pytest

from qml_encodings import ENCODINGS, all_datasets, encode, evaluate, simulate

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
JS = os.path.join(ROOT, "frontend", "js", "quantum.js")

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")


def run_node(script: str):
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def test_static_datasets_are_up_to_date():
    with open(os.path.join(ROOT, "frontend", "data", "datasets.json")) as f:
        assert json.load(f) == json.loads(json.dumps(all_datasets()))


@pytest.mark.parametrize("enc", list(ENCODINGS))
def test_states_and_evaluation_match(enc):
    ds = all_datasets()[ENCODINGS[enc]["dataset"]]
    raw = ds["X"][3]
    js = run_node(f"""
      const Q = require({json.dumps(JS)});
      const ds = {json.dumps(ds)};
      const e = Q.encode({json.dumps(enc)}, {json.dumps(raw)}, ds);
      const r = Q.stateReport(e.n, e.gates);
      const ev = Q.evaluate({json.dumps(enc)}, ds);
      console.log(JSON.stringify({{sv: r.statevector, bloch: r.bloch, ev}}));
    """)
    n, gates, _ = encode(enc, raw, ds)
    psi = simulate(n, gates)
    assert np.allclose(np.array(js["sv"])[:, 0] + 1j * np.array(js["sv"])[:, 1], psi, atol=1e-9)
    py = evaluate(enc, ds)
    for key in ("train_accuracy", "test_accuracy", "baseline_test_accuracy", "predictions"):
        assert js["ev"][key] == py[key], key
    assert np.allclose(js["ev"]["kernel"], py["kernel"], atol=1e-3)
