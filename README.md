# Quantum Data Encoding Labs 

An interactive teaching site, built for a guest lecture, that shows the six main ways to load classical data
into a quantum computer for quantum machine learning:

| # | Encoding | Demo dataset (synthetic, seeded) | Why that dataset |
|---|----------|----------------------------------|------------------|
| 1 | **Basis** | Mini-Zoo: 4 yes/no animal traits → mammal? | Bits map directly onto basis states |
| 2 | **Angle** | Fruit ripeness: sugar & firmness (0–10) | Bounded readings map onto rotation angles |
| 3 | **Phase** | Coastal fog alerts: wind direction & hour of day | Periodic features: phase encoding wraps around at 2π |
| 4 | **Amplitude** | Bars & Stripes 4×4 images | 16 pixels fit in the amplitudes of 4 qubits |
| 5 | **Hamiltonian** | Ising spin-chain phases: coupling J & field h | The features are Hamiltonian parameters |
| 6 | **IQP** | XOR quadrants | The class depends on x₁·x₂, the product term in IQP's ZZ phases |

For every encoding the page shows:

1. **Concept**: formula, step-by-step recipe, strengths and limits.
2. **Encode one point**: pick a sample or move the sliders, toggles or pixels, then see the **circuit**, the **state
   vector** (amplitudes and phase dials), the **measurement probabilities** and a **Bloch sphere per qubit**
   (a vector shorter than 1 means the qubit is entangled).
3. **Quantum kernel and classifier**: the fidelity kernel k(x,x′) = |⟨ψ(x)|ψ(x′)⟩|² over the whole dataset, a
   kernel-ridge classifier with train and test accuracy, a **linear classical baseline**, and decision regions.
4. **"Try this in class"** prompts for the lecture.

## Monorepo layout

```
.
├── backend/                     Python (Flask + NumPy)
│   ├── app.py                   REST API; also serves the frontend locally
│   ├── qml_encodings/
│   │   ├── simulator.py         State-vector simulator, Bloch vectors
│   │   ├── encodings.py         The six encoding circuits and their metadata
│   │   ├── datasets.py          Synthetic datasets, one per encoding
│   │   └── kernels.py           Fidelity kernel, kernel-ridge classifier, baseline
│   ├── scripts/export_static.py Writes the datasets to frontend/data/ for static hosting
│   ├── tests/                   pytest (physics checks, API, JS-vs-Python parity)
│   └── requirements.txt
├── frontend/                    Plain HTML / CSS / JavaScript, no build step
│   ├── index.html
│   ├── css/styles.css
│   ├── js/quantum.js            JavaScript port of the simulator (offline / GitHub Pages)
│   ├── js/engine.js             Uses the Python API when reachable, else the JS port
│   ├── js/viz.js                SVG circuits, Bloch spheres, charts
│   ├── js/content.js            Lecture text
│   ├── js/app.js                Pages and interaction
│   └── data/                    Exported datasets and metadata (JSON)
├── vercel.json                  Vercel services: "frontend" (static) + "backend" (Flask)
└── .github/workflows/           GitHub Pages deployment and tests
```

## Run locally

```bash
pip install -r backend/requirements.txt
python backend/app.py            # http://localhost:5000
```

Frontend only, no Python needed (it switches to the in-browser engine):

```bash
python -m http.server 8000 -d frontend   # http://localhost:8000
```

The **Engine** menu in the top bar shows which engine is running and lets you switch between them. Use **A− / A+**
to resize text for a projector, and ◐ for dark mode.

## Deploy

### Vercel (frontend + Python backend)

`vercel.json` defines one Vercel project with two **services**:

| Service | Root | Public path |
|---------|------|-------------|
| `backend` | `backend/` (Flask, `app.py`) | `/api/*` |
| `frontend` | `frontend/` (static files) | everything else |

The browser calls the API on the same domain (`api/...`), so neither service calls the other server-side and no
bindings are needed. Test locally with `vercel dev`, then import the repository in Vercel and deploy.

### GitHub Pages (frontend only)

1. In the repository go to **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. `.github/workflows/pages.yml` publishes `frontend/`.

There is no Python server on Pages, so the site uses `js/quantum.js`, which gives the same results
(checked by `backend/tests/test_js_parity.py`). To use a Vercel backend from the Pages site anyway,
open `https://<user>.github.io/<repo>/?api=https://<your-app>.vercel.app`.

## API

| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET | `/api/health` | | `{status, engine}` |
| GET | `/api/encodings` | | encoding metadata |
| GET | `/api/datasets[/<id>]` | | datasets |
| POST | `/api/encode` | `{encoding, x: [raw features], options?}` | gates, state vector, probabilities, Bloch vectors |
| POST | `/api/evaluate` | `{encoding, options?}` | kernel matrix, accuracies, baseline, decision grid |
| POST | `/api/superposition` | `{rows: [[bits]]}` | the whole dataset basis-encoded in superposition |

`options` is currently `{"reps": 1-3}` for IQP.

## Tests

```bash
pip install pytest
python -m pytest -q backend/tests
```

If you change a dataset, run `python backend/scripts/export_static.py` to refresh `frontend/data/`.
A test fails if the exported copy is out of date.

## References

- M. Schuld & F. Petruccione, *Machine Learning with Quantum Computers* (2021): basis, angle and amplitude encoding.
- V. Havlíček et al., "Supervised learning with quantum-enhanced feature spaces", *Nature* 567, 209 (2019): IQP / ZZ feature map.
- M. Möttönen et al., "Transformation of quantum states using uniformly controlled rotations" (2004): amplitude state preparation.
- M. Schuld & N. Killoran, "Quantum machine learning in feature Hilbert spaces", *PRL* 122, 040504 (2019): quantum kernels.
