/* App shell: theme, text size, engine picker, routing, overview and comparison pages. */
(function () {
  "use strict";
  const { ORDER, STEPS, store, progress, esc, pct, $, meta } = U;
  const view = $("#view");
  let renderToken = 0;

  // ------------------------------------------------------------ chrome
  function initChrome() {
    const root = document.documentElement;
    const theme = store.get("qml-theme");
    if (theme) root.dataset.theme = theme;
    $("#themeBtn").addEventListener("click", () => {
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      store.set("qml-theme", root.dataset.theme);
      route(true);
    });
    let size = +store.get("qml-font") || 16;
    const applySize = () => { root.style.setProperty("--base-size", size + "px"); store.set("qml-font", size); };
    applySize();
    $("#fontUp").addEventListener("click", () => { size = Math.min(24, size + 1); applySize(); });
    $("#fontDown").addEventListener("click", () => { size = Math.max(13, size - 1); applySize(); });
    $("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    $("#sidebar").addEventListener("click", (e) => { if (e.target.closest("a")) $("#sidebar").classList.remove("open"); });
    $("#engineSelect").addEventListener("change", (e) => { Engine.setMode(e.target.value); updateEngineBadge(); route(true); });
    window.addEventListener("hashchange", () => route(false));
    // Left / right arrow keys move between lesson steps (not while typing or using a slider).
    document.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || !Lesson.id()) return;
      if (e.target.closest("input, select, textarea, [contenteditable]")) return;
      const step = Lesson.step();
      if (e.key === "ArrowRight") location.hash = step < STEPS.length - 1 ? `${Lesson.id()}/${step + 2}` : $("#nextStep").getAttribute("href").slice(1);
      else if (e.key === "ArrowLeft") location.hash = step > 0 ? `${Lesson.id()}/${step}` : $("#prevStep").getAttribute("href").slice(1);
    });
  }

  function updateEngineBadge() {
    const py = Engine.usingPython();
    $("#engineDot").className = "engine-dot " + (py ? "py" : "js");
    $("#engineNote").innerHTML = py
      ? "Encoding and classification run on the <b>Python / NumPy backend</b>; instant-feedback steps run in the browser."
      : `Everything runs <b>in your browser</b> (JavaScript port of the Python backend).${Engine.state.pythonOk ? "" : " No server needed: it works on GitHub Pages and offline."}`;
    const opt = $('#engineSelect option[value="python"]');
    opt.disabled = !Engine.state.pythonOk;
    opt.textContent = Engine.state.pythonOk ? "Python API" : "Python API (offline)";
  }

  function updateSidebar(id) {
    document.querySelectorAll(".sidebar a").forEach((a) => {
      a.classList.toggle("active", a.dataset.view === id);
      const enc = a.dataset.view;
      if (ORDER.includes(enc)) {
        const n = progress.get(enc).size;
        let badge = a.querySelector(".nav-progress");
        if (!badge) { badge = document.createElement("span"); badge.className = "nav-progress"; a.appendChild(badge); }
        badge.textContent = n ? `${n}/${STEPS.length}` : "";
      }
    });
  }

  // ------------------------------------------------------------ routing: #overview, #compare, #<encoding>[/<step>]
  function route(force) {
    const [id, stepStr] = (location.hash || "#overview").slice(1).split("/");
    Viz.hideTip();
    if (ORDER.includes(id)) {
      const step = Math.max(1, Math.min(STEPS.length, parseInt(stepStr, 10) || 1)) - 1;
      const sameLesson = Lesson.id() === id && !force;
      if (force) Lesson.leave();
      Lesson.render(id, step);
      updateSidebar(id);
      if (!sameLesson) window.scrollTo(0, 0);
      else $(".stepper").scrollIntoView({ block: "nearest" });
      return;
    }
    Lesson.leave();
    renderToken++;
    if (id === "compare") renderCompare();
    else renderOverview();
    updateSidebar(id === "compare" ? "compare" : "overview");
    U.bindTerms(view);
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ overview
  function renderOverview() {
    const cards = ORDER.map((id) => {
      const m = meta(id), c = CONTENT[id], ds = Engine.state.datasets[m.dataset];
      const done = progress.get(id).size;
      return `<a class="card enc-card" href="#${id}/1" data-enc="${id}">
        <h3><span class="num">${c.num}</span> ${m.name}</h3>
        <p class="sub">${c.tagline}</p>
        <div class="chips"><span class="chip">${m.data_type}</span><span class="chip">${m.qubits}</span></div>
        <p class="card-foot">Demo: <b>${esc(ds.title)}</b></p>
        <div class="progress" aria-label="${done} of ${STEPS.length} steps opened"><span style="width:${(done / STEPS.length) * 100}%"></span></div>
      </a>`;
    }).join("");
    view.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Quantum Machine Learning &middot; for UG, PG and faculty</div>
        <h1>How do we get classical data into a quantum computer?</h1>
        <p class="lead">A quantum model can only learn from data it can see. A <b>data encoding</b> (or
        <span class="term">feature map</span>) is the circuit U(x) that turns a classical vector x into a quantum state
        |&psi;(x)&rang;. It decides how many qubits you need, how deep the circuit is and which patterns can be learned.</p>
      </section>

      <div class="flow" aria-label="QML pipeline">
        <div class="node"><b>x</b><small>classical data</small></div><div class="arrow">&rarr;</div>
        <div class="node"><b>U(x)</b><small>encoding circuit</small></div><div class="arrow">&rarr;</div>
        <div class="node"><b>|&psi;(x)&rang;</b><small>quantum state</small></div><div class="arrow">&rarr;</div>
        <div class="node"><b>|&lang;&psi;(x)|&psi;(x&prime;)&rang;|<sup>2</sup></b><small>similarity (kernel)</small></div><div class="arrow">&rarr;</div>
        <div class="node"><b>&#375;</b><small>prediction</small></div>
      </div>

      <div class="grid grid-3 howto">
        <div class="card"><h3>8 short steps per encoding</h3><p>Idea &rarr; data &rarr; prepare &rarr; circuit &rarr; measure &rarr; similarity &rarr; classify &rarr; quiz. Use the step bar, the buttons or the <kbd>&larr;</kbd> <kbd>&rarr;</kbd> keys.</p></div>
        <div class="card"><h3>Two levels in one page</h3><p>The main text uses plain language and a small scenario. Open <b>Deeper maths</b> boxes for derivations and references (PG / faculty).</p></div>
        <div class="card"><h3>Hover the dotted words</h3><p>Terms like <span class="term">amplitude</span> or <span class="term">entanglement</span> show a short definition. Every step is interactive: change the data and watch the state.</p></div>
      </div>

      <h2 class="section-title">Which encoding fits my data?</h2>
      <div class="card chooser">
        <p class="sub">Pick what your data looks like:</p>
        <div class="chooser-opts">${CHOOSER.map((o) => `<button class="chip-btn" data-enc="${o.enc}">${o.label}</button>`).join("")}</div>
        <p class="chooser-out" id="chooserOut" aria-live="polite"></p>
      </div>

      <h2 class="section-title">The six encodings</h2>
      <div class="grid grid-3" id="encCards">${cards}</div>
      <div class="footer-nav"><span></span><a class="btn" href="#basis/1">Start with basis encoding &rarr;</a></div>`;
    view.querySelectorAll(".chip-btn").forEach((b) => b.addEventListener("click", () => {
      view.querySelectorAll(".chip-btn").forEach((x) => x.setAttribute("aria-pressed", x === b));
      view.querySelectorAll(".enc-card").forEach((c) => c.classList.toggle("highlight", c.dataset.enc === b.dataset.enc));
      const m = meta(b.dataset.enc);
      $("#chooserOut").innerHTML = `Recommended: <b>${m.name}</b>. ${CONTENT[b.dataset.enc].tagline} <a href="#${b.dataset.enc}/1">Open the lesson &rarr;</a>`;
    }));
  }

  // ------------------------------------------------------------ comparison
  // Resource counts for N input features (gate counts are for the circuits used in this lab).
  function costs(N) {
    const nAmp = Math.max(1, Math.ceil(Math.log2(N)));
    return {
      basis: { qubits: N, gates: `&le; ${N} X`, depth: "1" },
      angle: { qubits: N, gates: `${N} R<sub>Y</sub>`, depth: "1" },
      phase: { qubits: N, gates: `${2 * N} (H + P)`, depth: "2" },
      amplitude: { qubits: nAmp, gates: `${2 ** nAmp - 1} controlled R<sub>Y</sub>`, depth: `${2 ** nAmp - 1} (before compiling the controls)` },
      hamiltonian: { qubits: N, gates: `${N} H + 2 &times; (${N - 1} ZZ + ${N} R<sub>X</sub>)`, depth: "1 + 2 &times; 3 (chain, 2 Trotter steps)" },
      iqp: { qubits: N, gates: `${2 * N} + ${(N * (N - 1)) / 2} ZZ per rep`, depth: `~${N + 1} per rep (all pairs)` },
    };
  }

  async function renderCompare() {
    const token = renderToken;
    const rows = ORDER.map((id) => {
      const m = meta(id), ds = Engine.state.datasets[m.dataset];
      return `<tr><td><a href="#${id}/1"><b>${m.name}</b></a></td><td>${esc(ds.title)}</td>
        <td class="num" id="acc-${id}">&hellip;</td><td class="num" id="base-${id}">&hellip;</td></tr>`;
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

      <h2 class="section-title">How much does it cost?</h2>
      <div class="card">
        <div class="slider-row"><label for="nFeat"><span>Number of input features N</span><span class="val" id="nVal">16</span></label>
          <input type="range" id="nFeat" min="2" max="1024" step="1" value="16"></div>
        <div class="table-wrap" style="max-height:none;margin-top:12px"><table class="data" id="costTable"></table></div>
        <p class="sub" style="margin-top:8px">Amplitude encoding wins on qubits, but its depth grows linearly with N. Angle and phase encoding stay shallow but need one qubit per feature.</p>
      </div>

      <h2 class="section-title">How did they do on their datasets?</h2>
      <div class="card"><div class="table-wrap" style="max-height:none"><table class="data">
        <thead><tr><th>Encoding</th><th>Demo dataset</th><th>Quantum kernel</th><th>Linear baseline</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
        <p class="sub" style="margin-top:10px">Test-set accuracy. Each row uses its own dataset, so compare a row with its baseline, not rows with each other.
        The quantum kernel clearly helps where the data has structure a straight line cannot capture: periodic (phase) and interacting (IQP).</p></div>

      <div class="callout"><strong>Rules of thumb.</strong> Binary or categorical data: <b>basis</b>. A few bounded features
      on noisy hardware: <b>angle</b>. Periodic quantities: <b>phase</b>. Long vectors or images with few qubits:
      <b>amplitude</b>. Physical parameters: <b>Hamiltonian</b>. Interacting features, or a kernel that is hard to simulate: <b>IQP</b>.</div>
      <h2 class="section-title">Trade-offs</h2>
      <div class="grid grid-3">${pc}</div>`;

    const drawCosts = () => {
      const N = +$("#nFeat").value;
      $("#nVal").textContent = N;
      const c = costs(N);
      const maxQ = Math.max(...ORDER.map((id) => c[id].qubits));
      $("#costTable").innerHTML = `<thead><tr><th>Encoding</th><th>Qubits</th><th></th><th>Gates</th><th>Depth</th></tr></thead><tbody>${ORDER.map((id) =>
        `<tr><td>${meta(id).name}</td><td class="num">${c[id].qubits}</td>
        <td class="bar-cell" style="min-width:120px"><div class="bar" style="width:${(c[id].qubits / maxQ) * 100}%"></div></td>
        <td>${c[id].gates}</td><td>${c[id].depth}</td></tr>`).join("")}</tbody>`;
    };
    $("#nFeat").addEventListener("input", drawCosts);
    drawCosts();

    for (const id of ORDER) {
      try {
        const r = await Engine.evaluate(id);
        if (token !== renderToken) return;
        $(`#acc-${id}`).textContent = pct(r.test_accuracy);
        $(`#base-${id}`).textContent = pct(r.baseline_test_accuracy);
      } catch (_) {
        if (token !== renderToken) return;
        $(`#acc-${id}`).innerHTML = `<span class="error">error</span>`;
      }
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
    route(false);
  }
  boot();
})();
