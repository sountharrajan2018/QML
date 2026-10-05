/*
 * Step-by-step lesson page for one encoding.
 *
 * URL: #<encoding>/<step> (step 1-8). Choices made in one step (the selected
 * sample, edited inputs, sample B, quiz answers) are kept while you move
 * between steps of the same encoding.
 *
 * Step 3 (prepare) and step 7 (classify) use the selected engine (Python API
 * or browser). The instant-feedback steps (gate stepping, shots, similarity)
 * always simulate in the browser with QuantumJS, which the tests check
 * against the Python backend.
 */
(function () {
  "use strict";
  const { STEPS, ORDER, esc, pct, $, meta, progress } = U;
  const PI = Math.PI;
  const f = (v, d = 3) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(d);
  const lessons = {};
  let current = null; // lesson state of the page on screen
  let timers = [];

  // ------------------------------------------------------------ state
  function lessonState(id) {
    if (!lessons[id]) {
      const ds = Engine.datasetFor(id);
      const selected = ds.split.indexOf("train");
      const otherClass = ds.y.findIndex((c, i) => c !== ds.y[selected] && ds.split[i] === "train");
      lessons[id] = {
        id, ds, selected, raw: ds.X[selected].slice(),
        B: otherClass >= 0 ? otherClass : 1,
        options: id === "iqp" ? { reps: 1 } : undefined,
        gateK: null, shots: 100, basis: "Z", sample: null, curveFeature: 0, quiz: {},
      };
    }
    return lessons[id];
  }

  const sampleLabel = (ds, i) => `#${i}${ds.names ? ` ${ds.names[i]}` : ""} (${ds.class_names[ds.y[i]]}, ${ds.split[i]})`;
  const localState = (s, raw) => {
    const e = QuantumJS.encode(s.id, raw, s.ds, s.options);
    return { ...e, st: QuantumJS.simulate(e.n, e.gates) };
  };
  function overlap(a, b) {
    let r = 0, i = 0;
    for (let k = 0; k < a.re.length; k++) {
      r += a.re[k] * b.re[k] + a.im[k] * b.im[k];
      i += a.re[k] * b.im[k] - a.im[k] * b.re[k];
    }
    return r * r + i * i;
  }

  // ------------------------------------------------------------ page shell
  function render(id, stepIdx) {
    const s = lessonState(id);
    if (!current || current.id !== id || !$("#stepBody")) buildShell(s);
    current = s;
    renderStep(s, Math.max(0, Math.min(STEPS.length - 1, stepIdx)));
  }

  function buildShell(s) {
    const m = meta(s.id), c = CONTENT[s.id];
    $("#view").innerHTML = `
      <section class="lesson-head">
        <div class="eyebrow">Encoding ${c.num} of 6 &middot; ${m.data_type}</div>
        <h1>${m.name}</h1>
        <p class="lead">${c.tagline}</p>
      </section>
      <nav class="stepper" aria-label="Lesson steps">
        ${STEPS.map((st, i) => `<a href="#${s.id}/${i + 1}" data-step="${i}"><span class="dot">${i + 1}</span><span class="lbl">${st.title}</span></a>`).join("")}
      </nav>
      <div class="formula formula-bar" title="The encoding in one line">${c.formula}</div>
      <div id="stepBody"></div>
      <div class="step-nav">
        <a class="btn secondary" id="prevStep"></a>
        <span class="step-count" id="stepCount"></span>
        <a class="btn" id="nextStep"></a>
      </div>`;
  }

  function renderStep(s, idx) {
    timers.forEach(clearInterval);
    timers = [];
    Viz.hideTip();
    s.step = idx;
    progress.mark(s.id, idx);
    const done = progress.get(s.id);
    document.querySelectorAll(".stepper a").forEach((a) => {
      const i = +a.dataset.step;
      a.classList.toggle("active", i === idx);
      a.classList.toggle("visited", done.has(i) && i !== idx);
      a.setAttribute("aria-current", i === idx ? "step" : "false");
    });
    const prevId = ORDER[ORDER.indexOf(s.id) - 1], nextId = ORDER[ORDER.indexOf(s.id) + 1];
    const prev = $("#prevStep"), next = $("#nextStep");
    if (idx > 0) { prev.href = `#${s.id}/${idx}`; prev.innerHTML = `&larr; ${STEPS[idx - 1].title}`; }
    else { prev.href = prevId ? `#${prevId}/8` : "#overview"; prev.innerHTML = `&larr; ${prevId ? meta(prevId).name : "Overview"}`; }
    if (idx < STEPS.length - 1) { next.href = `#${s.id}/${idx + 2}`; next.innerHTML = `${STEPS[idx + 1].title} &rarr;`; }
    else { next.href = nextId ? `#${nextId}/1` : "#compare"; next.innerHTML = `${nextId ? meta(nextId).name : "Comparison"} &rarr;`; }
    $("#stepCount").textContent = `Step ${idx + 1} of ${STEPS.length}`;
    STEP_RENDERERS[STEPS[idx].key](s, idx);
    U.bindTerms($("#view"));
  }

  // Common two-column layout: explanation on the left, interactive work on the right.
  function frame(s, idx, { title, explain, tryIt, deeper, main }) {
    $("#stepBody").innerHTML = `
      <div class="step-grid">
        <aside class="explain card">
          <div class="step-kicker">Step ${idx + 1} &middot; ${STEPS[idx].title}</div>
          <h2>${title}</h2>
          ${explain}
          ${tryIt ? `<div class="try"><span class="try-label">Try it</span> ${tryIt}</div>` : ""}
          ${deeper ? `<details class="deeper"><summary>Deeper maths <span class="sub">(PG / faculty)</span></summary><div>${deeper}</div></details>` : ""}
        </aside>
        <div class="work">${main}</div>
      </div>`;
  }

  // ------------------------------------------------------------ step 1: idea
  function stepIdea(s, idx) {
    const m = meta(s.id), c = CONTENT[s.id];
    frame(s, idx, {
      title: "The big idea",
      explain: `
        <div class="scenario"><span class="scenario-label">Scenario</span>${c.hook}</div>
        <p class="big-idea">${c.bigIdea}</p>
        <p class="analogy"><b>Analogy.</b> ${c.analogy}</p>`,
      deeper: c.deeper.idea,
      main: `
        <div class="card"><h3>Reading the formula</h3>
          <div class="formula">${c.formula}</div>
          <dl class="parts">${c.formulaParts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl></div>
        <div class="grid grid-3 glance">
          <div class="stat"><div class="label">Qubits</div><div class="value-sm">${m.qubits}</div></div>
          <div class="stat"><div class="label">Depth</div><div class="value-sm">${m.depth}</div></div>
          <div class="stat"><div class="label">Best for</div><div class="value-sm">${m.data_type}</div></div>
        </div>
        <div class="card"><h3>Use it when&hellip;</h3><div class="chips">${c.useWhen.map((u) => `<span class="chip">${u}</span>`).join("")}</div></div>
        <div class="card"><h3>Preview: the circuit you will build</h3><p class="sub">For the first training sample, ${esc(sampleLabel(s.ds, s.selected))}. Step 4 walks through it gate by gate.</p><div class="scroll-x" id="previewCircuit"></div></div>`,
    });
    const e = QuantumJS.encode(s.id, s.raw, s.ds, s.options);
    Viz.circuit($("#previewCircuit"), e.n, e.gates);
  }

  // ------------------------------------------------------------ step 2: data
  function stepData(s, idx) {
    const c = CONTENT[s.id], ds = s.ds;
    const nTrain = ds.split.filter((v) => v === "train").length;
    const counts = ds.class_names.map((_, k) => ds.y.filter((v) => v === k).length);
    frame(s, idx, {
      title: `Meet the data: ${esc(ds.title)}`,
      explain: `<p>${esc(ds.story)}</p>
        <div class="callout"><strong>Why this dataset suits ${meta(s.id).name.toLowerCase()}.</strong> ${c.data}</div>
        <table class="mini">
          <tr><td>Samples</td><td>${ds.X.length} (${nTrain} train / ${ds.X.length - nTrain} test)</td></tr>
          <tr><td>Features</td><td>${ds.feature_names.length}${ds.feature_names.length <= 4 ? `: ${ds.feature_names.map(esc).join(", ")}` : " (pixels)"}</td></tr>
          ${ds.class_names.map((n, k) => `<tr><td><span class="swatch c${k}"></span> ${esc(n)}</td><td>${counts[k]} samples</td></tr>`).join("")}
          <tr><td>Origin</td><td>synthetic, fixed random seed</td></tr>
        </table>`,
      tryIt: c.tries.data,
      main: `<div class="card"><h3>The dataset</h3><p class="sub">Click a sample to make it <b>sample A</b>, the point we encode in the next steps.</p><div id="dataView"></div>
        <p class="selected-note" id="selNote"></p></div>`,
    });
    const draw = () => {
      renderDataView(s, (i) => { s.selected = i; s.raw = s.ds.X[i].slice(); s.gateK = null; s.sample = null; draw(); });
      $("#selNote").innerHTML = s.selected !== null ? `Sample A: <b>${esc(sampleLabel(ds, s.selected))}</b>` : "Sample A: custom input (edited in step 3)";
    };
    draw();
  }

  function renderDataView(s, pick, opts = {}) {
    const box = $(opts.target || "#dataView"), ds = s.ds;
    if (ds.X[0].length === 2) {
      Viz.scatter(box, ds, { selected: s.selected, selectedB: opts.withB ? s.B : undefined, onPick: pick });
      box.insertAdjacentHTML("beforeend", Viz.scatterLegend(ds, false));
    } else if (s.id === "basis") {
      box.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Animal</th>${ds.feature_names.map((n) => `<th>${esc(n)}</th>`).join("")}<th>|x&rang;</th><th>Label</th><th>Split</th></tr></thead>
        <tbody>${ds.X.map((r, i) => `<tr class="clickable ${s.selected === i ? "selected" : ""} ${opts.withB && s.B === i ? "selected-b" : ""}" data-i="${i}"><td>${i}</td><td>${esc(ds.names[i])}</td>${r.map((b) => `<td class="num">${b}</td>`).join("")}
        <td class="mono">|${r.join("")}&rang;</td><td><span class="class-tag"><span class="swatch c${ds.y[i]}"></span>${ds.class_names[ds.y[i]]}</span></td><td>${ds.split[i]}</td></tr>`).join("")}</tbody></table></div>`;
      box.querySelectorAll("tr[data-i]").forEach((tr) => tr.addEventListener("click", () => pick(+tr.dataset.i)));
    } else {
      box.innerHTML = `<div class="image-grid"></div><div class="legend"><span><span class="swatch c0"></span>${ds.class_names[0]}</span><span><span class="swatch c1"></span>${ds.class_names[1]}</span><span>T = test sample</span></div>`;
      const grid = box.querySelector(".image-grid");
      ds.X.forEach((img, i) => {
        const t = document.createElement("button");
        t.className = "thumb" + (s.selected === i ? " selected" : "") + (opts.withB && s.B === i ? " selected-b" : "");
        t.appendChild(Viz.imageCanvas(img, ds.image_shape));
        t.insertAdjacentHTML("beforeend", `<span class="class-tag"><span class="swatch c${ds.y[i]}"></span>#${i}${ds.split[i] === "test" ? " T" : ""}</span>`);
        t.setAttribute("aria-label", `Sample ${i}, ${ds.class_names[ds.y[i]]}, ${ds.split[i]}`);
        t.addEventListener("click", () => pick(i));
        grid.appendChild(t);
      });
    }
  }

  // ------------------------------------------------------------ step 3: prepare
  function stepPrep(s, idx) {
    const c = CONTENT[s.id];
    frame(s, idx, {
      title: "Prepare the numbers",
      explain: `<p>${c.prep}</p><p class="sub">Every number on the right updates as you change sample A.</p>`,
      tryIt: c.tries.prep,
      main: `<div class="card"><h3>Sample A</h3><p class="sub" id="selLabel"></p><div class="controls" id="controls"></div></div>
        <div class="card"><h3>Worked calculation</h3><div id="worked" class="worked"></div></div>`,
    });
    let pending = null, seq = 0;
    const update = async () => {
      const my = ++seq;
      $("#selLabel").innerHTML = s.selected !== null ? esc(sampleLabel(s.ds, s.selected)) : "Custom input (edited by hand)";
      try {
        const r = await Engine.encode(s.id, s.raw, s.options);
        if (my !== seq || current !== s || s.step !== idx) return;
        $("#worked").innerHTML = WORKED[s.id](s.raw, r.encoded_values, s.ds);
      } catch (e) {
        $("#worked").innerHTML = `<p class="error">Encoding failed: ${esc(e.message)}</p>`;
      }
    };
    s.onEdit = () => {
      s.selected = null; s.gateK = null; s.sample = null;
      clearTimeout(pending);
      pending = setTimeout(update, Engine.usingPython() ? 60 : 0);
    };
    renderControls(s);
    update();
  }

  function renderControls(s) {
    const box = $("#controls"), ds = s.ds;
    if (s.id === "basis") {
      box.innerHTML = `<div class="bit-toggles">${ds.feature_names.map((n, i) =>
        `<button class="bit-toggle" data-i="${i}" aria-pressed="${s.raw[i] >= 0.5}"><span>${esc(n)}</span><span class="b">${s.raw[i] >= 0.5 ? 1 : 0}</span></button>`).join("")}</div>`;
      box.querySelectorAll(".bit-toggle").forEach((b) => b.addEventListener("click", () => {
        const i = +b.dataset.i;
        s.raw[i] = s.raw[i] >= 0.5 ? 0 : 1;
        b.setAttribute("aria-pressed", s.raw[i] === 1);
        b.querySelector(".b").textContent = s.raw[i];
        s.onEdit();
      }));
    } else if (s.id === "amplitude") {
      box.innerHTML = `<div class="pixel-row"><div class="pixel-editor"><div id="pixelCanvas"></div></div>
        <div><p class="sub">Click a pixel to raise its intensity by 0.25 (it wraps back to 0).</p><button class="btn secondary" id="clearImg">Clear</button></div></div>`;
      const draw = () => {
        const cv = Viz.imageCanvas(s.raw, ds.image_shape);
        cv.style.cursor = "crosshair";
        cv.addEventListener("click", (e) => {
          const r = cv.getBoundingClientRect();
          const k = Math.floor(((e.clientY - r.top) / r.height) * 4) * 4 + Math.floor(((e.clientX - r.left) / r.width) * 4);
          s.raw[k] = s.raw[k] >= 0.95 ? 0 : Math.min(1, Math.round((s.raw[k] + 0.25) * 4) / 4);
          draw();
          s.onEdit();
        });
        $("#pixelCanvas").replaceChildren(cv);
      };
      draw();
      $("#clearImg").addEventListener("click", () => { s.raw = s.raw.map(() => 0); s.raw[0] = 1; draw(); s.onEdit(); });
    } else {
      box.innerHTML = ds.feature_names.map((n, i) => {
        const [a, b] = ds.feature_ranges[i];
        return `<div class="slider-row"><label for="f${i}"><span>${esc(n)}</span><span class="val" id="v${i}">${(+s.raw[i]).toFixed(2)}</span></label>
          <input type="range" id="f${i}" min="${a}" max="${b}" step="${(b - a) / 400}" value="${s.raw[i]}"></div>`;
      }).join("");
      box.querySelectorAll("input[type=range]").forEach((inp, i) => inp.addEventListener("input", () => {
        s.raw[i] = +inp.value;
        $(`#v${i}`).textContent = s.raw[i].toFixed(2);
        s.onEdit();
      }));
    }
  }

  // ------------------------------------------------------------ step 4: circuit, gate by gate
  function gateExplain(g, s) {
    const fmtA = (t) => `${f(t)} rad (${f((t * 180) / PI, 1)}&deg;)`;
    const q = g.targets[0], p = g.params && g.params[0];
    switch (g.gate) {
      case "H": return `<b>Hadamard on q${q}.</b> |0&rang; &rarr; (|0&rang; + |1&rang;)/&radic;2: an equal <span class="term">superposition</span>. Its Bloch vector moves from the north pole to the equator.`;
      case "X": return `<b>X (NOT) on q${q}.</b> Flips |0&rang; to |1&rang;, writing the 1 of &ldquo;${esc(s.ds.feature_names[q])}&rdquo;. The Bloch vector jumps to the south pole.`;
      case "RY": return s.id === "amplitude"
        ? `<b>R<sub>Y</sub>(${fmtA(p)}) on q0.</b> Splits the total probability between the top half of the image (q0 = 0) and the bottom half (q0 = 1): P(bottom) = sin&sup2;(&theta;/2) = ${f(Math.sin(p / 2) ** 2)}.`
        : `<b>R<sub>Y</sub>(${fmtA(p)}) on q${q}.</b> Rotates about the Y axis: q${q} becomes cos(&theta;/2)|0&rang; + sin(&theta;/2)|1&rang; = ${f(Math.cos(p / 2))}|0&rang; + ${f(Math.sin(p / 2))}|1&rang;.`;
      case "P": return `<b>P(${fmtA(p)}) on q${q}.</b> Multiplies the |1&rang; amplitude by e<sup>i&phi;</sup>. Probabilities do not change; the Bloch vector turns around the equator by &phi;.`;
      case "RZ": return `<b>R<sub>Z</sub>(${fmtA(p)}) on q${q}.</b> Rotation about Z: changes only the relative <span class="term">phase</span> of q${q}, not its probabilities.`;
      case "RX": return `<b>R<sub>X</sub>(${fmtA(p)}) on q${q}.</b> One Trotter slice of the field term &minus;hX<sub>${q}</sub>: it tips the spin and mixes |0&rang; and |1&rang;.`;
      case "RZZ": {
        const [a, b] = g.targets;
        const why = s.id === "hamiltonian" ? "One Trotter slice of the coupling &minus;J Z<sub>" + a + "</sub>Z<sub>" + b + "</sub>."
          : s.id === "iqp" ? "The angle 2(&pi;&minus;x<sub>0</sub>)(&pi;&minus;x<sub>1</sub>) is a product of both features: the interaction term." : "";
        return `<b>ZZ(${fmtA(p)}) on q${a}, q${b}.</b> Adds phase e<sup>&minus;i&theta;/2</sup> when the two qubits agree and e<sup>+i&theta;/2</sup> when they differ. Because it depends on both qubits at once it can create <span class="term">entanglement</span>: watch the Bloch vectors shrink. ${why}`;
      }
      case "MCRY": {
        const bits = g.ctrl_state.join("");
        return `<b>Controlled R<sub>Y</sub>(${fmtA(p)}) on q${q}</b>, applied only when q0&hellip;q${q - 1} = ${bits}. Inside that branch (pixel indices starting ${bits}) it splits the probability between the two halves: the fraction sent to q${q} = 1 is sin&sup2;(&theta;/2) = ${f(Math.sin(p / 2) ** 2)}.`;
      }
      case "SIGN": return "<b>Sign fix.</b> A diagonal gate multiplies negative entries by &minus;1 so the amplitudes match the data exactly.";
      case "PREP": return "<b>State preparation.</b> Loads the whole vector at once.";
      default: return g.gate;
    }
  }

  function stepCircuit(s, idx) {
    const c = CONTENT[s.id];
    const e = QuantumJS.encode(s.id, s.raw, s.ds, s.options);
    const G = e.gates.length;
    if (s.gateK === null || s.gateK > G) s.gateK = 0;
    frame(s, idx, {
      title: "Build the circuit, one gate at a time",
      explain: `<p>${c.circuit}</p>
        <div class="gate-explain" id="gateExplain" aria-live="polite"></div>`,
      tryIt: c.tries.circuit,
      main: `<div class="card">
          <div class="gate-controls">
            <button class="icon-btn" id="gFirst" aria-label="Reset to |0...0>">&#9198;</button>
            <button class="icon-btn" id="gPrev" aria-label="Previous gate">&#9664;</button>
            <button class="btn" id="gPlay">&#9654; Play</button>
            <button class="icon-btn" id="gNext" aria-label="Next gate">&#9654;</button>
            <button class="icon-btn" id="gLast" aria-label="Apply all gates">&#9197;</button>
            <input type="range" id="gSlider" min="0" max="${G}" value="${s.gateK}" aria-label="Gates applied">
            <span class="mono" id="gCount"></span>
          </div>
          <p class="sub">Sample A: ${s.selected !== null ? esc(sampleLabel(s.ds, s.selected)) : "custom input"}. Click any gate to jump to it.</p>
          <div class="scroll-x" id="circuit"></div></div>
        <div class="card"><h3>Bloch spheres</h3><p class="sub">One sphere per qubit. A vector shorter than 1 means that qubit is entangled.</p><div id="bloch"></div></div>
        <div class="card"><h3>State after these gates</h3><div id="stateTable"></div></div>`,
    });
    const show = () => {
      const k = s.gateK;
      const r = QuantumJS.stateReport(e.n, e.gates.slice(0, k));
      Viz.circuit($("#circuit"), e.n, e.gates, { upTo: k, onGateClick: (i) => { stop(); s.gateK = i + 1; show(); } });
      Viz.stateTable($("#stateTable"), r.statevector, e.n);
      Viz.bloch($("#bloch"), r.bloch);
      $("#gSlider").value = k;
      $("#gCount").textContent = `${k} / ${G} gates`;
      $("#gateExplain").innerHTML = k === 0
        ? `<b>Start.</b> Every qubit is |0&rang;, so the register is |${"0".repeat(e.n)}&rang;. Press &#9654; to apply the first gate.`
        : `<span class="gate-step">Gate ${k} of ${G}</span> ${gateExplain(e.gates[k - 1], s)}${k === G ? "<p class=\"done-note\">All gates applied: this is |&psi;(x)&rang;, the encoded state.</p>" : ""}`;
      U.bindTerms($("#gateExplain"));
    };
    let playing = null;
    const stop = () => { if (playing) { clearInterval(playing); playing = null; $("#gPlay").innerHTML = "&#9654; Play"; } };
    $("#gFirst").onclick = () => { stop(); s.gateK = 0; show(); };
    $("#gPrev").onclick = () => { stop(); s.gateK = Math.max(0, s.gateK - 1); show(); };
    $("#gNext").onclick = () => { stop(); s.gateK = Math.min(G, s.gateK + 1); show(); };
    $("#gLast").onclick = () => { stop(); s.gateK = G; show(); };
    $("#gSlider").oninput = (ev) => { stop(); s.gateK = +ev.target.value; show(); };
    $("#gPlay").onclick = () => {
      if (playing) return stop();
      if (s.gateK >= G) s.gateK = 0;
      $("#gPlay").innerHTML = "&#10074;&#10074; Pause";
      playing = setInterval(() => {
        if (s.gateK >= G || current !== s || s.step !== idx) return stop();
        s.gateK++;
        show();
      }, 900);
      timers.push(playing);
    };
    show();
  }

  // ------------------------------------------------------------ step 5: measure
  function sampleCounts(probs, shots) {
    const cum = [];
    probs.reduce((acc, p, i) => (cum[i] = acc + p), 0);
    const counts = new Array(probs.length).fill(0);
    for (let t = 0; t < shots; t++) {
      const r = Math.random() * cum[cum.length - 1];
      let i = 0;
      while (i < cum.length - 1 && r > cum[i]) i++;
      counts[i]++;
    }
    return counts;
  }

  function stepMeasure(s, idx) {
    const c = CONTENT[s.id];
    frame(s, idx, {
      title: "Measure it (many times)",
      explain: `<p>A measurement returns <b>one</b> bit string at random, with probability |amplitude|&sup2;. To learn the probabilities we repeat prepare-and-measure many times (<span class="term">shots</span>).</p>
        <p>${c.measure}</p>
        <p class="sub"><b>X basis</b> = apply a Hadamard to every qubit just before measuring. It reveals phase information.</p>`,
      tryIt: c.tries.measure,
      main: `<div class="card">
          <div class="measure-controls">
            <div class="seg" role="group" aria-label="Measurement basis">
              <button data-basis="Z">Z basis</button><button data-basis="X">X basis</button></div>
            <div class="seg" role="group" aria-label="Number of shots">
              ${[10, 100, 1000, 10000].map((n) => `<button data-shots="${n}">${n.toLocaleString()} shots</button>`).join("")}</div>
            <button class="btn" id="measureBtn">Measure again</button>
          </div>
          <div class="scroll-x" id="hist"></div>
          <div class="legend"><span><span class="swatch c0"></span>measured frequency</span><span><b style="font-size:1.1em">&#8212;</b> exact probability</span></div>
          <p id="measureReadout" class="readout"></p>
        </div>
        ${s.id === "amplitude" ? `<div class="card"><h3>The image, rebuilt from the counts</h3><p class="sub">Intensity &prop; &radic;(count). Few shots give a noisy photo; many shots recover the image (Z basis).</p>
          <div class="pixel-row"><figure class="mini-img"><div id="origImg"></div><figcaption>encoded image</figcaption></figure><figure class="mini-img"><div id="recImg"></div><figcaption>from the shots</figcaption></figure></div></div>` : ""}`,
    });
    const e = QuantumJS.encode(s.id, s.raw, s.ds, s.options);
    const run = (resample) => {
      document.querySelectorAll("[data-basis]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.basis === s.basis));
      document.querySelectorAll("[data-shots]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.shots === s.shots));
      const gates = s.basis === "X" ? [...e.gates, ...[...Array(e.n).keys()].map((q) => ({ gate: "H", targets: [q] }))] : e.gates;
      const probs = QuantumJS.stateReport(e.n, gates).probabilities;
      const key = `${s.basis}:${s.shots}:${JSON.stringify(s.raw)}:${JSON.stringify(s.options || {})}`;
      if (resample || !s.sample || s.sample.key !== key) s.sample = { key, counts: sampleCounts(probs, s.shots) };
      const counts = s.sample.counts;
      const freqs = counts.map((n) => n / s.shots);
      Viz.probBars($("#hist"), probs, e.n, { sampled: freqs, counts, shots: s.shots });
      const top = counts.indexOf(Math.max(...counts));
      const tvd = 0.5 * probs.reduce((acc, p, i) => acc + Math.abs(p - freqs[i]), 0);
      $("#measureReadout").innerHTML = `Most frequent outcome: <b class="mono">|${Viz.ket(top, e.n)}&rang;</b> (${counts[top]} of ${s.shots.toLocaleString()} shots). Distance from the exact distribution: <b>${f(tvd)}</b> (shrinks roughly as 1/&radic;shots).`;
      if (s.id === "amplitude") {
        $("#origImg").replaceChildren(Viz.imageCanvas(s.raw, s.ds.image_shape));
        if (s.basis === "Z") $("#recImg").replaceChildren(Viz.imageCanvas(freqs.map(Math.sqrt), s.ds.image_shape));
        else $("#recImg").innerHTML = `<p class="sub" style="margin:0">X-basis counts do not show the image: the Hadamards mix all pixels. Switch to Z.</p>`;
      }
    };
    document.querySelectorAll("[data-basis]").forEach((b) => b.addEventListener("click", () => { s.basis = b.dataset.basis; run(true); }));
    document.querySelectorAll("[data-shots]").forEach((b) => b.addEventListener("click", () => { s.shots = +b.dataset.shots; run(true); }));
    $("#measureBtn").addEventListener("click", () => run(true));
    run(false);
  }

  // ------------------------------------------------------------ step 6: similarity (kernel)
  function stepKernel(s, idx) {
    const c = CONTENT[s.id], ds = s.ds, twoD = ds.X[0].length === 2;
    const options = ds.X.map((_, i) => `<option value="${i}">${esc(sampleLabel(ds, i))}</option>`).join("");
    frame(s, idx, {
      title: "How similar are two data points?",
      explain: `<p>A quantum model compares data through the <span class="term">fidelity</span> of their states:</p>
        <div class="formula small">k(A, B) = |&lang;&psi;(A)|&psi;(B)&rang;|&sup2;</div>
        <p>1 means identical states, 0 means orthogonal. This similarity is the <span class="term">kernel</span> that the classifier in the next step uses.</p>
        <p>${c.kernel}</p>`,
      tryIt: c.tries.kernel,
      deeper: c.deeper.kernel,
      main: `<div class="card">
          <div class="pair-pickers">
            <label>Sample A <select id="selA"><option value="custom">custom input (from step 3)</option>${options}</select></label>
            <label>Sample B <select id="selB">${options}</select></label>
            <div class="pair-buttons"><button class="btn secondary" id="sameB">B from same class</button><button class="btn secondary" id="otherB">B from other class</button></div>
          </div>
          <div class="kernel-readout">
            <div><div class="label">k(A, B)</div><div class="kval" id="kval"></div></div>
            <div class="meter"><div class="meter-fill" id="kbar"></div></div>
          </div>
          <p id="kcheck" class="sub"></p>
        </div>
        <div class="grid grid-2">
          <div class="card">${twoD ? `<h3>Slide B along one feature</h3>
            <div class="select-row"><label for="curveF">Vary</label><select id="curveF">${ds.feature_names.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join("")}</select></div>
            <div id="curve"></div>` : `<h3>A and B</h3><div id="pairView"></div>`}</div>
          <div class="card"><h3>A's nearest neighbours in Hilbert space</h3><p class="sub">Training samples (other than A) with the highest k(A, &middot;).</p><div id="neighbours"></div></div>
        </div>
        ${twoD ? `<div class="card"><h3>Where A and B are</h3><p class="sub">Click a point to make it B.</p><div id="dataView"></div></div>` : ""}`,
    });
    if (s.selected !== null) $("#selA").value = String(s.selected);
    $("#selB").value = String(s.B);

    const train = ds.split.map((v, i) => (v === "train" ? i : -1)).filter((i) => i >= 0);
    const trainStates = new Map(train.map((i) => [i, localState(s, ds.X[i]).st]));
    const update = () => {
      const A = localState(s, s.raw), Bs = localState(s, ds.X[s.B]);
      const k = overlap(A.st, Bs.st);
      $("#kval").textContent = f(k);
      $("#kbar").style.width = `${k * 100}%`;
      const cf = CLOSED_FORM[s.id];
      if (cf) {
        const r = cf(A.x, Bs.x);
        $("#kcheck").innerHTML = `Closed form: ${r.html} = <b>${f(r.value)}</b> ${Math.abs(r.value - k) < 1e-6 ? "&#10003; matches the simulation" : ""}`;
      } else {
        $("#kcheck").innerHTML = "No simple closed form for this encoding: the value comes from simulating both states and taking their overlap.";
      }
      // neighbours
      const ranked = train.filter((i) => i !== s.selected).map((i) => [i, overlap(A.st, trainStates.get(i))]).sort((p, q) => q[1] - p[1]).slice(0, 5);
      const votes = ranked.reduce((acc, [i]) => acc + ds.y[i], 0);
      $("#neighbours").innerHTML = `<ul class="nbr">${ranked.map(([i, v]) => `<li><span class="swatch c${ds.y[i]}"></span><span class="nbr-name">${esc(ds.names ? ds.names[i] : "#" + i)}</span>
        <span class="nbr-bar"><span style="width:${v * 100}%"></span></span><span class="mono">${f(v)}</span></li>`).join("")}</ul>
        <p class="sub">A 5-nearest-neighbour vote would say <b>${ds.class_names[votes >= 3 ? 1 : 0]}</b>${s.selected !== null ? ` (A is really ${ds.class_names[ds.y[s.selected]]})` : ""}.</p>`;
      if (twoD) {
        const fi = s.curveFeature, [lo, hi] = ds.feature_ranges[fi];
        const xs = [...Array(81).keys()].map((t) => lo + ((hi - lo) * t) / 80);
        const ys = xs.map((v) => { const raw = ds.X[s.B].slice(); raw[fi] = v; return overlap(A.st, localState(s, raw).st); });
        Viz.lineChart($("#curve"), xs, ys, { xLabel: `B's ${ds.feature_names[fi]}`, yLabel: "k(A, B)", yMax: 1, marker: { x: ds.X[s.B][fi], y: k, label: "B" } });
        renderDataView(s, (i) => { s.B = i; $("#selB").value = String(i); update(); }, { withB: true });
      } else if (s.id === "amplitude") {
        $("#pairView").innerHTML = `<div class="pixel-row"><figure class="mini-img"><div id="imgA"></div><figcaption>A</figcaption></figure><figure class="mini-img"><div id="imgB"></div><figcaption>B</figcaption></figure></div>`;
        $("#imgA").replaceChildren(Viz.imageCanvas(s.raw, ds.image_shape));
        $("#imgB").replaceChildren(Viz.imageCanvas(ds.X[s.B], ds.image_shape));
      } else {
        $("#pairView").innerHTML = `<table class="calc"><tr><td>A</td><td class="mono">|${A.x.join("")}&rang;</td></tr><tr><td>B</td><td class="mono">|${Bs.x.join("")}&rang;</td></tr>
          <tr><td>bits that differ</td><td>${A.x.filter((b, i) => b !== Bs.x[i]).length}</td></tr></table>
          <p class="sub">However many bits differ (1 or 4), the overlap is 0 unless the strings are identical.</p>`;
      }
    };
    $("#selA").addEventListener("change", (e) => {
      if (e.target.value === "custom") return;
      s.selected = +e.target.value; s.raw = ds.X[s.selected].slice(); s.gateK = null; s.sample = null; update();
    });
    $("#selB").addEventListener("change", (e) => { s.B = +e.target.value; update(); });
    const pickB = (same) => {
      const cls = s.selected !== null ? ds.y[s.selected] : ds.y[s.B];
      const pool = ds.X.map((_, i) => i).filter((i) => (ds.y[i] === cls) === same && i !== s.selected);
      s.B = pool[Math.floor(Math.random() * pool.length)];
      $("#selB").value = String(s.B);
      update();
    };
    $("#sameB").addEventListener("click", () => pickB(true));
    $("#otherB").addEventListener("click", () => pickB(false));
    if (twoD) $("#curveF").addEventListener("change", (e) => { s.curveFeature = +e.target.value; update(); });
    if (twoD) $("#curveF").value = String(s.curveFeature);
    update();
  }

  // ------------------------------------------------------------ step 7: classify
  function stepClassify(s, idx) {
    const c = CONTENT[s.id];
    frame(s, idx, {
      title: "Learn from the whole dataset",
      explain: `<p>Now encode <b>every</b> sample and compute k for every pair. That table is the kernel matrix.</p>
        <ol class="tight">
          <li>Fit a kernel ridge classifier on the training split: score(x) = &Sigma;<sub>m</sub> &alpha;<sub>m</sub> k(x, x<sub>m</sub>), with &alpha; = (K + &lambda;I)<sup>&minus;1</sup>y and y = &plusmn;1.</li>
          <li>Predict the class from the sign of the score.</li>
          <li>Score it on the held-out test split, and compare with the same classifier using a plain linear kernel on the raw features.</li>
        </ol>
        <p>${c.classify}</p>`,
      tryIt: s.id === "iqp" ? "Switch <b>reps</b> between 1 and 2 and compare the train and test accuracy." : "Hover the kernel matrix: bright blocks on the diagonal mean samples of the same class look alike.",
      main: `<div class="card">
          ${s.id === "iqp" ? `<div class="select-row" style="margin-bottom:12px"><label for="repsSel"><b>Repetitions (reps)</b></label>
            <select id="repsSel"><option value="1">1 (default)</option><option value="2">2 (Havl&iacute;&ccaron;ek et al.)</option><option value="3">3</option></select></div>` : ""}
          <div class="stats" id="stats"><div class="loading">Computing the kernel&hellip;</div></div>
          <div class="grid grid-2">
            <div><h3>Kernel matrix</h3><div id="heatmap"></div></div>
            <div><h3 id="resultTitle">Result</h3><div id="result"></div></div>
          </div></div>`,
    });
    const run = async () => {
      $("#stats").innerHTML = `<div class="loading">Computing the kernel&hellip;</div>`;
      try {
        const r = await Engine.evaluate(s.id, s.options);
        if (current !== s || s.step !== idx) return;
        const delta = r.test_accuracy - r.baseline_test_accuracy;
        $("#stats").innerHTML = `
          <div class="stat"><div class="label">Train accuracy</div><div class="value">${pct(r.train_accuracy)}</div><div class="hint">quantum kernel</div></div>
          <div class="stat"><div class="label">Test accuracy</div><div class="value">${pct(r.test_accuracy)}</div><div class="hint">quantum kernel, unseen data</div></div>
          <div class="stat"><div class="label">Linear baseline</div><div class="value">${pct(r.baseline_test_accuracy)}</div><div class="hint">${Math.abs(delta) < 0.005 ? "same as the quantum kernel" : delta > 0 ? `quantum kernel is ${Math.round(delta * 100)} points better` : `baseline is ${Math.round(-delta * 100)} points better`}</div></div>`;
        Viz.heatmap($("#heatmap"), r.kernel, s.ds);
        renderResult(s, r);
      } catch (e) {
        $("#stats").innerHTML = `<p class="error">Kernel evaluation failed: ${esc(e.message)}</p>`;
      }
    };
    if (s.id === "iqp") {
      $("#repsSel").value = String(s.options.reps);
      $("#repsSel").addEventListener("change", (e) => { s.options = { reps: +e.target.value }; s.sample = null; s.gateK = null; run(); });
    }
    run();
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
    const mark = (i) => (r.predictions[i] === ds.y[i] ? "&#10003;" : `<b class="error">&times;</b>`);
    if (s.id === "basis") {
      const trainKeys = new Set(ds.X.filter((_, i) => ds.split[i] === "train").map((x) => x.join("")));
      box.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Animal</th><th>|x&rang;</th><th>True</th><th>Predicted</th><th>Seen in training?</th></tr></thead><tbody>
        ${test.map((i) => `<tr><td>${esc(ds.names[i])}</td><td class="mono">|${ds.X[i].join("")}&rang;</td><td>${ds.class_names[ds.y[i]]}</td>
        <td>${ds.class_names[r.predictions[i]]} ${mark(i)}</td>
        <td>${trainKeys.has(ds.X[i].join("")) ? "yes, identical twin" : "<b>no</b>: kernel = 0, default guess"}</td></tr>`).join("")}</tbody></table></div>
        <p class="sub" style="margin-top:8px">A new bit pattern is orthogonal to every training state, so its score is exactly 0 and the classifier falls back to a default class. Any correct answer there is luck, not learning.</p>`;
    } else {
      box.innerHTML = `<div class="image-grid"></div>`;
      const grid = box.querySelector(".image-grid");
      test.forEach((i) => {
        const d = document.createElement("div");
        d.className = "thumb";
        d.appendChild(Viz.imageCanvas(ds.X[i], ds.image_shape));
        d.insertAdjacentHTML("beforeend", `<span>${ds.class_names[r.predictions[i]]} ${mark(i)}</span>`);
        grid.appendChild(d);
      });
    }
  }

  // ------------------------------------------------------------ step 8: recap, quiz, code
  function stepRecap(s, idx) {
    const c = CONTENT[s.id], m = meta(s.id);
    const nextId = ORDER[ORDER.indexOf(s.id) + 1];
    frame(s, idx, {
      title: "Recap and check yourself",
      explain: `<div class="callout"><strong>Takeaway.</strong> ${c.takeaway}</div>
        <h3>Strengths</h3><ul class="tight pros">${m.pros.map((p) => `<li>${p}</li>`).join("")}</ul>
        <h3 style="margin-top:12px">Limits</h3><ul class="tight cons">${m.cons.map((p) => `<li>${p}</li>`).join("")}</ul>`,
      main: `<div class="card"><h3>Quick quiz</h3><div id="quiz"></div><p id="quizScore" class="readout"></p></div>
        <div class="card"><div class="code-head"><h3>Try it in Qiskit</h3><button class="btn secondary" id="copyCode">Copy</button></div>
          <p class="sub">Runs with Qiskit 2.x (<code>pip install qiskit</code>). Note: Qiskit orders bits with qubit 0 on the <b>right</b>; this lab puts it on the left.</p>
          <pre class="code"><code id="code"></code></pre></div>
        <div class="card next-card"><h3>Next</h3>${nextId ? `<a class="btn" href="#${nextId}/1">${meta(nextId).name} &rarr;</a>` : `<a class="btn" href="#compare">Compare all six encodings &rarr;</a>`}</div>`,
    });
    $("#code").textContent = c.qiskit;
    $("#copyCode").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(c.qiskit); $("#copyCode").textContent = "Copied"; }
      catch (_) { $("#copyCode").textContent = "Select and copy"; }
    });
    const quizBox = $("#quiz");
    const draw = () => {
      quizBox.innerHTML = c.quiz.map((q, qi) => {
        const ans = s.quiz[qi];
        return `<div class="q"><p class="q-text"><b>Q${qi + 1}.</b> ${q.q}</p><div class="q-opts">
          ${q.options.map((o, oi) => {
            const state = ans === undefined ? "" : oi === q.answer ? "correct" : oi === ans ? "wrong" : "";
            return `<button class="q-opt ${state}" data-q="${qi}" data-o="${oi}" ${ans !== undefined ? "disabled" : ""}>${o}</button>`;
          }).join("")}</div>
          ${ans !== undefined ? `<p class="q-why ${ans === q.answer ? "ok" : "no"}">${ans === q.answer ? "Correct." : "Not quite."} ${q.why}</p>` : ""}</div>`;
      }).join("");
      quizBox.querySelectorAll(".q-opt").forEach((b) => b.addEventListener("click", () => { s.quiz[+b.dataset.q] = +b.dataset.o; draw(); }));
      const answered = Object.keys(s.quiz).length;
      const right = c.quiz.filter((q, qi) => s.quiz[qi] === q.answer).length;
      $("#quizScore").innerHTML = answered === c.quiz.length
        ? `Score: <b>${right} / ${c.quiz.length}</b> <button class="btn secondary" id="quizReset">Try again</button>` : "";
      if ($("#quizReset")) $("#quizReset").addEventListener("click", () => { s.quiz = {}; draw(); });
      U.bindTerms(quizBox);
    };
    draw();
  }

  const STEP_RENDERERS = {
    idea: stepIdea, data: stepData, prep: stepPrep, circuit: stepCircuit,
    measure: stepMeasure, kernel: stepKernel, classify: stepClassify, recap: stepRecap,
  };

  function leave() {
    timers.forEach(clearInterval);
    timers = [];
    current = null;
  }

  window.Lesson = { render, leave, step: () => (current ? current.step : null), id: () => (current ? current.id : null) };
})();
