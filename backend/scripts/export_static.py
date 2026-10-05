"""Write the datasets and encoding metadata to frontend/data/ as static JSON.

The frontend loads these when no Python backend is reachable (e.g. on GitHub
Pages) and runs its own JavaScript simulator instead. Re-run after changing
any dataset:  python backend/scripts/export_static.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from qml_encodings import all_datasets, encoding_metadata  # noqa: E402

OUT = os.path.join(HERE, "..", "..", "frontend", "data")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, payload in (("datasets.json", all_datasets()), ("encodings.json", encoding_metadata())):
        with open(os.path.join(OUT, name), "w") as f:
            json.dump(payload, f, separators=(",", ":"))
        print("wrote", os.path.normpath(os.path.join(OUT, name)))
