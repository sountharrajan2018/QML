"""The Qiskit code shown in each lesson's recap step must run as printed."""
import json
import os
import shutil
import subprocess
import sys

import pytest

pytest.importorskip("qiskit")
pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")

CONTENT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend", "js", "content.js")


def snippets() -> dict:
    script = f"global.window = {{}}; require({json.dumps(CONTENT)}); " \
             "console.log(JSON.stringify(Object.fromEntries(Object.entries(window.CONTENT).map(([k, v]) => [k, v.qiskit]))));"
    out = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


@pytest.mark.parametrize("encoding", ["basis", "angle", "phase", "amplitude", "hamiltonian", "iqp"])
def test_snippet_runs(encoding):
    code = snippets()[encoding]
    run = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=120)
    assert run.returncode == 0, run.stderr
    if encoding == "basis":
        assert "0101" in run.stdout and "1.0" in run.stdout
    if encoding == "amplitude":
        assert run.stdout.strip() == "True"
