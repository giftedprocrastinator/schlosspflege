// logic.js — reine, DOM-/netzwerkfreie Logik. Import im Browser + testbar via `node logic.js`.

// Fortschritt einer Task-Liste: erledigt / gesamt / Prozent (gerundet).
export function zoneProgress(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

// Selbsttest (läuft nur unter Node, nicht im Browser).
if (typeof window === "undefined") {
  const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };
  let r = zoneProgress([]);
  assert(r.total === 0 && r.done === 0 && r.pct === 0, "leere Liste → 0/0/0%");
  r = zoneProgress([{ done: true }, { done: true }]);
  assert(r.total === 2 && r.done === 2 && r.pct === 100, "alle erledigt → 100%");
  r = zoneProgress([{ done: true }, { done: false }, { done: false }]);
  assert(r.total === 3 && r.done === 1 && r.pct === 33, "1 von 3 → 33%");
  console.log("logic.js: alle Tests grün ✓");
}
