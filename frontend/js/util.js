/* Small shared helpers. */
(function () {
  "use strict";
  const ORDER = ["basis", "angle", "phase", "amplitude", "hamiltonian", "iqp"];
  const STEPS = [
    { key: "idea", title: "Idea" },
    { key: "data", title: "Data" },
    { key: "prep", title: "Prepare" },
    { key: "circuit", title: "Circuit" },
    { key: "measure", title: "Measure" },
    { key: "kernel", title: "Similarity" },
    { key: "classify", title: "Classify" },
    { key: "recap", title: "Recap & quiz" },
  ];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* private mode or blocked storage */ } },
  };
  // Steps a viewer has opened, per encoding (a per-browser convenience only).
  const progress = {
    get(id) {
      try { return new Set(JSON.parse(store.get("qml-progress-" + id) || "[]")); } catch (_) { return new Set(); }
    },
    mark(id, step) {
      const s = progress.get(id);
      s.add(step);
      store.set("qml-progress-" + id, JSON.stringify([...s]));
    },
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const pct = (v) => `${Math.round(v * 100)}%`;
  const $ = (sel, root = document) => root.querySelector(sel);
  const meta = (id) => Engine.state.encodings.find((e) => e.id === id);

  // Hovering a .term shows its glossary entry.
  function bindTerms(root) {
    root.querySelectorAll(".term").forEach((t) => {
      if (t.dataset.bound) return;
      t.dataset.bound = "1";
      const key = t.dataset.term || t.textContent.trim();
      const def = window.GLOSSARY[key] || window.GLOSSARY[key.toLowerCase()];
      if (!def) return;
      t.tabIndex = 0;
      Viz.hover(t, `<b>${key}</b><br>${def}`);
      t.addEventListener("focus", () => {
        const r = t.getBoundingClientRect();
        Viz.showTip({ clientX: r.left, clientY: r.bottom }, `<b>${key}</b><br>${def}`);
      });
      t.addEventListener("blur", Viz.hideTip);
    });
  }

  window.U = { ORDER, STEPS, store, progress, esc, pct, $, meta, bindTerms };
})();
