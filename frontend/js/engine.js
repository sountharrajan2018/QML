/*
 * Engine: talks to the Python API when it is reachable and falls back to the
 * in-browser QuantumJS port otherwise (GitHub Pages, offline lecture hall).
 *
 * API location: same origin by default ("api/..."). On GitHub Pages there is
 * no backend, so the JS engine is used; point the page at a running backend
 * with ?api=https://your-backend.example.com
 */
(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  const API_BASE = (params.get("api") || "").replace(/\/$/, "");
  const url = (p) => (API_BASE ? `${API_BASE}/api/${p}` : `api/${p}`);
  // Static hosts (GitHub Pages) have no backend: skip the probe unless ?api= points at one.
  const STATIC_HOST = /\.github\.io$/.test(location.hostname) || location.protocol === "file:";

  const state = { mode: "auto", pythonOk: false, datasets: null, encodings: null, cache: new Map() };

  async function fetchJSON(path, opts = {}, timeout = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(path, { ...opts, signal: ctrl.signal });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || r.statusText);
      return body;
    } finally {
      clearTimeout(t);
    }
  }

  const post = (p, body) => fetchJSON(url(p), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }, 30000);

  async function init() {
    if (!STATIC_HOST || API_BASE) {
      try {
        const h = await fetchJSON(url("health"), {}, 3000);
        state.pythonOk = h.status === "ok";
      } catch (_) {
        state.pythonOk = false;
      }
    }
    const usePy = state.pythonOk;
    state.datasets = await (usePy ? fetchJSON(url("datasets")) : fetchJSON("data/datasets.json"));
    state.encodings = await (usePy ? fetchJSON(url("encodings")) : fetchJSON("data/encodings.json"));
    return state;
  }

  const usingPython = () => state.mode === "python" || (state.mode === "auto" && state.pythonOk);

  function setMode(m) {
    state.mode = m;
    state.cache.clear();
  }

  function datasetFor(enc) {
    const meta = state.encodings.find((e) => e.id === enc);
    return state.datasets[meta.dataset];
  }

  async function encode(enc, raw, options) {
    if (usingPython()) return post("encode", { encoding: enc, x: raw, options });
    const ds = datasetFor(enc);
    const e = QuantumJS.encode(enc, raw, ds, options);
    return { ...QuantumJS.stateReport(e.n, e.gates), encoded_values: e.x };
  }

  async function evaluate(enc, options) {
    const key = `${usingPython() ? "py" : "js"}:${enc}:${JSON.stringify(options || {})}`;
    if (state.cache.has(key)) return state.cache.get(key);
    const res = usingPython() ? await post("evaluate", { encoding: enc, options })
      : QuantumJS.evaluate(enc, datasetFor(enc), options);
    state.cache.set(key, res);
    return res;
  }

  async function superposition(rows) {
    return usingPython() ? post("superposition", { rows }) : QuantumJS.superposition(rows);
  }

  window.Engine = { init, state, setMode, usingPython, datasetFor, encode, evaluate, superposition };
})();
