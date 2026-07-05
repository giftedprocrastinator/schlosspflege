// logic.js — reine, DOM-/netzwerkfreie Logik. Import im Browser + testbar via `node logic.js`.

const DAY = 86400000;

// Lokaler Tagesanfang — Turnus rechnet in Kalendertagen, nicht in 24h-Fenstern:
// „täglich" um 22:00 abgehakt ist am nächsten Morgen wieder fällig, nicht erst 22:00.
function dayStart(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Ist eine Aufgabe aktuell erledigt?
// Ohne Turnus: das done-Flag. Mit Turnus (interval_days): erledigt, bis
// interval_days Kalendertage nach dem Erledigungs-Tag vergangen sind.
export function taskIsDone(task, now = Date.now()) {
  if (!task.interval_days) return !!task.done;
  if (!task.done_at) return false;
  return now < nextDueAt(task);
}

// Fortschritt einer Task-Liste: erledigt / gesamt / Prozent (gerundet).
export function zoneProgress(tasks, now = Date.now()) {
  const total = tasks.length;
  const done = tasks.filter(t => taskIsDone(t, now)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

// Nächste Fälligkeit: nie erledigt = sofort (0); einmalig erledigt = nie wieder (Infinity).
// Mit Turnus: Tagesanfang des Erledigungs-Tags + Turnus (= Mitternacht des Fälligkeits-Tags).
export function nextDueAt(task) {
  if (!task.interval_days) return task.done ? Infinity : 0;
  if (!task.done_at) return 0;
  return dayStart(new Date(task.done_at).getTime()) + task.interval_days * DAY;
}

// Ende der aktuellen Kalenderwoche (Sonntag 24:00, lokale Zeit).
export function weekEnd(now = Date.now()) {
  const d = new Date(now);
  const mondayOffset = (d.getDay() + 6) % 7; // Mo=0 … So=6
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - mondayOffset)).getTime();
}

// Wochen-Rechnung einer Zone: was ist jetzt fällig, was kommt bis Sonntag wieder?
export function zoneWeek(tasks, now = Date.now()) {
  const end = weekEnd(now);
  let due = 0, returning = 0, nextBack = null;
  for (const t of tasks) {
    if (!taskIsDone(t, now)) { due++; continue; }
    const nd = nextDueAt(t);
    if (nd < end) { returning++; if (nextBack === null || nd < nextBack) nextBack = nd; }
  }
  return { due, returning, nextBack };
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

  // Wochen-Rechnung (lokale Zeit, Do 2026-07-02 mittags → Woche endet Mo 2026-07-06 00:00)
  const thu = new Date(2026, 6, 2, 12).getTime();
  assert(weekEnd(thu) === new Date(2026, 6, 6).getTime(), "Woche endet Montag 00:00");
  assert(nextDueAt({ done: false }) === 0, "offene Einmal-Aufgabe → sofort fällig");
  assert(nextDueAt({ done: true }) === Infinity, "erledigte Einmal-Aufgabe → nie wieder");
  const dailyDoneToday = { interval_days: 1, done_at: new Date(2026, 6, 2, 10).toISOString() };
  const weeklyOverdue = { interval_days: 7, done_at: new Date(2026, 5, 20).toISOString() };
  const quarterlyFresh = { interval_days: 90, done_at: new Date(2026, 5, 25).toISOString() };
  let w = zoneWeek([dailyDoneToday, weeklyOverdue, quarterlyFresh], thu);
  assert(w.due === 1, "überfällige Wochen-Aufgabe → fällig");
  assert(w.returning === 1, "tägliche kommt diese Woche wieder");
  assert(w.nextBack === new Date(2026, 6, 3).getTime(), "nächste Rückkehr = morgen 00:00 (Kalendertag)");
  const lateNight = { interval_days: 1, done_at: new Date(2026, 6, 1, 22).toISOString() };
  assert(taskIsDone(lateNight, new Date(2026, 6, 1, 23).getTime()), "abends abgehakt → am selben Tag erledigt");
  assert(!taskIsDone(lateNight, new Date(2026, 6, 2, 0, 30).getTime()), "täglich → am nächsten Kalendertag wieder offen");
  w = zoneWeek([quarterlyFresh], thu);
  assert(w.due === 0 && w.returning === 0 && w.nextBack === null, "frisch erledigt, langer Turnus → Ruhe");

  console.log("logic.js: alle Tests grün ✓");
}
