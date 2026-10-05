/*
 * In-browser port of backend/qml_encodings (simulator, encoders, kernel).
 * Used when the Python API is unreachable, e.g. on GitHub Pages.
 * Keep it in step with the Python code; backend/tests/test_js_parity.py checks
 * that both give the same results.
 *
 * Conventions match the backend: qubit 0 is the left-most bit of a ket and a
 * circuit is a list of {gate, targets, controls?, ctrl_state?, params?}.
 */
(function (root) {
  "use strict";
  const PI = Math.PI;
  const SQ2 = Math.SQRT1_2;

  // ------------------------------------------------------------ simulator
  // A state is {re: Float64Array, im: Float64Array}.

  function singleQubitMatrix(name, params) {
    const t = params && params.length ? params[0] : 0;
    const c = Math.cos(t / 2), s = Math.sin(t / 2);
    // [[a, b], [c, d]] with complex entries as [re, im]
    switch (name) {
      case "H": return [[SQ2, 0], [SQ2, 0], [SQ2, 0], [-SQ2, 0]];
      case "X": case "CNOT": return [[0, 0], [1, 0], [1, 0], [0, 0]];
      case "RX": return [[c, 0], [0, -s], [0, -s], [c, 0]];
      case "RY": case "MCRY": return [[c, 0], [-s, 0], [s, 0], [c, 0]];
      case "RZ": return [[Math.cos(-t / 2), Math.sin(-t / 2)], [0, 0], [0, 0], [Math.cos(t / 2), Math.sin(t / 2)]];
      case "P": return [[1, 0], [0, 0], [0, 0], [Math.cos(t), Math.sin(t)]];
      default: throw new Error("Unknown gate " + name);
    }
  }

  const bit = (i, q, n) => (i >> (n - 1 - q)) & 1;

  function applyGate(st, g, n) {
    const N = 1 << n;
    const params = g.params || [];
    const re = st.re, im = st.im;
    if (g.gate === "PREP") {
      let norm = 0;
      for (const v of params) norm += v * v;
      norm = Math.sqrt(norm);
      for (let i = 0; i < N; i++) { re[i] = params[i] / norm; im[i] = 0; }
      return;
    }
    if (g.gate === "SIGN") {
      for (let i = 0; i < N; i++) { re[i] *= params[i]; im[i] *= params[i]; }
      return;
    }
    if (g.gate === "RZZ") {
      const [a, b] = g.targets;
      for (let i = 0; i < N; i++) {
        const z = (1 - 2 * bit(i, a, n)) * (1 - 2 * bit(i, b, n));
        const ph = -params[0] / 2 * z, c = Math.cos(ph), s = Math.sin(ph);
        const r = re[i], m = im[i];
        re[i] = r * c - m * s; im[i] = r * s + m * c;
      }
      return;
    }
    const u = singleQubitMatrix(g.gate, params);
    const t = g.targets[0];
    const controls = g.controls || [];
    const ctrl = g.ctrl_state || controls.map(() => 1);
    const tmask = 1 << (n - 1 - t);
    for (let i0 = 0; i0 < N; i0++) {
      if (i0 & tmask) continue;
      let fire = true;
      for (let k = 0; k < controls.length; k++) if (bit(i0, controls[k], n) !== ctrl[k]) { fire = false; break; }
      if (!fire) continue;
      const i1 = i0 | tmask;
      const ar = re[i0], ai = im[i0], br = re[i1], bi = im[i1];
      re[i0] = u[0][0] * ar - u[0][1] * ai + u[1][0] * br - u[1][1] * bi;
      im[i0] = u[0][0] * ai + u[0][1] * ar + u[1][0] * bi + u[1][1] * br;
      re[i1] = u[2][0] * ar - u[2][1] * ai + u[3][0] * br - u[3][1] * bi;
      im[i1] = u[2][0] * ai + u[2][1] * ar + u[3][0] * bi + u[3][1] * br;
    }
  }

  function simulate(n, gates) {
    const N = 1 << n;
    const st = { re: new Float64Array(N), im: new Float64Array(N) };
    st.re[0] = 1;
    for (const g of gates) applyGate(st, g, n);
    return st;
  }

  function blochVectors(st, n) {
    const N = 1 << n, out = [];
    for (let q = 0; q < n; q++) {
      const m = 1 << (n - 1 - q);
      let r00 = 0, r11 = 0, r01r = 0, r01i = 0;
      for (let i = 0; i < N; i++) {
        if (i & m) continue;
        const j = i | m;
        r00 += st.re[i] ** 2 + st.im[i] ** 2;
        r11 += st.re[j] ** 2 + st.im[j] ** 2;
        // rho01 = sum a_i * conj(a_j)
        r01r += st.re[i] * st.re[j] + st.im[i] * st.im[j];
        r01i += st.im[i] * st.re[j] - st.re[i] * st.im[j];
      }
      const purity = r00 * r00 + r11 * r11 + 2 * (r01r * r01r + r01i * r01i);
      out.push({ x: 2 * r01r, y: -2 * r01i, z: r00 - r11, purity });
    }
    return out;
  }

  function stateReport(n, gates) {
    const st = simulate(n, gates);
    const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
    const sv = [], probs = [];
    for (let i = 0; i < 1 << n; i++) {
      sv.push([clean(st.re[i]), clean(st.im[i])]);
      probs.push(st.re[i] ** 2 + st.im[i] ** 2);
    }
    return { n_qubits: n, gates, statevector: sv, probabilities: probs, bloch: blochVectors(st, n) };
  }

  // ------------------------------------------------------------ encodings

  const rescale = (raw, ranges, lo, hi) =>
    raw.map((v, i) => lo + (hi - lo) * (v - ranges[i][0]) / (ranges[i][1] - ranges[i][0]));

  const HAM = { qubits: 3, time: 1.0, steps: 2 };
  const IQP_REPS = 1;

  const ENCODERS = {
    basis: {
      prepare: (raw) => raw.map((v) => (v >= 0.5 ? 1 : 0)),
      circuit: (x) => [x.length, x.flatMap((b, q) => (b ? [{ gate: "X", targets: [q] }] : []))],
    },
    angle: {
      prepare: (raw, ds) => rescale(raw, ds.feature_ranges, 0, PI),
      circuit: (x) => [x.length, x.map((t, q) => ({ gate: "RY", targets: [q], params: [t] }))],
    },
    phase: {
      prepare: (raw, ds) => rescale(raw, ds.feature_ranges, 0, 2 * PI),
      circuit: (x) => [x.length, [
        ...x.map((_, q) => ({ gate: "H", targets: [q] })),
        ...x.map((t, q) => ({ gate: "P", targets: [q], params: [t] })),
      ]],
    },
    amplitude: {
      prepare: (raw) => {
        const size = 1 << Math.max(1, Math.ceil(Math.log2(raw.length)));
        const v = raw.concat(new Array(size - raw.length).fill(0));
        let norm = Math.sqrt(v.reduce((s, a) => s + a * a, 0));
        if (norm === 0) { v[0] = 1; norm = 1; }
        return v.map((a) => a / norm);
      },
      circuit: (a) => {
        const n = Math.round(Math.log2(a.length));
        const mag2 = a.map((v) => v * v), gates = [];
        for (let k = 0; k < n; k++) {
          const block = 1 << (n - k);
          for (let p = 0; p < 1 << k; p++) {
            let left = 0, right = 0;
            for (let i = 0; i < block; i++) {
              const v = mag2[p * block + i];
              if (i < block / 2) left += v; else right += v;
            }
            const theta = 2 * Math.atan2(Math.sqrt(right), Math.sqrt(left));
            if (k === 0) gates.push({ gate: "RY", targets: [0], params: [theta] });
            else {
              const bits = [];
              for (let j = 0; j < k; j++) bits.push((p >> (k - 1 - j)) & 1);
              gates.push({ gate: "MCRY", targets: [k], controls: [...Array(k).keys()], ctrl_state: bits, params: [theta] });
            }
          }
        }
        if (a.some((v) => v < 0))
          gates.push({ gate: "SIGN", targets: [...Array(n).keys()], params: a.map((v) => (v < 0 ? -1 : 1)) });
        return [n, gates];
      },
    },
    hamiltonian: {
      prepare: (raw) => raw.slice(),
      circuit: ([J, h]) => {
        const n = HAM.qubits, dt = HAM.time / HAM.steps, gates = [];
        for (let q = 0; q < n; q++) gates.push({ gate: "H", targets: [q] });
        for (let s = 0; s < HAM.steps; s++) {
          for (let q = 0; q < n - 1; q++) gates.push({ gate: "RZZ", targets: [q, q + 1], params: [-2 * J * dt] });
          for (let q = 0; q < n; q++) gates.push({ gate: "RX", targets: [q], params: [-2 * h * dt] });
        }
        return [n, gates];
      },
    },
    iqp: {
      prepare: (raw, ds) => rescale(raw, ds.feature_ranges, 0, PI),
      circuit: (x, opts) => {
        const n = x.length, reps = (opts && +opts.reps) || IQP_REPS, gates = [];
        for (let r = 0; r < reps; r++) {
          for (let q = 0; q < n; q++) gates.push({ gate: "H", targets: [q] });
          for (let q = 0; q < n; q++) gates.push({ gate: "RZ", targets: [q], params: [2 * x[q]] });
          for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++)
              gates.push({ gate: "RZZ", targets: [i, j], params: [2 * (PI - x[i]) * (PI - x[j])] });
        }
        return [n, gates];
      },
    },
  };

  function encode(enc, raw, ds, opts) {
    const e = ENCODERS[enc];
    const x = e.prepare(raw.map(Number), ds);
    const [n, gates] = e.circuit(x, opts);
    return { n, gates, x };
  }

  // ------------------------------------------------------------ kernel + classifier

  const RIDGE = 1e-2, GRID = 30;

  function fidelity(a, b) {
    let r = 0, i = 0;
    for (let k = 0; k < a.re.length; k++) {
      r += a.re[k] * b.re[k] + a.im[k] * b.im[k];
      i += a.re[k] * b.im[k] - a.im[k] * b.re[k];
    }
    return r * r + i * i;
  }

  function solve(A, b) { // Gaussian elimination with partial pivoting
    const n = b.length, M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = c + 1; r < n; r++) {
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
      }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) {
      let s = M[r][n];
      for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
      x[r] = s / M[r][r];
    }
    return x;
  }

  function fitAlpha(Ktr, ypm) {
    return solve(Ktr.map((row, i) => row.map((v, j) => v + (i === j ? RIDGE : 0))), ypm);
  }
  const dot = (row, alpha) => row.reduce((s, v, i) => s + v * alpha[i], 0);
  const accuracy = (scores, y) => scores.filter((s, i) => (s > 0 ? 1 : 0) === y[i]).length / y.length;
  const round4 = (v) => Math.round(v * 1e4) / 1e4;

  function evaluate(enc, ds, opts) {
    const X = ds.X, y = ds.y;
    const tr = [], te = [];
    ds.split.forEach((s, i) => (s === "train" ? tr : te).push(i));
    const ypm = tr.map((i) => 2 * y[i] - 1);
    const S = X.map((raw) => { const e = encode(enc, raw, ds, opts); return simulate(e.n, e.gates); });
    const K = S.map((a) => S.map((b) => fidelity(a, b)));
    const sub = (M, rows, cols) => rows.map((i) => cols.map((j) => M[i][j]));
    const alpha = fitAlpha(sub(K, tr, tr), ypm);

    const ranges = ds.feature_ranges;
    const Z = X.map((r) => [...r.map((v, k) => (v - ranges[k][0]) / (ranges[k][1] - ranges[k][0])), 1]);
    const L = Z.map((a) => Z.map((b) => a.reduce((s, v, k) => s + v * b[k], 0)));
    const beta = fitAlpha(sub(L, tr, tr), ypm);

    const allScores = K.map((row) => dot(tr.map((j) => row[j]), alpha));
    const result = {
      encoding: enc,
      dataset: ds.id,
      kernel: K.map((r) => r.map(round4)),
      train_accuracy: accuracy(tr.map((i) => allScores[i]), tr.map((i) => y[i])),
      test_accuracy: accuracy(te.map((i) => allScores[i]), te.map((i) => y[i])),
      baseline_test_accuracy: accuracy(te.map((i) => dot(tr.map((j) => L[i][j]), beta)), te.map((i) => y[i])),
      predictions: allScores.map((s) => (s > 0 ? 1 : 0)),
      grid: null,
    };
    if (X[0].length === 2) {
      const lin = ([a, b]) => [...Array(GRID).keys()].map((k) => a + (b - a) * k / (GRID - 1));
      const gx = lin(ranges[0]), gy = lin(ranges[1]), scores = [];
      for (const v of gy) for (const u of gx) {
        const e = encode(enc, [u, v], ds, opts), st = simulate(e.n, e.gates);
        scores.push(round4(tr.reduce((s, j, k) => s + fidelity(st, S[j]) * alpha[k], 0)));
      }
      result.grid = { size: GRID, x: gx, y: gy, scores };
    }
    return result;
  }

  function superposition(rows) {
    const n = rows[0].length, amp = new Array(1 << n).fill(0);
    for (const r of rows) amp[parseInt(r.map((b) => (b >= 0.5 ? "1" : "0")).join(""), 2)] += 1;
    // sqrt(count) amplitudes: measuring gives each record with its empirical frequency
    return stateReport(n, [{ gate: "PREP", targets: [...Array(n).keys()], params: amp.map((a) => Math.sqrt(a / rows.length)) }]);
  }

  const api = { simulate, stateReport, blochVectors, encode, evaluate, superposition, ENCODERS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.QuantumJS = api;
})(typeof window !== "undefined" ? window : globalThis);
