/* Plain-SVG visualisations: circuits, state vectors, Bloch spheres, data plots. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const tip = () => document.getElementById("tooltip");

  function svg(w, h, cls = "viz") {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", `0 0 ${w} ${h}`);
    s.setAttribute("class", cls);
    return s;
  }
  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") e.textContent = v;
      else if (k === "style") e.style.cssText = v;
      else e.setAttribute(k, v);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function showTip(evt, html) {
    const t = tip();
    t.innerHTML = html;
    t.hidden = false;
    const pad = 14;
    let x = evt.clientX + pad, y = evt.clientY + pad;
    const r = t.getBoundingClientRect();
    if (x + r.width > innerWidth - 8) x = evt.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = evt.clientY - r.height - pad;
    t.style.left = x + "px";
    t.style.top = y + "px";
  }
  const hideTip = () => { tip().hidden = true; };
  function hover(node, html) {
    node.addEventListener("mousemove", (e) => showTip(e, typeof html === "function" ? html() : html));
    node.addEventListener("mouseleave", hideTip);
  }

  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
  }

  const fmt = (v, d = 2) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(d);
  const ket = (i, n) => i.toString(2).padStart(n, "0");

  // ------------------------------------------------------------ circuit diagram
  function gateLabel(g) {
    const p = g.params && g.params.length ? g.params[0] : null;
    switch (g.gate) {
      case "MCRY": return `RY(${fmt(p)})`;
      case "RZZ": return `ZZ(${fmt(p)})`;
      case "PREP": return "State prep";
      case "SIGN": return "±1 signs";
      default: return p === null ? g.gate : `${g.gate}(${fmt(p)})`;
    }
  }

  // opts.upTo = k highlights gate k-1 as "just applied" and fades gates >= k.
  // opts.onGateClick(i) makes every gate clickable.
  function circuit(container, n, gates, opts = {}) {
    const next = new Array(n).fill(0), placed = [];
    for (const g of gates) {
      const qs = [...g.targets, ...(g.controls || [])];
      const lo = Math.min(...qs), hi = Math.max(...qs);
      let col = 0;
      for (let q = lo; q <= hi; q++) col = Math.max(col, next[q]);
      for (let q = lo; q <= hi; q++) next[q] = col + 1;
      placed.push({ g, col, lo, hi });
    }
    const ncol = Math.max(1, ...next);
    const colW = 78, rowH = 52, left = 64, top = 30;
    const W = left + ncol * colW + 40, H = top + (n - 1) * rowH + 34;
    const s = svg(W, H);
    s.style.minWidth = Math.round(W * 0.7) + "px"; // shrink a little to fit, then scroll
    s.style.maxWidth = W * 1.15 + "px";
    const y = (q) => top + q * rowH;
    const x = (c) => left + c * colW + colW / 2;
    for (let q = 0; q < n; q++) {
      el("line", { x1: left - 8, x2: W - 20, y1: y(q), y2: y(q), style: "stroke:var(--text-muted);stroke-width:1.2" }, s);
      el("text", { x: 6, y: y(q) + 4, text: `q${q} |0⟩`, style: "font-family:var(--mono);font-size:12px;fill:var(--text-secondary)" }, s);
    }
    const stepping = opts.upTo !== undefined;
    placed.forEach(({ g, col, lo, hi }, gi) => {
      const cx = x(col);
      const grp = el("g", { class: "gate" }, s);
      const state = !stepping ? "done" : gi < opts.upTo - 1 ? "done" : gi === opts.upTo - 1 ? "current" : "pending";
      if (state === "pending") grp.style.opacity = "0.28";
      if (opts.onGateClick) {
        grp.style.cursor = "pointer";
        grp.addEventListener("click", () => opts.onGateClick(gi));
      }
      const boxStyle = state === "current"
        ? "fill:var(--accent-soft);stroke:var(--accent);stroke-width:2.5"
        : "fill:var(--surface-1);stroke:var(--accent);stroke-width:1.5";
      hover(grp, `<b>${g.gate}</b>${g.params && g.params.length && g.gate !== "PREP" && g.gate !== "SIGN" ? ` &theta; = ${fmt(g.params[0], 4)}` : ""}<br>qubits: ${[...(g.controls || []).map((c, k) => `q${c}=${(g.ctrl_state || [])[k] ?? 1} (ctrl)`), ...g.targets.map((t) => "q" + t)].join(", ")}`);
      if (g.controls && g.controls.length) {
        el("line", { x1: cx, x2: cx, y1: y(lo), y2: y(hi), style: "stroke:var(--accent);stroke-width:1.5" }, grp);
        g.controls.forEach((c, k) => {
          const on = (g.ctrl_state || [])[k] ?? 1;
          el("circle", { cx, cy: y(c), r: 5.5, style: on ? "fill:var(--accent)" : "fill:var(--surface-1);stroke:var(--accent);stroke-width:1.5" }, grp);
        });
      }
      if (g.gate === "CNOT") {
        const t = g.targets[0];
        el("circle", { cx, cy: y(t), r: 11, style: "fill:var(--surface-1);stroke:var(--accent);stroke-width:1.5" }, grp);
        el("line", { x1: cx - 11, x2: cx + 11, y1: y(t), y2: y(t), style: "stroke:var(--accent);stroke-width:1.5" }, grp);
        el("line", { x1: cx, x2: cx, y1: y(t) - 11, y2: y(t) + 11, style: "stroke:var(--accent);stroke-width:1.5" }, grp);
        return;
      }
      const span = g.gate === "RZZ" || g.gate === "PREP" || g.gate === "SIGN";
      const t0 = span ? Math.min(...g.targets) : g.targets[0];
      const t1 = span ? Math.max(...g.targets) : g.targets[0];
      const bw = colW - 10, by0 = y(t0) - 16, bh = y(t1) - y(t0) + 32;
      el("rect", { x: cx - bw / 2, y: by0, width: bw, height: bh, rx: 6, style: boxStyle }, grp);
      el("text", { x: cx, y: by0 + bh / 2 + 4, "text-anchor": "middle", text: gateLabel(g),
        style: "font-family:var(--mono);font-size:11px;fill:var(--text-primary)" }, grp);
    });
    container.replaceChildren(s);
  }

  // ------------------------------------------------------------ probability bars
  // opts.sampled: measured frequencies (bars); the exact probabilities are then drawn as ticks.
  function probBars(container, probs, n, opts = {}) {
    const sampled = opts.sampled;
    const N = probs.length, W = Math.max(320, N * 34 + 50), H = 200;
    const m = { l: 40, r: 10, t: 10, b: n >= 4 ? 46 : 30 };
    const s = svg(W, H + (m.b - 30));
    const ph = H - m.t - 30, pw = W - m.l - m.r, bw = pw / N;
    const maxP = Math.min(1, Math.max(0.25, ...probs, ...(sampled || [])) * 1.08);
    const yv = (p) => m.t + ph - (p / maxP) * ph;
    for (const t of [0, maxP / 2, maxP]) {
      el("line", { x1: m.l, x2: W - m.r, y1: yv(t), y2: yv(t), class: "gridline" }, s);
      el("text", { x: m.l - 6, y: yv(t) + 4, "text-anchor": "end", text: t.toFixed(2) }, s);
    }
    probs.forEach((p, i) => {
      const x0 = m.l + i * bw + 1;
      const bar = sampled ? sampled[i] : p;
      const h = Math.max(0, m.t + ph - yv(bar));
      const g = el("g", {}, s);
      el("rect", { x: m.l + i * bw, y: m.t, width: bw, height: ph, style: "fill:transparent" }, g);
      if (h > 0.5) el("rect", { x: x0, y: yv(bar), width: Math.max(1, bw - 2), height: h, rx: Math.min(4, bw / 4), style: "fill:var(--series-1)" }, g);
      if (sampled) el("line", { x1: x0 - 1, x2: x0 + bw - 1, y1: yv(p), y2: yv(p), style: "stroke:var(--text-primary);stroke-width:2.5;stroke-linecap:round" }, g);
      const ty = m.t + ph + 14;
      const lbl = el("text", { x: x0 + bw / 2, y: ty, "text-anchor": n >= 4 ? "end" : "middle", text: `|${ket(i, n)}\u27e9`,
        style: "font-family:var(--mono);font-size:10px" }, g);
      if (n >= 4) lbl.setAttribute("transform", `rotate(-50 ${x0 + bw / 2} ${ty})`);
      hover(g, `<b>|${ket(i, n)}\u27e9</b><br>exact P = ${p.toFixed(4)}${sampled ? `<br>measured: ${opts.counts[i]} / ${opts.shots} = ${sampled[i].toFixed(3)}` : ""}`);
    });
    el("line", { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph, style: "stroke:var(--text-muted)" }, s);
    container.replaceChildren(s);
  }

  // ------------------------------------------------------------ line chart (single series + optional marker)
  function lineChart(container, xs, ys, opts = {}) {
    const W = 340, H = 230, m = { l: 44, r: 12, t: 12, b: 40 };
    const s = svg(W, H);
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const x0 = xs[0], x1 = xs[xs.length - 1], yMax = opts.yMax ?? Math.max(...ys);
    const sx = (v) => m.l + ((v - x0) / (x1 - x0)) * pw;
    const sy = (v) => m.t + ph - (v / yMax) * ph;
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const yv = t * yMax;
      el("line", { x1: m.l, x2: m.l + pw, y1: sy(yv), y2: sy(yv), class: "gridline" }, s);
      el("text", { x: m.l - 6, y: sy(yv) + 4, "text-anchor": "end", text: +yv.toFixed(2) }, s);
      const xv = x0 + t * (x1 - x0);
      el("text", { x: sx(xv), y: m.t + ph + 16, "text-anchor": "middle", text: +xv.toFixed(2) }, s);
    }
    el("text", { x: m.l + pw / 2, y: H - 4, "text-anchor": "middle", text: opts.xLabel || "", style: "font-size:12px;fill:var(--text-secondary)" }, s);
    const yl = el("text", { x: 12, y: m.t + ph / 2, "text-anchor": "middle", text: opts.yLabel || "", style: "font-size:12px;fill:var(--text-secondary)" }, s);
    yl.setAttribute("transform", `rotate(-90 12 ${m.t + ph / 2})`);
    el("path", { d: xs.map((x, i) => `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join(""),
      style: "fill:none;stroke:var(--series-1);stroke-width:2;stroke-linejoin:round" }, s);
    if (opts.marker) {
      const { x, y, label } = opts.marker;
      el("line", { x1: sx(x), x2: sx(x), y1: m.t, y2: m.t + ph, style: "stroke:var(--series-2);stroke-width:1.2;stroke-dasharray:4 3" }, s);
      el("circle", { cx: sx(x), cy: sy(y), r: 5.5, style: "fill:var(--series-2);stroke:var(--surface-1);stroke-width:2" }, s);
      if (label) el("text", { x: Math.min(sx(x) + 8, W - 60), y: Math.max(sy(y) - 8, 12), text: label, style: "font-size:11px;fill:var(--text-primary)" }, s);
    }
    // crosshair + tooltip
    const cross = el("line", { y1: m.t, y2: m.t + ph, style: "stroke:var(--text-muted);stroke-width:1;opacity:0" }, s);
    const hit = el("rect", { x: m.l, y: m.t, width: pw, height: ph, style: "fill:transparent" }, s);
    hit.addEventListener("mousemove", (e) => {
      const r = s.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(xs.length - 1, Math.round(((px - m.l) / pw) * (xs.length - 1))));
      cross.setAttribute("x1", sx(xs[i])); cross.setAttribute("x2", sx(xs[i])); cross.style.opacity = 1;
      showTip(e, `${opts.xLabel || "x"} = ${xs[i].toFixed(2)}<br>${opts.yLabel || "y"} = <b>${ys[i].toFixed(3)}</b>`);
    });
    hit.addEventListener("mouseleave", () => { cross.style.opacity = 0; hideTip(); });
    container.replaceChildren(s);
  }

  // ------------------------------------------------------------ state-vector table
  function phaseDial(phi, mag) {
    const r = 9, c = 11;
    const x = c + r * Math.cos(phi), y = c - r * Math.sin(phi);
    return `<svg width="22" height="22" viewBox="0 0 22 22" aria-label="phase ${fmt(phi * 180 / Math.PI, 0)} degrees" style="vertical-align:middle">
      <circle cx="${c}" cy="${c}" r="${r}" style="fill:none;stroke:var(--border);stroke-width:1.5"/>
      ${mag > 1e-9 ? `<line x1="${c}" y1="${c}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" style="stroke:var(--series-2);stroke-width:2.2;stroke-linecap:round"/>` : ""}
    </svg>`;
  }

  function stateTable(container, sv, n) {
    const probs = sv.map(([a, b]) => a * a + b * b), maxP = Math.max(...probs);
    const rows = sv.map(([re, im], i) => {
      const mag = Math.hypot(re, im), ph = Math.atan2(im, re);
      const amp = `${fmt(re, 3)} ${im < 0 ? "−" : "+"} ${fmt(Math.abs(im), 3)}i`;
      return `<tr><td class="mono">|${ket(i, n)}⟩</td><td class="num">${amp}</td>
        <td>${phaseDial(ph, mag)} <span class="mono">${mag > 1e-9 ? fmt(ph * 180 / Math.PI, 0) + "°" : "–"}</span></td>
        <td class="bar-cell"><div class="bar" style="width:${(probs[i] / (maxP || 1)) * 100}%"></div><span>${probs[i].toFixed(3)}</span></td></tr>`;
    }).join("");
    container.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Basis state</th><th>Amplitude</th><th>Phase</th><th>Probability</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ Bloch spheres
  function bloch(container, vectors) {
    const figs = vectors.map((v, q) => {
      const S = 150, c = S / 2, R = 54, k = 0.38;
      const P = (x, y, z) => [c + R * (y - k * x * 0.8), c - R * (z - k * x * 0.6)];
      const s = svg(S, S);
      el("circle", { cx: c, cy: c, r: R, style: "fill:var(--surface-2);stroke:var(--border);stroke-width:1.2" }, s);
      el("ellipse", { cx: c, cy: c, rx: R, ry: R * 0.3, style: "fill:none;stroke:var(--border);stroke-dasharray:3 3" }, s);
      const axis = (a, b, label, anchor) => {
        const [x1, y1] = P(...a), [x2, y2] = P(...b);
        el("line", { x1, y1, x2, y2, style: "stroke:var(--text-muted);stroke-width:.8" }, s);
        el("text", { x: x2 + (anchor === "start" ? 3 : anchor === "end" ? -3 : 0), y: y2 + (label.includes("1") ? 12 : label.includes("0") ? -4 : 4), "text-anchor": anchor, text: label, style: "font-size:10px" }, s);
      };
      axis([0, 0, -1], [0, 0, 1], "|0⟩", "middle");
      el("text", { x: c, y: c + R + 14, "text-anchor": "middle", text: "|1⟩", style: "font-size:10px" }, s);
      axis([-1, 0, 0], [1, 0, 0], "x", "end");
      axis([0, -1, 0], [0, 1, 0], "y", "start");
      const [vx, vy] = P(v.x, v.y, v.z);
      el("line", { x1: c, y1: c, x2: vx, y2: vy, style: "stroke:var(--series-2);stroke-width:2.5;stroke-linecap:round" }, s);
      el("circle", { cx: vx, cy: vy, r: 4.5, style: "fill:var(--series-2);stroke:var(--surface-1);stroke-width:2" }, s);
      const len = Math.hypot(v.x, v.y, v.z);
      const fig = document.createElement("figure");
      fig.appendChild(s);
      const cap = document.createElement("figcaption");
      cap.innerHTML = `q${q} &middot; |r| = ${len.toFixed(2)}${len < 0.99 ? " <b>(entangled)</b>" : ""}`;
      fig.appendChild(cap);
      hover(s, `<b>Qubit ${q}</b><br>Bloch (x, y, z) = (${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)})<br>length ${len.toFixed(3)}: ${len < 0.99 ? "shorter than 1, so this qubit is entangled with the others" : "pure single-qubit state"}`);
      return fig;
    });
    const row = document.createElement("div");
    row.className = "bloch-row";
    figs.forEach((f) => row.appendChild(f));
    container.replaceChildren(row);
  }

  // ------------------------------------------------------------ scatter + decision regions
  function marker(parent, cls, x, y, r, style) {
    if (cls === 0) return el("circle", { cx: x, cy: y, r, style }, parent);
    return el("rect", { x: x - r * 0.9, y: y - r * 0.9, width: r * 1.8, height: r * 1.8, rx: 2, style }, parent);
  }

  function scatter(container, ds, opts = {}) {
    const W = 460, H = 380, m = { l: 52, r: 14, t: 12, b: 44 };
    const s = svg(W, H);
    const [[x0, x1], [y0, y1]] = ds.feature_ranges;
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const sx = (v) => m.l + ((v - x0) / (x1 - x0)) * pw;
    const sy = (v) => m.t + ph - ((v - y0) / (y1 - y0)) * ph;

    if (opts.grid) {
      const { size, x, y, scores } = opts.grid;
      const cw = pw / (size - 1), chh = ph / (size - 1);
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const sc = scores[j * size + i];
        const a = Math.min(1, Math.abs(sc)) * 0.75 + 0.25;
        el("rect", { x: sx(x[i]) - cw / 2, y: sy(y[j]) - chh / 2, width: cw + 0.6, height: chh + 0.6,
          style: `fill:var(${sc > 0 ? "--series-2-soft" : "--series-1-soft"});opacity:${a.toFixed(2)}` }, s);
      }
    }
    const ticks = (a, b) => [0, 0.25, 0.5, 0.75, 1].map((t) => a + t * (b - a));
    for (const t of ticks(x0, x1)) {
      el("line", { x1: sx(t), x2: sx(t), y1: m.t, y2: m.t + ph, class: "gridline", style: opts.grid ? "opacity:.35" : "" }, s);
      el("text", { x: sx(t), y: m.t + ph + 16, "text-anchor": "middle", text: +t.toFixed(2) }, s);
    }
    for (const t of ticks(y0, y1)) {
      el("line", { x1: m.l, x2: m.l + pw, y1: sy(t), y2: sy(t), class: "gridline", style: opts.grid ? "opacity:.35" : "" }, s);
      el("text", { x: m.l - 6, y: sy(t) + 4, "text-anchor": "end", text: +t.toFixed(2) }, s);
    }
    el("rect", { x: m.l, y: m.t, width: pw, height: ph, style: "fill:none;stroke:var(--border)" }, s);
    el("text", { x: m.l + pw / 2, y: H - 6, "text-anchor": "middle", text: ds.feature_names[0], style: "font-size:12px;fill:var(--text-secondary)" }, s);
    const yl = el("text", { x: 14, y: m.t + ph / 2, "text-anchor": "middle", text: ds.feature_names[1], style: "font-size:12px;fill:var(--text-secondary)" }, s);
    yl.setAttribute("transform", `rotate(-90 14 ${m.t + ph / 2})`);

    ds.X.forEach(([a, b], i) => {
      const cls = ds.y[i], test = ds.split[i] === "test";
      const color = cls ? "var(--series-2)" : "var(--series-1)";
      const g = el("g", { style: "cursor:pointer" }, s);
      el("circle", { cx: sx(a), cy: sy(b), r: 12, style: "fill:transparent" }, g);
      if (opts.selected === i || opts.selectedB === i) {
        const isB = opts.selectedB === i && opts.selected !== i;
        el("circle", { cx: sx(a), cy: sy(b), r: 10, style: `fill:none;stroke:var(--text-primary);stroke-width:2${isB ? ";stroke-dasharray:3 2" : ""}` }, g);
        if (opts.selectedB !== undefined) el("text", { x: sx(a) - 15, y: sy(b) - 9, text: opts.selected === i ? "A" : "B", style: "font-size:12px;font-weight:700;fill:var(--text-primary)" }, g);
      }
      marker(g, cls, sx(a), sy(b), 5, test ? `fill:var(--surface-1);stroke:${color};stroke-width:2.5`
        : `fill:${color};stroke:var(--surface-1);stroke-width:1.5`);
      const pred = opts.predictions ? opts.predictions[i] : null;
      const wrong = pred !== null && pred !== cls;
      if (wrong) el("text", { x: sx(a) + 7, y: sy(b) - 5, text: "×", style: "font-size:13px;font-weight:700;fill:var(--critical)" }, g);
      hover(g, () => `<b>Sample #${i}</b> (${ds.split[i]})<br>${ds.feature_names[0]}: ${a}<br>${ds.feature_names[1]}: ${b}<br>label: <b>${ds.class_names[cls]}</b>${pred !== null ? `<br>predicted: ${ds.class_names[pred]}${wrong ? " (wrong)" : ""}` : ""}<br><i>click to encode</i>`);
      if (opts.onPick) g.addEventListener("click", () => opts.onPick(i));
    });
    container.replaceChildren(s);
  }

  function scatterLegend(ds, withGrid) {
    return `<div class="legend">
      <span><svg width="12" height="12"><circle cx="6" cy="6" r="5" style="fill:var(--series-1)"/></svg>${ds.class_names[0]}</span>
      <span><svg width="12" height="12"><rect x="1" y="1" width="10" height="10" rx="2" style="fill:var(--series-2)"/></svg>${ds.class_names[1]}</span>
      <span><svg width="12" height="12"><circle cx="6" cy="6" r="4" style="fill:none;stroke:var(--text-secondary);stroke-width:2"/></svg>hollow = test point</span>
      ${withGrid ? `<span><b style="color:var(--critical)">&times;</b> misclassified</span><span>shading = classifier's prediction</span>` : ""}
    </div>`;
  }

  // ------------------------------------------------------------ kernel heatmap
  function heatmap(container, K, ds) {
    const order = ds.y.map((c, i) => [c, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((p) => p[1]);
    const N = order.length, size = Math.min(420, Math.max(240, N * 7)), m = 28;
    const cell = size / N;
    const s = svg(size + m + 8, size + m + 8);
    const lo = css("--seq-lo") || "#f0efec", hi = css("--seq-hi") || "#0d366b";
    order.forEach((i, r) => order.forEach((j, c) => {
      const v = K[i][j];
      const rect = el("rect", { x: m + c * cell, y: m + r * cell, width: cell + 0.3, height: cell + 0.3, fill: mix(lo, hi, v) }, s);
      hover(rect, `k(#${i}, #${j}) = <b>${v.toFixed(3)}</b><br>${ds.class_names[ds.y[i]]} vs ${ds.class_names[ds.y[j]]}`);
    }));
    const split = ds.y.filter((c) => c === 0).length;
    for (const [a, b, c, d] of [[m + split * cell, m, m + split * cell, m + size], [m, m + split * cell, m + size, m + split * cell]])
      el("line", { x1: a, y1: b, x2: c, y2: d, style: "stroke:var(--series-2);stroke-width:1.5;stroke-dasharray:4 3" }, s);
    const lab = (x, y, t, rot) => { const e = el("text", { x, y, "text-anchor": "middle", text: t, style: "font-size:11px" }, s); if (rot) e.setAttribute("transform", `rotate(-90 ${x} ${y})`); };
    lab(m + (split * cell) / 2, 18, ds.class_names[0]);
    lab(m + split * cell + ((N - split) * cell) / 2, 18, ds.class_names[1]);
    lab(14, m + (split * cell) / 2, ds.class_names[0], true);
    lab(14, m + split * cell + ((N - split) * cell) / 2, ds.class_names[1], true);
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = `<span>0</span><span style="width:120px;height:10px;border-radius:3px;background:linear-gradient(90deg, ${lo}, ${hi})"></span><span>1 = identical states</span><span>samples sorted by class</span>`;
    container.replaceChildren(s, legend);
  }

  // ------------------------------------------------------------ images (amplitude encoding)
  function imageCanvas(values, shape, scale = 1) {
    const [h, w] = shape;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    const lo = css("--seq-lo") || "#f0efec", hi = css("--seq-hi") || "#0d366b";
    const max = Math.max(1e-9, ...values.map(Math.abs));
    values.forEach((v, k) => {
      ctx.fillStyle = mix(lo, hi, Math.min(1, Math.abs(v) / (max * scale)));
      ctx.fillRect(k % w, Math.floor(k / w), 1, 1);
    });
    return c;
  }

  window.Viz = { circuit, probBars, lineChart, stateTable, bloch, scatter, scatterLegend, heatmap, imageCanvas, hover, showTip, hideTip, fmt, ket };
})();
