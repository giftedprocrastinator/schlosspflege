// logic.js — reine, DOM-/netzwerkfreie Logik. Import im Browser + testbar via `node logic.js`.

const DAY = 86400000;

// Ist eine Aufgabe aktuell erledigt?
// Ohne Turnus: das done-Flag. Mit Turnus (interval_days): erledigt, solange
// die letzte Erledigung jünger als der Turnus ist — danach wieder offen.
export function taskIsDone(task, now = Date.now()) {
  if (!task.interval_days) return !!task.done;
  if (!task.done_at) return false;
  return now - new Date(task.done_at).getTime() < task.interval_days * DAY;
}

// Fortschritt einer Task-Liste: erledigt / gesamt / Prozent (gerundet).
export function zoneProgress(tasks, now = Date.now()) {
  const total = tasks.length;
  const done = tasks.filter(t => taskIsDone(t, now)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

// Selbsttest (läuft nur unter Node, nicht im Browser).
if (typeof window === "undefined") {
  const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } };
  const now = Date.parse("2026-07-02T12:00:00Z");

  let r = zoneProgress([], now);
  assert(r.total === 0 && r.done === 0 && r.pct === 0, "leere Liste → 0/0/0%");
  r = zoneProgress([{ done: true }, { done: true }], now);
  assert(r.total === 2 && r.done === 2 && r.pct === 100, "alle erledigt → 100%");
  r = zoneProgress([{ done: true }, { done: false }, { done: false }], now);
  assert(r.total === 3 && r.done === 1 && r.pct === 33, "1 von 3 → 33%");

  assert(!taskIsDone({ interval_days: 14, done: true, done_at: null }, now), "Turnus ohne done_at → offen");
  assert(taskIsDone({ interval_days: 14, done_at: "2026-06-25T12:00:00Z" }, now), "vor 7 Tagen, Turnus 14 → erledigt");
  assert(!taskIsDone({ interval_days: 14, done_at: "2026-06-01T12:00:00Z" }, now), "vor 31 Tagen, Turnus 14 → wieder offen");
  assert(!taskIsDone({ interval_days: 7, done_at: "2026-06-25T12:00:00Z" }, now), "genau 7 Tage, Turnus 7 → wieder offen");
  r = zoneProgress([{ interval_days: 7, done_at: "2026-07-01T12:00:00Z" }, { done: false }], now);
  assert(r.done === 1 && r.total === 2 && r.pct === 50, "Turnus-Task zählt in Fortschritt");

  console.log("logic.js: alle Tests grün ✓");
}
