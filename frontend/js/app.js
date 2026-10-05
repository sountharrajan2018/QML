/* Page rendering and interaction. */
(function () {
  "use strict";
  const ORDER = ["basis", "angle", "phase", "amplitude", "hamiltonian", "iqp"];
  const $ = (sel, root = document) => root.querySelector(sel);
  const view = $("#view");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* private mode */ } },
  };
  const pct = (v) => `${Math.round(v * 100)}%`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let renderToken = 0;

  // ------------------------------------------------------------ chrome: theme, font, engine, nav
  function initChrome() {
    const root = document.documentElement;
    const theme = store.get("qml-theme");
    if (theme) root.dataset.theme = theme;
    $("#themeBtn").addEventListener("click", () => {
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      store.set("qml-theme", root.dataset.theme);
      route();
    });
    let size = +store.get("qml-font") || 16;
    const applySize = () => { root.style.setProperty("--base-size", size + "px"); store.set("qml-font", size); };
    applySize();
    $("#fontUp").addEventListener("click", () => { size = Math.min(24, size + 1); applySize(); });
    $("#fontDown").addEventListener("click", () => { size = Math.max(13, size - 1); applySize(); });
    $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    $("#sidebar").addEventListener("click", (e) => { if (e.target.closest("a")) $("#sidebar").classList.remove("open"); });
    $("#engineSelect").addEventListener("change", (e) => { Engine.setMode(e.target.value); updateEngineBadge(); route(); });
    window.addEventListener("hashchange", route);
  }

  function updateEngineBadge() {
    const py = Engine.usingPython();
    $("#engineDot").className = "engine-dot " + (py ? "py" : "js");
    $("#engineNote").innerHTML = py
      ? "Simulations run on the <b>Python / NumPy backend</b>."
      : `Simulations run <b>in your browser</b> (JavaScript port of the backend).${Engine.state.pythonOk ? "" : " The Python API was not reachable, which is expected on GitHub Pages."}`;
    const opt = $('#engineSelect option[value="python"]');
    opt.disabled = !Engine.state.pythonOk;
    opt.textContent = Engine.state.pythonOk ? "Python API" : "Python API (offline)";
  }

  function route() {
    const id = (location.hash || "#overview").slice(1);
    document.querySelectorAll(".sidebar a").forEach((a) => a.classList.toggle("active", a.dataset.view === id));
    Viz.hideTip();
    renderToken++;
    if (ORDER.includes(id)) renderEncoding(id);
    else if (id === "compare") renderCompare();
    else renderOverview();
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  const meta = (id) => Engine.state.encodings.find((e) => e.id === id);

  // ------------------------------------------------------------ overview
  function renderOverview() {
    const cards = ORDER.map((id) => {
      const m = meta(id), c = CONTENT[id], ds = Engine.state.datasets[m.dataset];
      return `<a class="card enc-card" href="#${id}">
        <h3><span class="num">${c.num}</span> ${m.name}</h3>
        <p class="sub">${c.tagline}</p>
        <div class="chips"><span class="chip">${m.data_type}</span><span class="chip">${m.qubits}</span></div>
        <p style="margin:0;font-size:.88rem;color:var(--text-secondary)">Demo dataset: <b>${esc(ds.title)}</b></p>
      </a>`;
    }).join("");
    view.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Guest lecture &middot; Quantum Machine Learning</div>
        <h1>How do we get classical data into a quantum computer?</h1>
        <p class="lead">A quantum model can only learn from data it can see. <b>Data encoding</b> (also called a
        <i>feature map</i> or <i>embedding</i>) is the circuit U(x) that turns a classical vector x into a quantum
        state |&psi;(x)&rang;. The choice of encoding decides how many qubits you need, how deep the circuit is and,
        most importantly, which patterns the model is able to learn.</p>
      </section>
      <div class="flow" aria-label="QML pipeline">
        <div class="node"><b>x</b><small>classical data</small></div><div class="arrow">&rarr;</div>
        <div class="node"><b>U(x)</b><small>encoding circuit</small></div><div class="arrow">&rarr;</div>
        <div class="node"><b>|&psi;(x)&rang;</b><small>quantum state</small></div><div class="arrow">&rarr;</div>
        <div class="node"><b>k(x,x&prime;) = |&lang;&psi;(x)|&psi;(x&prime;)&rang;|<sup>2</sup></b><small>quantum kernel</small></div><div class="arrow">&rarr;</div>
        <div class="node"><b>&#375;</b><small>prediction</small></div>
      </div>
      <div class="callout"><strong>How every demo works.</strong> Each encoding comes with a synthetic dataset chosen
      to suit it. You can (1) explore the data, (2) encode a single point and inspect its circuit, amplitudes,
      probabilities and Bloch spheres, then (3) build the <b>fidelity quantum kernel</b> over the whole dataset and train a
      kernel classifier, compared against a classical linear baseline.</div>
      <h2 class="section-title">The six encodings</h2>
      <div class="grid grid-3">${cards}</div>
      <div class="footer-nav"><span></span><a class="btn" href="#basis">Start with basis encoding &rarr;</a></div>`;
  }

  // ------------------------------------------------------------ comparison
  async function renderCompare() {
    const token = renderToken;
    const rows = ORDER.map((id) => {
      const m = meta(id), ds = Engine.state.datasets[m.dataset];
      return `<tr><td><a href="#${id}"><b>${m.name}</b></a></td><td>${m.data_type}</td><td>${m.qubits}</td>
        <td>${m.depth}</td><td>${esc(ds.title)}</td><td class="num" id="acc-${id}">&hellip;</td><td class="num" id="base-${id}">&hellip;</td></tr>`;
    }).join("");
    const pc = ORDER.map((id) => {
      const m = meta(id);
      return `<div class="card"><h3>${m.name}</h3>
        <ul class="tight pros">${m.pros.map((p) => `<li>${p}</li>`).join("")}</ul>
        <ul class="tight cons" style="margin-top:6px">${m.cons.map((p) => `<li>${p}</li>`).join("")}</ul></div>`;
    }).join("");
    view.innerHTML = `
      <section class="hero"><div class="eyebrow">Wrap-up</div><h1>Choosing an encoding</h1>
      <p class="lead">No encoding is best for everything. Match the encoding to the <b>structure of your data</b> and to the
      circuit depth your hardware can afford.</p></section>
      <div class="card"><div class="table-wrap" style="max-height:none"><table class="data">
        <thead><tr><th>Encoding</th><th>Data type</th><th>Qubits</th><th>Depth</th><th>Demo dataset</th><th>Quantum kernel (test)</th><th>Linear baseline (test)</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
        <p class="sub" style="margin-top:10px">Accuracies use the same fidelity-kernel ridge classifier on each encoding's own dataset, so compare
        each row with its baseline, not rows with each other.</p></div>
      <div class="callout"><strong>Rules of thumb.</strong> Binary or categorical data: <b>basis</b>. A few bounded features
      on noisy hardware: <b>angle</b>. Periodic quantities: <b>phase</b>. Long vectors or images with few qubits:
      <b>amplitude</b>. Physical parameters: <b>Hamiltonian</b>. Feature interactions or a kernel that is hard to simulate classically: <b>IQP</b>.</div>
      <h2 class="section-title">Trade-offs</h2>
      <div class="grid grid-3">${pc}</div>`;
    for (const id of ORDER) {
      try {
        const r = await Engine.evaluate(id);
        if (token !== renderToken) return;
        $(`#acc-${id}`).textContent = pct(r.test_accuracy);
        $(`#base-${id}`).textContent = pct(r.baseline_test_accuracy);
      } catch (e) {
        if (token !== renderToken) return;
        $(`#acc-${id}`).innerHTML = `<span class="error">error</span>`;
      }
    }
  }

  // ------------------------------------------------------------ encoding page
  function renderEncoding(id) {
    const token = renderToken;
    const m = meta(id), c = CONTENT[id], ds = Engine.datasetFor(id);
    const idx = ORDER.indexOf(id);
    const prev = ORDER[idx - 1], next = ORDER[idx + 1];
    const nTrain = ds.split.filter((s) => s === "train").length;
    const s = { id, ds, seq: 0, selected: ds.split.indexOf("train"), raw: null, options: id === "iqp" ? { reps: 1 } : undefined };
    s.raw = ds.X[s.selected].slice();

    view.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Encoding ${c.num} of 6</div>
        <h1>${m.name}</h1>
        <p class="lead">${c.tagline}</p>
        <div class="formula">${c.formula}</div>
        <div class="chips"><span class="chip">${m.data_type}</span><span class="chip">${m.qubits}</span><span class="chip">Depth: ${m.depth}</span></div>
      </section>
      <div class="grid grid-2">
        <div class="card"><h3>How it works</h3><ol class="tight">${c.how.map((h) => `<li>${h}</li>`).join("")}</ol></div>
        <div class="card"><h3>Dataset: ${esc(ds.title)}</h3>
          <p>${esc(ds.story)}</p>
          <div class="chips"><span class="chip">${ds.X.length} samples (${nTrain} train / ${ds.X.length - nTrain} test)</span>
          <span class="chip">${ds.feature_names.length} features</span><span class="chip">classes: ${ds.class_names.map(esc).join(" vs ")}</span>
          <span class="chip">synthetic, seeded</span></div>
          <div class="callout"><strong>Why this dataset?</strong> ${c.why}</div></div>
      </div>

      <h2 class="section-title"><span class="step">Step 1</span> Pick a data point and encode it</h2>
      <div class="grid grid-2">
        <div class="card"><h3>The data</h3><p class="sub">Click any sample to load it into the encoder.</p><div id="dataView"></div></div>
        <div class="card"><h3>Encoder input</h3><p class="sub" id="selLabel"></p><div class="controls" id="controls"></div></div>
      </div>

      <h2 class="section-title"><span class="step">Step 2</span> Inspect the quantum state</h2>
      <div class="card"><h3>Encoding circuit U(x)</h3><p class="sub" id="circuitInfo"></p><div class="scroll-x" id="circuit"></div></div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="card"><h3>State vector |&psi;(x)&rang;</h3><p class="sub">Amplitude, phase (dial angle) and probability of each basis state.</p><div id="stateTable"></div></div>
        <div class="card"><h3>Measurement probabilities</h3><p class="sub">P(z) = |&lang;z|&psi;(x)&rang;|<sup>2</sup> when measuring in the computational basis.</p><div class="scroll-x" id="probs"></div></div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Bloch sphere of each qubit</h3><p class="sub">A vector shorter than 1 means the qubit is entangled with the others.</p><div id="bloch"></div></div>
      ${id === "basis" ? `<div class="card" style="margin-top:16px"><h3>Bonus: the whole training set in one state</h3>
        <p class="sub">|D&rang; = (1/&radic;M) &Sigma;<sub>m</sub> |x<sup>m</sup>&rang;: one register holds all ${nTrain} training records in superposition.</p>
        <button class="btn secondary" id="superBtn">Load training set in superposition</button><div id="superOut" style="margin-top:12px"></div></div>` : ""}

      <h2 class="section-title"><span class="step">Step 3</span> Quantum kernel &amp; classifier</h2>
      <div class="card">
        <p class="sub">k(x, x&prime;) = |&lang;&psi;(x)|&psi;(x&prime;)&rang;|<sup>2</sup> is computed for every pair of samples. A kernel ridge classifier is trained on the
        training split and scored on the held-out test split. The baseline is the same classifier with a linear kernel on the raw features.</p>
        ${id === "iqp" ? `<div class="select-row" style="margin-bottom:12px"><label for="repsSel"><b>Repetitions (reps)</b></label>
          <select id="repsSel"><option value="1">1 (default)</option><option value="2">2 (Havl&iacute;&ccaron;ek et al.)</option><option value="3">3</option></select></div>` : ""}
        <div class="stats" id="stats"><div class="loading">Computing kernel&hellip;</div></div>
        <div class="grid grid-2">
          <div><h3>Kernel matrix</h3><div id="heatmap"></div></div>
          <div><h3 id="resultTitle">Classifier result</h3><div id="result"></div></div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:16px">
        <div class="card"><h3>Try this in class</h3><ol class="try-list">${c.try.map((t) => `<li>${t}</li>`).join("")}</ol></div>
        <div class="card"><h3>Strengths &amp; limits</h3>
          <ul class="tight pros">${m.pros.map((p) => `<li>${p}</li>`).join("")}</ul>
          <ul class="tight cons" style="margin-top:6px">${m.cons.map((p) => `<li>${p}</li>`).join("")}</ul>
          <div class="callout"><strong>Takeaway.</strong> ${c.takeaway}</div></div>
      </div>
      <div class="footer-nav">
        ${prev ? `<a class="btn secondary" href="#${prev}">&larr; ${meta(prev).name}</a>` : `<a class="btn secondary" href="#overview">&larr; Overview</a>`}
        ${next ? `<a class="btn" href="#${next}">${meta(next).name} &rarr;</a>` : `<a class="btn" href="#compare">Comparison &rarr;</a>`}
      </div>`;

    let evalResult = null;
    const renderData = () => renderDataView(s, evalResult, pick);
    function pick(i) {
      s.selected = i;
      s.raw = ds.X[i].slice();
      renderControls(s, update);
      renderData();
      update();
    }

    let pending = null;
    async function update() {
      const my = ++s.seq;
      if (s.selected !== null) $("#selLabel").textContent = `Sample #${s.selected}${ds.names ? ` (${ds.names[s.selected]})` : ""}, ${ds.split[s.selected]} set, label: ${ds.class_names[ds.y[s.selected]]}`;
      else $("#selLabel").textContent = "Custom input (edited by hand)";
      try {
        const r = await Engine.encode(id, s.raw, s.options);
        if (token !== renderToken || my !== s.seq) return;
        Viz.circuit($("#circuit"), r.n_qubits, r.gates);
        $("#circuitInfo").textContent = `${r.n_qubits} qubits, ${r.gates.length} gates. Hover a gate for details.`;
        Viz.stateTable($("#stateTable"), r.statevector, r.n_qubits);
        Viz.probBars($("#probs"), r.probabilities, r.n_qubits);
        Viz.bloch($("#bloch"), r.bloch);
        renderEncodedValues(s, r);
      } catch (e) {
        if (token === renderToken) $("#circuit").innerHTML = `<p class="error">Encoding failed: ${esc(e.message)}</p>`;
      }
    }
    s.onEdit = () => {
      s.selected = null;
      renderData();
      clearTimeout(pending);
      pending = setTimeout(update, Engine.usingPython() ? 60 : 0);
    };

    async function runEval() {
      $("#stats").innerHTML = `<div class="loading">Computing kernel&hellip;</div>`;
      try {
        const r = await Engine.evaluate(id, s.options);
        if (token !== renderToken) return;
        evalResult = r;
        $("#stats").innerHTML = `
          <div class="stat"><div class="label">Train accuracy</div><div class="value">${pct(r.train_accuracy)}</div><div class="hint">quantum kernel</div></div>
          <div class="stat"><div class="label">Test accuracy</div><div class="value">${pct(r.test_accuracy)}</div><div class="hint">quantum kernel, unseen data</div></div>
          <div class="stat"><div class="label">Linear baseline</div><div class="value">${pct(r.baseline_test_accuracy)}</div><div class="hint">test accuracy, raw features</div></div>`;
        Viz.heatmap($("#heatmap"), r.kernel, ds);
        renderResult(s, r);
        renderData();
      } catch (e) {
        if (token === renderToken) $("#stats").innerHTML = `<p class="error">Kernel evaluation failed: ${esc(e.message)}</p>`;
      }
    }

    if (id === "iqp") $("#repsSel").addEventListener("change", (e) => { s.options = { reps: +e.target.value }; update(); runEval(); });
    if (id === "basis") $("#superBtn").addEventListener("click", async () => {
      const rows = ds.X.filter((_, i) => ds.split[i] === "train");
      const r = await Engine.superposition(rows);
      const out = $("#superOut");
      out.innerHTML = `<div class="grid grid-2"><div class="scroll-x" id="superBars"></div><div id="superCirc"></div></div>
        <p class="sub" style="margin-top:8px">Each bar is the fraction of training animals with that trait pattern.
        A single <i>State prep</i> block loads them (in general it needs a deep circuit, like amplitude encoding).</p>`;
      Viz.probBars($("#superBars"), r.probabilities, r.n_qubits);
      Viz.circuit($("#superCirc"), r.n_qubits, r.gates);
    });

    renderControls(s, update);
    renderData();
    update();
    runEval();
  }

  function renderEncodedValues(s, r) {
    const box = $("#encVals");
    if (!box) return;
    const v = r.encoded_values;
    if (s.id === "angle") box.innerHTML = v.map((t, i) => `&theta;<sub>${i}</sub> = ${t.toFixed(3)} rad`).join(" &nbsp; ");
    else if (s.id === "phase") box.innerHTML = v.map((t, i) => `&phi;<sub>${i}</sub> = ${t.toFixed(3)} rad (${(t * 180 / Math.PI).toFixed(0)}&deg;)`).join(" &nbsp; ");
    else if (s.id === "iqp") box.innerHTML = v.map((t, i) => `x<sub>${i}</sub> = ${t.toFixed(3)}`).join(" &nbsp; ") + ` &nbsp; ZZ angle 2(&pi;&minus;x<sub>0</sub>)(&pi;&minus;x<sub>1</sub>) = ${(2 * (Math.PI - v[0]) * (Math.PI - v[1])).toFixed(3)}`;
    else if (s.id === "hamiltonian") box.innerHTML = `H = &minus;${v[0].toFixed(2)} &Sigma; Z<sub>i</sub>Z<sub>i+1</sub> &minus; ${v[1].toFixed(2)} &Sigma; X<sub>i</sub> &nbsp; (${v[1] > v[0] ? "h &gt; J: disordered side" : "h &lt; J: ordered side"})`;
    else if (s.id === "basis") box.innerHTML = `|x&rang; = |${v.join("")}&rang; = basis state #${parseInt(v.join(""), 2)}`;
    else if (s.id === "amplitude") box.innerHTML = `&Vert;x&Vert; = ${Math.hypot(...s.raw).toFixed(3)} &rarr; amplitudes = pixels / &Vert;x&Vert;`;
  }

  // ------------------------------------------------------------ inputs per encoding
  function renderControls(s, update) {
    const box = $("#controls"), ds = s.ds;
    if (s.id === "basis") {
      box.innerHTML = `<div class="bit-toggles">${ds.feature_names.map((f, i) =>
        `<button class="bit-toggle" data-i="${i}" aria-pressed="${s.raw[i] >= 0.5}"><span>${esc(f)}</span><span class="b">${s.raw[i] >= 0.5 ? 1 : 0}</span></button>`).join("")}</div>`;
      box.querySelectorAll(".bit-toggle").forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.i;
        s.raw[i] = s.raw[i] >= 0.5 ? 0 : 1;
        b.setAttribute("aria-pressed", s.raw[i] === 1);
        b.querySelector(".b").textContent = s.raw[i];
        s.onEdit();
      }));
    } else if (s.id === "amplitude") {
      box.innerHTML = `<div class="grid grid-2" style="align-items:start">
        <div class="pixel-editor"><div id="pixelCanvas"></div><p class="sub" style="margin-top:6px">Click a pixel to raise its intensity (wraps to 0).</p></div>
        <div><button class="btn secondary" id="clearImg">Clear</button></div></div>`;
      const draw = () => {
        const cv = Viz.imageCanvas(s.raw, ds.image_shape);
        cv.style.cursor = "crosshair";
        cv.addEventListener("click", (e) => {
          const r = cv.getBoundingClientRect();
          const cx = Math.floor(((e.clientX - r.left) / r.width) * 4), cy = Math.floor(((e.clientY - r.top) / r.height) * 4);
          const k = cy * 4 + cx;
          s.raw[k] = s.raw[k] >= 0.95 ? 0 : Math.min(1, Math.round((s.raw[k] + 0.25) * 4) / 4);
          draw();
          s.onEdit();
        });
        $("#pixelCanvas").replaceChildren(cv);
      };
      draw();
      $("#clearImg").addEventListener("click", () => { s.raw = s.raw.map(() => 0); s.raw[0] = 1; draw(); s.onEdit(); });
    } else {
      box.innerHTML = ds.feature_names.map((f, i) => {
        const [a, b] = ds.feature_ranges[i];
        return `<div class="slider-row"><label for="f${i}"><span>${esc(f)}</span><span class="val" id="v${i}">${(+s.raw[i]).toFixed(2)}</span></label>
          <input type="range" id="f${i}" min="${a}" max="${b}" step="${(b - a) / 400}" value="${s.raw[i]}"></div>`;
      }).join("");
      box.querySelectorAll("input[type=range]").forEach((inp, i) => inp.addEventListener("input", () => {
        s.raw[i] = +inp.value;
        $(`#v${i}`).textContent = s.raw[i].toFixed(2);
        s.onEdit();
      }));
    }
    const enc = document.createElement("div");
    enc.className = "callout mono";
    enc.id = "encVals";
    enc.style.fontSize = ".85rem";
    box.appendChild(enc);
  }

  // ------------------------------------------------------------ data views
  function renderDataView(s, evalResult, pick) {
    const box = $("#dataView"), ds = s.ds;
    if (ds.X[0].length === 2) {
      Viz.scatter(box, ds, { selected: s.selected, onPick: pick });
      box.insertAdjacentHTML("beforeend", Viz.scatterLegend(ds, false));
    } else if (s.id === "basis") {
      box.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Animal</th>${ds.feature_names.map((f) => `<th>${esc(f)}</th>`).join("")}<th>|x&rang;</th><th>Label</th><th>Split</th></tr></thead>
        <tbody>${ds.X.map((r, i) => `<tr class="clickable ${s.selected === i ? "selected" : ""}" data-i="${i}"><td>${i}</td><td>${esc(ds.names[i])}</td>${r.map((b) => `<td class="num">${b}</td>`).join("")}
        <td class="mono">|${r.join("")}&rang;</td><td><span class="class-tag"><span class="swatch c${ds.y[i]}"></span>${ds.class_names[ds.y[i]]}</span></td><td>${ds.split[i]}</td></tr>`).join("")}</tbody></table></div>`;
      box.querySelectorAll("tr[data-i]").forEach((tr) => tr.addEventListener("click", () => pick(+tr.dataset.i)));
    } else {
      box.innerHTML = `<div class="image-grid"></div><div class="legend"><span><span class="swatch c0"></span>${ds.class_names[0]}</span><span><span class="swatch c1"></span>${ds.class_names[1]}</span><span>T = test sample</span></div>`;
      const grid = box.querySelector(".image-grid");
      ds.X.forEach((img, i) => {
        const t = document.createElement("button");
        t.className = "thumb" + (s.selected === i ? " selected" : "");
        t.appendChild(Viz.imageCanvas(img, ds.image_shape));
        t.insertAdjacentHTML("beforeend", `<span class="class-tag"><span class="swatch c${ds.y[i]}"></span>#${i}${ds.split[i] === "test" ? " T" : ""}</span>`);
        t.setAttribute("aria-label", `Sample ${i}, ${ds.class_names[ds.y[i]]}, ${ds.split[i]}`);
        t.addEventListener("click", () => pick(i));
        grid.appendChild(t);
      });
    }
  }

  function renderResult(s, r) {
    const box = $("#result"), ds = s.ds;
    if (r.grid) {
      $("#resultTitle").textContent = "Decision regions";
      Viz.scatter(box, ds, { grid: r.grid, predictions: r.predictions });
      box.insertAdjacentHTML("beforeend", Viz.scatterLegend(ds, true));
      return;
    }
    $("#resultTitle").textContent = "Test-set predictions";
    const test = ds.split.map((v, i) => (v === "test" ? i : -1)).filter((i) => i >= 0);
    if (s.id === "basis") {
      const trainKeys = new Set(ds.X.filter((_, i) => ds.split[i] === "train").map((x) => x.join("")));
      box.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Animal</th><th>|x&rang;</th><th>True</th><th>Predicted</th><th>Seen in training?</th></tr></thead><tbody>
        ${test.map((i) => `<tr><td>${esc(ds.names[i])}</td><td class="mono">|${ds.X[i].join("")}&rang;</td><td>${ds.class_names[ds.y[i]]}</td>
        <td>${ds.class_names[r.predictions[i]]} ${r.predictions[i] === ds.y[i] ? "&#10003;" : `<b class="error">&times;</b>`}</td>
        <td>${trainKeys.has(ds.X[i].join("")) ? "yes, identical twin" : "<b>no</b>, kernel = 0, default guess"}</td></tr>`).join("")}</tbody></table></div>
        <p class="sub" style="margin-top:8px">With basis encoding a new bit pattern is orthogonal to every training state, so its kernel row is all zeros and
        the score is exactly 0. The classifier falls back to its default class: any correct answer there is luck, not learning.</p>`;
    } else {
      box.innerHTML = `<div class="image-grid"></div>`;
      const grid = box.querySelector(".image-grid");
      test.forEach((i) => {
        const d = document.createElement("div");
        d.className = "thumb";
        d.appendChild(Viz.imageCanvas(ds.X[i], ds.image_shape));
        const ok = r.predictions[i] === ds.y[i];
        d.insertAdjacentHTML("beforeend", `<span>${ds.class_names[r.predictions[i]]} ${ok ? "&#10003;" : `<b class="error">&times;</b>`}</span>`);
        grid.appendChild(d);
      });
    }
  }

  // ------------------------------------------------------------ boot
  async function boot() {
    initChrome();
    try {
      await Engine.init();
    } catch (e) {
      view.innerHTML = `<div class="card"><h2>Could not load data</h2><p class="error">${esc(e.message)}</p>
        <p>If you opened <code>index.html</code> straight from disk, serve the folder instead:
        <code>python -m http.server -d frontend</code> or <code>python backend/app.py</code>.</p></div>`;
      return;
    }
    updateEngineBadge();
    route();
  }
  boot();
})();
