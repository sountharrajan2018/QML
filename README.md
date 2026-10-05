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

Written for UG and PG students and for faculty. Every encoding is an **8-step interactive lesson**. The main text uses
plain language and a short scenario, and collapsible **Deeper maths** boxes hold the derivations and references.

| Step | What you do |
|------|-------------|
| 1. Idea | A scenario, the big idea, an analogy and the formula explained term by term |
| 2. Data | Explore the dataset and pick sample A |
| 3. Prepare | Edit sample A (sliders, bit toggles, pixel editor) and follow a live worked calculation |
| 4. Circuit | Step through the circuit **gate by gate** (or press Play): state vector, Bloch spheres and a plain-language note on each gate |
| 5. Measure | Simulate 10–10,000 **shots** in the Z or X basis and compare with the exact probabilities |
| 6. Similarity | Pick samples A and B, see their kernel value k(A,B) = \|⟨ψ(A)\|ψ(B)⟩\|², check it against the closed form, slide B along a feature, list A's nearest neighbours |
| 7. Classify | Kernel matrix, a kernel classifier's train/test accuracy against a **linear classical baseline**, decision regions |
| 8. Recap & quiz | Takeaway, strengths and limits, a 3-question quiz with explanations, and tested **Qiskit** code |

Other features: deep links to any step (`#phase/4`), <kbd>←</kbd>/<kbd>→</kbd> keys between steps, hover definitions for
dotted terms, an encoding chooser on the overview page, a qubit and gate cost calculator on the comparison page,
dark mode and A−/A+ text size for projectors.

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
│   ├── tests/                   pytest (physics checks, API, JS-vs-Python parity, Qiskit snippets)
│   └── requirements.txt
├── frontend/                    Plain HTML / CSS / JavaScript, no build step
│   ├── index.html
│   ├── css/styles.css
│   ├── js/quantum.js            JavaScript port of the simulator (offline / GitHub Pages)
│   ├── js/engine.js             Uses the Python API when reachable, else the JS port
│   ├── js/viz.js                SVG circuits, Bloch spheres, charts
│   ├── js/content.js            Lesson text, quizzes, Qiskit snippets, glossary
│   ├── js/lesson.js             The 8-step lesson page for each encoding
│   ├── js/util.js               Shared helpers
│   ├── js/app.js                Routing, overview and comparison pages
│   └── data/                    Exported datasets and metadata (JSON)
└── .github/workflows/pages.yml  Runs the tests, then publishes frontend/ to GitHub Pages
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

## Deploy to GitHub Pages

The published site is the `frontend/` folder only. GitHub Pages cannot run Python, so on Pages the site uses
`js/quantum.js`, a JavaScript port of the backend that gives the same results (checked by
`backend/tests/test_js_parity.py`). The backend is for local use and for the API.

One-time setup:

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to **Actions → Test and deploy to GitHub Pages → Run workflow**, or push to the default branch.

`.github/workflows/pages.yml` runs the tests first and deploys only if they pass. The site appears at
`https://<user>.github.io/<repo>/`.

If you change a dataset in `backend/qml_encodings/datasets.py`, run `python backend/scripts/export_static.py`
before pushing so `frontend/data/` matches. The tests fail, and nothing deploys, until you do.

To use a running Python backend from the Pages site, add `?api=https://<your-backend>` to the URL.

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
pip install pytest qiskit      # qiskit is optional: without it the snippet tests are skipped
python -m pytest -q backend/tests
```

If you change a dataset, run `python backend/scripts/export_static.py` to refresh `frontend/data/`.
A test fails if the exported copy is out of date.

## References

- M. Schuld & F. Petruccione, *Machine Learning with Quantum Computers* (2021): basis, angle and amplitude encoding.
- V. Havlíček et al., "Supervised learning with quantum-enhanced feature spaces", *Nature* 567, 209 (2019): IQP / ZZ feature map.
- M. Möttönen et al., "Transformation of quantum states using uniformly controlled rotations" (2004): amplitude state preparation.
- M. Schuld & N. Killoran, "Quantum machine learning in feature Hilbert spaces", *PRL* 122, 040504 (2019): quantum kernels.
