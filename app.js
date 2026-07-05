import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { zoneProgress, taskIsDone, nextDueAt, zoneWeek, weekEnd } from "./logic.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
// User-Eingaben (Zonen-/Aufgabennamen) vor innerHTML-Interpolation entschärfen.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Einheitliches Fehler-Muster: Supabase-Fehler melden statt still verschlucken.
// Gibt data (bzw. true bei reinen Schreib-Calls) zurück, bei Fehler null.
const ok = ({ data, error }) => { if (error) alert(error.message); return error ? null : (data ?? true); };

// --- Sprache (DE/EN) ---
const STR = {
  de: {
    lede: "Ordnung fürs Zuhause — Zone für Zone.", emailPh: "deine@email.de",
    sendLink: "Magic-Link senden", enterEmail: "Bitte E-Mail eingeben.", sending: "Sende …",
    sent: "Link gesendet — klick ihn an oder gib den Code aus der Mail ein ✉️", sendFail: "Versand fehlgeschlagen: ",
    otpPh: "6-stelliger Code aus der Mail", otpVerify: "Mit Code anmelden",
    otpEnter: "Bitte E-Mail und Code eingeben.", otpFail: "Anmeldung fehlgeschlagen: ",
    unknownErr: "unbekannter Fehler (E-Mail-Einstellungen prüfen)",
    setupTitle: "Haushalt einrichten", createLabel: "Neuen Haushalt anlegen",
    namePh: "z. B. „Unser Schloss“", create: "Anlegen", or: "oder",
    joinLabel: "Einem Haushalt beitreten", codePh: "Invite-Code", join: "Beitreten",
    enterName: "Bitte einen Namen eingeben.", enterCode: "Bitte Invite-Code eingeben.",
    joinFail: "Beitritt fehlgeschlagen: ",
    navZones: "Zonen", navProgress: "Fortschritt", navHousehold: "Haushalt", logout: "Abmelden",
    thisWeek: "Diese Woche", zonePlan: "Zonen-Plan",
    noZones: "Noch keine Zonen — wähle unten eine Vorlage (mit Standardaufgaben samt Rhythmus) oder erstelle eine eigene.",
    ownZone: "✏️ Eigene Zone …", addZoneBtn: "Zone anlegen",
    zonePh: "Name der Zone (z. B. 🧺 Waschküche) …",
    doneOf: (d, tot) => `${d} von ${tot} erledigt`, noTasksTile: "noch keine Aufgaben",
    allZones: "← Alle Zonen", del: "löschen", renameHint: "Tippen zum Umbenennen",
    noTasks: "Noch keine Aufgaben.", taskPh: "Aufgabe hinzufügen …",
    confirmDelZone: "Zone samt Aufgaben löschen?",
    renamePrompt: "Zone umbenennen (Emoji voranstellen möglich):",
    overview: "Überblick", progressTitle: (pct) => `Fortschritt — ${pct} %`,
    totalOf: (d, tot) => `Gesamt: ${d} von ${tot} Aufgaben`,
    household: "Haushalt", shareCode: "Teile diesen Code, damit jemand beitreten kann:",
    intervals: { "": "einmalig", 1: "täglich", 3: "alle 3 Tage", 4: "alle 4 Tage", 7: "wöchentlich", 14: "alle 2 Wochen", 30: "monatlich", 90: "alle 3 Monate" },
    everyNDays: (d) => `alle ${d} Tage`, toggleLabel: "EN",
    nDue: (n) => `${n} fällig`, backOn: (d) => `ab ${d} wieder fällig`,
    allDone: "alles erledigt ✨", againOn: (x) => `wieder ${x}`,
    navAdmin: "Admin", adminTitle: "Überblick",
    adminSummary: (u, h) => `${u} Konten · ${h} Haushalte`,
    adminUsersH: "Konten", adminHhH: "Haushalte",
    adminSince: (d) => `seit ${d}`, adminInvite: (c) => `Invite-Code: ${c}`,
    confirmDelUser: (e) => `Konto „${e}" endgültig löschen?`,
    confirmDelHh: (n) => `Haushalt „${n}" samt Zonen und Aufgaben löschen?`,
    confirmRmMember: (e) => `${e} aus dem Haushalt entfernen?`,
    renameHhPrompt: "Haushalt umbenennen:",
    adminNoMembers: "keine Mitglieder",
    weekAll: "Alle", weekMine: "Nur ich", dueNow: "jetzt fällig",
    weekEmpty: "Diese Woche ist alles erledigt ✨",
    membersH: "Mitglieder", meSuffix: "du", editMe: "Name/Emoji ändern",
    mePrompt: "Dein Anzeigename (Emoji voranstellen möglich):",
    nobody: "niemand", assignTitle: (n) => `Zugeordnet: ${n} — tippen zum Wechseln`,
    doneAtTitle: "Erledigt-am nachtragen", doneAtPrompt: "Erledigt am (TT.MM.JJJJ):",
    doneAtBad: "Datum nicht erkannt — Format TT.MM.JJJJ oder JJJJ-MM-TT.",
    loadFail: "Verbindungsfehler — bitte neu laden.",
  },
  en: {
    lede: "A tidy home — zone by zone.", emailPh: "you@email.com",
    sendLink: "Send magic link", enterEmail: "Please enter your email.", sending: "Sending …",
    sent: "Link sent — click it or enter the code from the email ✉️", sendFail: "Sending failed: ",
    otpPh: "6-digit code from the email", otpVerify: "Sign in with code",
    otpEnter: "Please enter your email and the code.", otpFail: "Sign-in failed: ",
    unknownErr: "unknown error (check email settings)",
    setupTitle: "Set up your household", createLabel: "Create a new household",
    namePh: "e.g. “Our Castle”", create: "Create", or: "or",
    joinLabel: "Join a household", codePh: "Invite code", join: "Join",
    enterName: "Please enter a name.", enterCode: "Please enter an invite code.",
    joinFail: "Joining failed: ",
    navZones: "Zones", navProgress: "Progress", navHousehold: "Household", logout: "Sign out",
    thisWeek: "This week", zonePlan: "Zone plan",
    noZones: "No zones yet — pick a template below (with standard tasks and rhythms) or create your own.",
    ownZone: "✏️ Custom zone …", addZoneBtn: "Add zone",
    zonePh: "Zone name (e.g. 🧺 Laundry room) …",
    doneOf: (d, tot) => `${d} of ${tot} done`, noTasksTile: "no tasks yet",
    allZones: "← All zones", del: "delete", renameHint: "Tap to rename",
    noTasks: "No tasks yet.", taskPh: "Add a task …",
    confirmDelZone: "Delete this zone including its tasks?",
    renamePrompt: "Rename zone (you can prefix an emoji):",
    overview: "Overview", progressTitle: (pct) => `Progress — ${pct} %`,
    totalOf: (d, tot) => `Total: ${d} of ${tot} tasks`,
    household: "Household", shareCode: "Share this code so someone can join:",
    intervals: { "": "one-time", 1: "daily", 3: "every 3 days", 4: "every 4 days", 7: "weekly", 14: "every 2 weeks", 30: "monthly", 90: "every 3 months" },
    everyNDays: (d) => `every ${d} days`, toggleLabel: "DE",
    nDue: (n) => `${n} due`, backOn: (d) => `due again ${d}`,
    allDone: "all done ✨", againOn: (x) => `again ${x}`,
    navAdmin: "Admin", adminTitle: "Overview",
    adminSummary: (u, h) => `${u} accounts · ${h} households`,
    adminUsersH: "Accounts", adminHhH: "Households",
    adminSince: (d) => `since ${d}`, adminInvite: (c) => `Invite code: ${c}`,
    confirmDelUser: (e) => `Permanently delete account “${e}”?`,
    confirmDelHh: (n) => `Delete household “${n}” including zones and tasks?`,
    confirmRmMember: (e) => `Remove ${e} from the household?`,
    renameHhPrompt: "Rename household:",
    adminNoMembers: "no members",
    weekAll: "All", weekMine: "Just me", dueNow: "due now",
    weekEmpty: "All done for this week ✨",
    membersH: "Members", meSuffix: "you", editMe: "Change name/emoji",
    mePrompt: "Your display name (you can prefix an emoji):",
    nobody: "nobody", assignTitle: (n) => `Assigned: ${n} — tap to switch`,
    doneAtTitle: "Set “completed on …”", doneAtPrompt: "Completed on (YYYY-MM-DD):",
    doneAtBad: "Couldn't read the date — use YYYY-MM-DD.",
    loadFail: "Connection error — please reload.",
  },
};
let lang = localStorage.getItem("lang") || "de";
const t = (key, ...args) => {
  const v = STR[lang][key];
  return typeof v === "function" ? v(...args) : v;
};

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll("[data-langtoggle]").forEach(b => b.textContent = t("toggleLabel"));
}

document.querySelectorAll("[data-langtoggle]").forEach(b => b.onclick = () => {
  lang = lang === "de" ? "en" : "de";
  localStorage.setItem("lang", lang);
  applyLang();
  if (!$("app-view").classList.contains("hidden")) showView(currentView);
});

// Genau einen der drei Top-Level-Screens zeigen.
function showScreen(id) {
  for (const s of ["login-view", "setup-view", "app-view"])
    $(s).classList.toggle("hidden", s !== id);
}

let currentHousehold = null; // { id, name, invite_code }
let currentUserId = null;
let hhMembers = []; // Mitglieder des aktiven Haushalts: { user_id, display_name, emoji }

const memberOf = (uid) => hhMembers.find(m => m.user_id === uid) || null;
const memberLabel = (uid) => {
  const m = memberOf(uid);
  return m ? `${m.emoji ? m.emoji + " " : ""}${m.display_name || "?"}` : t("nobody");
};
// Chip-Anzeige: Emoji des Mitglieds, sonst Initiale; ohne Zuordnung ein stilles ＋.
const memberChip = (uid) => {
  const m = memberOf(uid);
  return m ? (m.emoji || (m.display_name || "?").slice(0, 1).toUpperCase()) : "＋";
};
// Tipp-Zyklus für Zuordnungen: niemand → Mitglied 1 → Mitglied 2 → … → niemand.
const nextAssignee = (cur) => {
  const ids = hhMembers.map(m => m.user_id);
  const i = ids.indexOf(cur);
  return cur == null || i === -1 ? (ids[0] ?? null) : (ids[i + 1] ?? null);
};

async function route() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { showScreen("login-view"); return; }
  $("user-email").textContent = session.user.email;
  currentUserId = session.user.id;
  // Mitgliedschaft laden. Bei Netzfehler NICHT in den Setup-Screen fallen —
  // sonst legt man dort versehentlich einen zweiten Haushalt an.
  const { data: members, error } = await supabase
    .from("household_members")
    .select("household_id, households(id,name,invite_code)")
    .eq("user_id", session.user.id) // Admin-RLS sieht alle Zeilen — explizit die eigene wählen
    .order("joined_at")
    .limit(1);
  if (error) { showScreen("login-view"); $("login-msg").textContent = t("loadFail"); return; }
  if (members.length === 0) { showScreen("setup-view"); return; }
  currentHousehold = members[0].households;
  $("hh-name").textContent = currentHousehold.name;
  // Mitglieder für Zuordnungen/Anzeige laden; eigenen Anzeigenamen ggf. initialisieren.
  hhMembers = ok(await supabase.from("household_members")
    .select("user_id, display_name, emoji")
    .eq("household_id", currentHousehold.id).order("joined_at")) || [];
  const me = hhMembers.find(m => m.user_id === currentUserId);
  if (me && !me.display_name) {
    me.display_name = session.user.email.split("@")[0];
    ok(await supabase.from("household_members").update({ display_name: me.display_name })
      .eq("household_id", currentHousehold.id).eq("user_id", currentUserId));
  }
  // Admin-Menüpunkt nur fürs Admin-Konto — die echte Prüfung macht admin_overview() serverseitig.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  $("menu-admin").classList.toggle("hidden", !isAdmin);
  showScreen("app-view");
  showView(currentView); // nach Auth-Events in der aktuellen Ansicht bleiben
}

// --- Burger-Menü ---
$("menu-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  $("menu").classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!$("menu").classList.contains("hidden") && !$("menu").contains(e.target))
    $("menu").classList.add("hidden");
});

// --- Magic-Link Login ---
$("login-send").addEventListener("click", async () => {
  const email = $("login-email").value.trim();
  if (!email) { $("login-msg").textContent = t("enterEmail"); return; }
  $("login-msg").textContent = t("sending");
  const { error } = await supabase.auth.signInWithOtp({
    email, options: { emailRedirectTo: window.location.href }
  });
  $("login-msg").textContent = error
    ? (t("sendFail") + (error.message || error.code || t("unknownErr")))
    : t("sent");
  if (!error) $("login-code-row").classList.remove("hidden");
});

// OTP-Fallback: der 6-stellige Code aus derselben Mail — funktioniert auch in der
// iOS-Home-Screen-App, wo der Magic-Link in Safari (getrennte Session) landen würde.
$("login-verify").addEventListener("click", async () => {
  const email = $("login-email").value.trim();
  const code = $("login-code").value.trim();
  if (!email || !code) { $("login-msg").textContent = t("otpEnter"); return; }
  $("login-verify").disabled = true;
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  $("login-verify").disabled = false;
  if (error) $("login-msg").textContent = t("otpFail") + error.message;
  // Erfolg: SIGNED_IN-Event stößt route() an.
});

$("menu-admin").addEventListener("click", () => {
  $("menu").classList.add("hidden");
  showView("admin");
});

$("logout").addEventListener("click", async () => {
  currentView = "zonen"; // nächster Login startet wieder auf der Übersicht
  await supabase.auth.signOut(); // SIGNED_OUT-Event stößt route() an
});

// --- Haushalt anlegen / beitreten ---
$("setup-create").addEventListener("click", async () => {
  const name = $("setup-name").value.trim();
  if (!name) { $("setup-msg").textContent = t("enterName"); return; }
  $("setup-create").disabled = true; // Doppel-Tap würde zwei Haushalte anlegen
  const { error } = await supabase.rpc("create_household", { p_name: name });
  $("setup-create").disabled = false;
  if (error) { $("setup-msg").textContent = error.message; return; }
  route();
});

$("setup-join").addEventListener("click", async () => {
  const code = $("setup-code").value.trim();
  if (!code) { $("setup-msg").textContent = t("enterCode"); return; }
  $("setup-join").disabled = true;
  const { error } = await supabase.rpc("join_household", { p_code: code });
  $("setup-join").disabled = false;
  if (error) { $("setup-msg").textContent = t("joinFail") + error.message; return; }
  route();
});

// Sidebar-Navigation
$("sidebar-nav").addEventListener("click", (e) => {
  const a = e.target.closest("a[data-view]");
  if (a) showView(a.dataset.view);
});

let currentView = "zonen";
function showView(name) {
  currentView = name;
  // Tab-Markierung hier pflegen, damit sie auch bei programmatischen Wechseln stimmt.
  document.querySelectorAll("#sidebar-nav a").forEach(x => x.classList.toggle("act", x.dataset.view === name));
  for (const v of ["zonen", "fortschritt", "haushalt", "admin"])
    $("view-" + v).classList.toggle("hidden", v !== name);
  if (name === "zonen") renderZonen();
  if (name === "fortschritt") renderFortschritt();
  if (name === "haushalt") renderHaushalt();
  if (name === "admin") renderAdmin();
}

// Reagiert auf INITIAL_SESSION (Start/Reload), SIGNED_IN (Magic-Link) und SIGNED_OUT.
// TOKEN_REFRESHED (ca. stündlich) rendert bewusst NICHT neu — das würde halb getippte
// Eingaben wegwischen. setTimeout entkoppelt route() vom Auth-Lock: supabase-js hält
// ihn während des Callbacks, getSession() würde sonst deadlocken (Reload = weiße Seite).
supabase.auth.onAuthStateChange((event) => {
  if (event !== "TOKEN_REFRESHED") setTimeout(route, 0);
});
// Fehlgeschlagener Magic-Link (abgelaufen/schon benutzt) kommt als #error_description zurück.
const authErr = new URLSearchParams(location.hash.slice(1)).get("error_description");
if (authErr) $("login-msg").textContent = authErr;
applyLang();

// --- Zonen-Plan ---

// Beispiel-Zonen mit Standardaufgaben + empfohlenem Turnus (Tage; Namen DE/EN).
const SEED = [
  { emoji: "🍽️", name: { de: "Küche", en: "Kitchen" }, tasks: [
    [{ de: "Arbeitsflächen abwischen", en: "Wipe countertops" }, 1],
    [{ de: "Spüle reinigen", en: "Clean the sink" }, 1],
    [{ de: "Boden wischen", en: "Mop the floor" }, 7],
    [{ de: "Mülleimer auswaschen", en: "Wash out the bins" }, 14],
    [{ de: "Kühlschrank auswischen", en: "Wipe out the fridge" }, 30],
    [{ de: "Backofen reinigen", en: "Clean the oven" }, 90],
  ]},
  { emoji: "🛁", name: { de: "Bad", en: "Bathroom" }, tasks: [
    [{ de: "Toilette putzen", en: "Clean the toilet" }, 3],
    [{ de: "Handtücher wechseln", en: "Change towels" }, 4],
    [{ de: "Waschbecken & Armaturen", en: "Sink & taps" }, 7],
    [{ de: "Dusche/Badewanne reinigen", en: "Clean shower/bathtub" }, 7],
    [{ de: "Boden wischen", en: "Mop the floor" }, 7],
  ]},
  { emoji: "🛏️", name: { de: "Schlafzimmer", en: "Bedroom" }, tasks: [
    [{ de: "Boden saugen", en: "Vacuum" }, 7],
    [{ de: "Bettwäsche wechseln", en: "Change bed linens" }, 14],
    [{ de: "Staub wischen", en: "Dust" }, 14],
    [{ de: "Fenster putzen", en: "Clean windows" }, 90],
  ]},
  { emoji: "🛋️", name: { de: "Wohnzimmer", en: "Living room" }, tasks: [
    [{ de: "Aufräumen", en: "Tidy up" }, 1],
    [{ de: "Staub wischen", en: "Dust" }, 7],
    [{ de: "Boden saugen", en: "Vacuum" }, 7],
    [{ de: "Sofa absaugen", en: "Vacuum the sofa" }, 30],
    [{ de: "Fenster putzen", en: "Clean windows" }, 90],
  ]},
  { emoji: "🏋️", name: { de: "Sportzimmer", en: "Home gym" }, tasks: [
    [{ de: "Lüften", en: "Air out" }, 1],
    [{ de: "Geräte & Matten abwischen", en: "Wipe equipment & mats" }, 7],
    [{ de: "Boden saugen", en: "Vacuum" }, 7],
    [{ de: "Boden wischen", en: "Mop the floor" }, 14],
    [{ de: "Equipment checken & sortieren", en: "Check & sort equipment" }, 30],
  ]},
  { emoji: "🚗", name: { de: "Garage", en: "Garage" }, tasks: [
    [{ de: "Aufräumen & Werkzeug wegräumen", en: "Tidy up & put away tools" }, 14],
    [{ de: "Boden fegen", en: "Sweep the floor" }, 30],
    [{ de: "Regale ausmisten", en: "Declutter shelves" }, 90],
    [{ de: "Entrümpeln", en: "Declutter" }, 90],
  ]},
  { emoji: "💻", name: { de: "Büro", en: "Office" }, tasks: [
    [{ de: "Schreibtisch aufräumen", en: "Tidy the desk" }, 1],
    [{ de: "Papierkram ablegen", en: "File paperwork" }, 7],
    [{ de: "Staub wischen", en: "Dust" }, 7],
    [{ de: "Boden saugen", en: "Vacuum" }, 7],
    [{ de: "Bildschirm & Tastatur reinigen", en: "Clean screen & keyboard" }, 14],
    [{ de: "Kabel & Schubladen sortieren", en: "Sort cables & drawers" }, 30],
  ]},
];

const INTERVAL_DAYS = [null, 1, 3, 4, 7, 14, 30, 90]; // synchron halten mit STR.de/en.intervals

function intervalLabel(days) {
  return STR[lang].intervals[days ?? ""] ?? t("everyNDays", days);
}

// „Erledigt am"-Eingabe: TT.MM.JJJJ oder JJJJ-MM-TT (lokale Zeit, mittags = eindeutig im Kalendertag).
function parseDay(s) {
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(+m[1], m[2] - 1, +m[3], 12);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(+m[3], m[2] - 1, +m[1], 12);
  return null;
}

// Kurzes Datum für „wieder fällig": Wochentag innerhalb von 7 Tagen, sonst Datum.
function dayLabel(ts) {
  const locale = lang === "de" ? "de-DE" : "en-US";
  const opts = ts - Date.now() < 7 * 86400000
    ? { weekday: "short" } : { day: "numeric", month: "numeric" };
  return new Date(ts).toLocaleDateString(locale, opts);
}

// Eine Zone aus einer Vorlage anlegen (inkl. Standardaufgaben, in der aktiven Sprache) — mehrfach möglich.
async function addZoneFromTemplate(tpl) {
  const zone = ok(await supabase.from("zones")
    .insert({ household_id: currentHousehold.id, name: tpl.name[lang], emoji: tpl.emoji })
    .select().single());
  if (!zone) return;
  ok(await supabase.from("tasks").insert(tpl.tasks.map(([title, days], j) =>
    ({ zone_id: zone.id, title: title[lang], interval_days: days, position: j }))));
  renderZonen();
}
// Liefert null bei Netz-/DB-Fehler (bereits gemeldet) — Aufrufer lässt die letzte Ansicht stehen.
async function loadZonen() {
  const zones = ok(await supabase
    .from("zones").select("*").eq("household_id", currentHousehold.id)
    .order("position").order("created_at"));
  if (!zones) return null;
  const ids = zones.map(z => z.id);
  let tasks = [];
  if (ids.length) {
    tasks = ok(await supabase.from("tasks").select("*").in("zone_id", ids)
      .order("position").order("created_at"));
    if (!tasks) return null;
  }
  return { zones, tasks };
}

let openZoneId = null; // gerade geöffnete Zone (null = Kachel-Übersicht)
let weekFilter = localStorage.getItem("weekFilter") || "all"; // Wochenliste: "all" | "mine"

async function renderZonen() {
  const data = await loadZonen();
  if (!data) return;
  const { zones, tasks } = data;
  const el = $("view-zonen");
  const open = zones.find(z => z.id === openZoneId);
  if (open) { renderZoneDetail(el, open, tasks.filter(t => t.zone_id === open.id)); return; }
  openZoneId = null;
  // Wochenliste: jetzt Fälliges + alles, was bis Sonntag wieder fällig wird (Woche = Mo–So, logic.js weekEnd).
  const end = weekEnd();
  const zoneById = Object.fromEntries(zones.map(z => [z.id, z]));
  const assigneeOf = (task) => task.assigned_to ?? zoneById[task.zone_id]?.assigned_to ?? null;
  let week = tasks
    .map(task => ({ task, zone: zoneById[task.zone_id], due: !taskIsDone(task), back: nextDueAt(task) }))
    .filter(x => x.zone && (x.due || (x.task.interval_days && x.back < end)))
    .sort((a, b) => (a.due === b.due) ? a.back - b.back : (a.due ? -1 : 1));
  if (weekFilter === "mine") week = week.filter(x => assigneeOf(x.task) === currentUserId);
  el.innerHTML = `
    <div class="kh">${t("thisWeek")}</div>
    <div class="weekbar">
      <button class="link ${weekFilter === "all" ? "act" : ""}" data-wf="all">${t("weekAll")}</button>
      <button class="link ${weekFilter === "mine" ? "act" : ""}" data-wf="mine">${t("weekMine")}</button>
    </div>
    ${week.map(x => `<div class="task ${x.due ? "todo" : "done"}">
      <span class="ck" data-toggle="${x.task.id}" data-done="${!x.due}">${x.due ? "" : "✓"}</span>
      <span>${esc(x.zone.emoji)} ${esc(x.task.title)}${assigneeOf(x.task) ? ` <em class="turnus">${esc(memberLabel(assigneeOf(x.task)))}</em>` : ""}</span>
      <em class="turnus">${x.due ? t("dueNow") : t("againOn", dayLabel(x.back))}</em>
    </div>`).join("") || `<p class="mut">${t("weekEmpty")}</p>`}
    <h2 class="title" style="margin-top:20px">${t("zonePlan")}</h2>
    ${zones.length === 0 ? `<p class="mut" style="margin-bottom:10px">${t("noZones")}</p>` : ""}
    <div class="zone-grid">${zones.map(z => {
      const zt = tasks.filter(t => t.zone_id === z.id);
      const p = zoneProgress(zt);
      const w = zoneWeek(zt);
      // Ampel nach Fortschritt (drei Stufen): rosé < 35 %, sand < 70 %, mint ab 70 %.
      const cls = p.total === 0 ? "" : p.pct >= 70 ? "high" : p.pct >= 35 ? "mid" : "low";
      const sub = p.total === 0 ? t("noTasksTile")
        : w.due > 0 ? t("nDue", w.due)
        : w.returning > 0 ? t("backOn", dayLabel(w.nextBack))
        : t("allDone");
      return `<button class="tile ${cls}" data-open="${z.id}">
        <span class="tile-emoji">${esc(z.emoji)}</span>
        <span class="tile-name">${esc(z.name)}</span>
        <div class="track"><i style="width:${p.pct}%"></i></div>
        <span class="tile-sub">${sub}</span>
      </button>`;
    }).join("")}</div>
    <div class="addrow" style="margin-top:18px">
      <select id="new-zone-tpl" class="zone-tpl">
        ${SEED.map((z, i) => `<option value="${i}">${z.emoji} ${z.name[lang]}</option>`).join("")}
        <option value="custom">${t("ownZone")}</option>
      </select>
      <button class="btn" id="add-zone">${t("addZoneBtn")}</button>
    </div>
    <div class="addrow hidden" id="custom-zone-row">
      <input id="new-zone" placeholder="${t("zonePh")}">
    </div>`;
  el.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { openZoneId = b.dataset.open; renderZonen(); });
  el.querySelectorAll("[data-wf]").forEach(b => b.onclick = () => {
    weekFilter = b.dataset.wf;
    localStorage.setItem("weekFilter", weekFilter);
    renderZonen();
  });
  el.querySelectorAll("[data-toggle]").forEach(c => c.onclick = () =>
    toggleTask(c.dataset.toggle, c.dataset.done !== "true"));
  const tpl = $("new-zone-tpl");
  tpl.onchange = () => $("custom-zone-row").classList.toggle("hidden", tpl.value !== "custom");
  $("add-zone").onclick = () => {
    if (tpl.value === "custom") addZone($("new-zone").value.trim());
    else addZoneFromTemplate(SEED[Number(tpl.value)]);
  };
}

function renderZoneDetail(el, z, zt) {
  const p = zoneProgress(zt);
  const intervalOptions = INTERVAL_DAYS.map(d => `<option value="${d ?? ""}">${intervalLabel(d)}</option>`).join("");
  el.innerHTML = `
    <button class="link" id="zone-back">${t("allZones")}</button>
    <div class="zone-head" style="margin:14px 0 10px"><span class="emoji">${esc(z.emoji)}</span>
      <h3 data-rename="${z.id}" title="${t("renameHint")}">${esc(z.name)}</h3>
      <button class="who" data-assignzone title="${t("assignTitle", memberLabel(z.assigned_to))}">${esc(memberChip(z.assigned_to))}</button>
      <span class="del" data-delzone="${z.id}">${t("del")}</span></div>
    <div class="prog"><div class="lab"><span>${t("doneOf", p.done, p.total)}</span><span>${p.pct} %</span></div>
      <div class="track"><i style="width:${p.pct}%"></i></div></div>
    <div class="zone" style="margin-top:14px">
      ${[...zt].sort((a, b) => taskIsDone(a) - taskIsDone(b)).map(task => {
        const isDone = taskIsDone(task);
        // Offene Aufgaben zeigen den Turnus, erledigte wann sie wiederkommen.
        const nd = nextDueAt(task);
        const badge = !task.interval_days ? ""
          : isDone ? ` <em class="turnus">${t("againOn", dayLabel(nd))}</em>`
          : ` <em class="turnus">${intervalLabel(task.interval_days)}</em>`;
        return `<div class="task ${isDone ? "done" : "todo"}">
        <span class="ck" data-toggle="${task.id}" data-done="${isDone}">${isDone ? "✓" : ""}</span>
        <span>${esc(task.title)}${badge}</span>
        <button class="who" data-assigntask="${task.id}" data-cur="${task.assigned_to ?? ""}" title="${t("assignTitle", memberLabel(task.assigned_to))}">${esc(memberChip(task.assigned_to))}</button>
        <span class="del" data-doneat="${task.id}" title="${t("doneAtTitle")}">🗓</span>
        <span class="del" data-deltask="${task.id}">✕</span></div>`; }).join("") || `<p class='mut'>${t("noTasks")}</p>`}
      <div class="addrow"><input placeholder="${t("taskPh")}" data-newtask="${z.id}">
        <select data-newinterval="${z.id}">${intervalOptions}</select>
        <button class="btn" data-addtask="${z.id}">+</button></div>
    </div>`;
  $("zone-back").onclick = () => { openZoneId = null; renderZonen(); };
  el.querySelector("[data-rename]").onclick = () => renameZone(z.id, z.name);
  el.querySelector("[data-delzone]").onclick = () => delZone(z.id);
  el.querySelector("[data-assignzone]").onclick = async () => {
    if (!ok(await supabase.from("zones").update({ assigned_to: nextAssignee(z.assigned_to) }).eq("id", z.id))) return;
    renderZonen();
  };
  el.querySelectorAll("[data-assigntask]").forEach(b => b.onclick = async () => {
    if (!ok(await supabase.from("tasks").update({ assigned_to: nextAssignee(b.dataset.cur || null) }).eq("id", b.dataset.assigntask))) return;
    renderZonen();
  });
  el.querySelectorAll("[data-toggle]").forEach(c => c.onclick = () =>
    toggleTask(c.dataset.toggle, c.dataset.done !== "true"));
  el.querySelectorAll("[data-deltask]").forEach(x => x.onclick = () => delTask(x.dataset.deltask));
  el.querySelectorAll("[data-doneat]").forEach(x => x.onclick = () => setDoneAt(x.dataset.doneat));
  el.querySelector("[data-addtask]").onclick = () => {
    const inp = el.querySelector("[data-newtask]");
    const sel = el.querySelector("[data-newinterval]");
    addTask(z.id, inp.value.trim(), sel.value ? Number(sel.value) : null);
  };
}

// Emoji-Präfix aus dem Namen ziehen (erstes „Wort“, wenn Emoji), sonst Default.
function splitEmoji(text) {
  const m = text.match(/^(\p{Extended_Pictographic})\s*(.*)$/u);
  return m ? { emoji: m[1], name: m[2] || m[1] } : { emoji: "🏠", name: text };
}

async function addZone(text) {
  if (!text) return;
  const { emoji, name } = splitEmoji(text);
  if (!ok(await supabase.from("zones").insert({ household_id: currentHousehold.id, name, emoji }))) return;
  renderZonen();
}
async function delZone(id) {
  if (!confirm(t("confirmDelZone"))) return;
  if (!ok(await supabase.from("zones").delete().eq("id", id))) return;
  renderZonen();
}
async function renameZone(id, current) {
  const text = prompt(t("renamePrompt"), current);
  if (!text || !text.trim() || text.trim() === current) return;
  const { emoji, name } = splitEmoji(text.trim());
  const patch = { name };
  if (emoji !== "🏠" || text.trim().startsWith("🏠")) patch.emoji = emoji;
  if (!ok(await supabase.from("zones").update(patch).eq("id", id))) return;
  renderZonen();
}
async function addTask(zoneId, title, intervalDays = null) {
  if (!title) return;
  if (!ok(await supabase.from("tasks").insert({ zone_id: zoneId, title, interval_days: intervalDays }))) return;
  renderZonen();
}
async function toggleTask(id, done) {
  if (!ok(await supabase.from("tasks").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", id))) return;
  renderZonen();
}
// „Erledigt am" nachtragen — falls das Abhaken vergessen wurde; Turnus rechnet ab dem Datum.
async function setDoneAt(id) {
  const text = prompt(t("doneAtPrompt"),
    lang === "de" ? new Date().toLocaleDateString("de-DE") : new Date().toISOString().slice(0, 10));
  if (!text || !text.trim()) return;
  const d = parseDay(text.trim());
  if (!d || isNaN(d.getTime())) { alert(t("doneAtBad")); return; }
  if (!ok(await supabase.from("tasks").update({ done: true, done_at: d.toISOString() }).eq("id", id))) return;
  renderZonen();
}
async function delTask(id) {
  if (!ok(await supabase.from("tasks").delete().eq("id", id))) return;
  renderZonen();
}

// --- Fortschritt (Gesamtübersicht) ---
async function renderFortschritt() {
  const data = await loadZonen();
  if (!data) return;
  const { zones, tasks } = data;
  const all = zoneProgress(tasks);
  const rows = zones.map(z => {
    const p = zoneProgress(tasks.filter(t => t.zone_id === z.id));
    return `<div class="prog" style="margin:14px 0">
      <div class="lab"><span>${esc(z.emoji)} ${esc(z.name)}</span><span>${p.done}/${p.total} · ${p.pct} %</span></div>
      <div class="track"><i style="width:${p.pct}%"></i></div></div>`;
  }).join("");
  $("view-fortschritt").innerHTML = `
    <div class="kh">${t("overview")}</div>
    <h2 class="title">${t("progressTitle", all.pct)}</h2>
    <div class="prog"><div class="lab"><span>${t("totalOf", all.done, all.total)}</span><span>${all.pct} %</span></div>
      <div class="track"><i style="width:${all.pct}%"></i></div></div>
    <div style="margin-top:22px">${rows}</div>`;
}

// --- Haushalt ---
async function renderHaushalt() {
  const el = $("view-haushalt");
  el.innerHTML = `
    <div class="kh">${t("household")}</div>
    <h2 class="title">${esc(currentHousehold.name)}</h2>
    <p class="mut">${t("shareCode")}</p>
    <div class="code-box">${esc(currentHousehold.invite_code)}</div>
    <h3 style="margin:18px 0 8px">${t("membersH")}</h3>
    ${hhMembers.map(m => `<div class="task todo">
      <span>${m.emoji ? esc(m.emoji) + " " : ""}${esc(m.display_name || "?")}${m.user_id === currentUserId ? ` <em class="turnus">${t("meSuffix")}</em>` : ""}</span>
      ${m.user_id === currentUserId ? `<span class="del" data-editme title="${t("editMe")}">✎</span>` : ""}
    </div>`).join("")}`;
  const btn = el.querySelector("[data-editme]");
  if (btn) btn.onclick = async () => {
    const me = hhMembers.find(m => m.user_id === currentUserId);
    const text = prompt(t("mePrompt"), `${me.emoji ? me.emoji + " " : ""}${me.display_name || ""}`);
    if (!text || !text.trim()) return;
    const m = text.trim().match(/^(\p{Extended_Pictographic})\s*(.*)$/u);
    const patch = m ? { emoji: m[1], display_name: m[2] || me.display_name } : { emoji: null, display_name: text.trim() };
    if (!ok(await supabase.from("household_members").update(patch)
      .eq("household_id", currentHousehold.id).eq("user_id", currentUserId))) return;
    Object.assign(me, patch);
    renderHaushalt();
  };
}

// --- Admin (Konten & Haushalte verwalten; Rechte prüfen admin_overview() + RLS serverseitig) ---
async function renderAdmin() {
  const data = ok(await supabase.rpc("admin_overview"));
  if (!data) return;
  const locale = lang === "de" ? "de-DE" : "en-US";
  const fd = (x) => new Date(x).toLocaleDateString(locale, { day: "numeric", month: "numeric", year: "numeric" });
  const el = $("view-admin");
  el.innerHTML = `
    <div class="kh">${t("navAdmin")}</div>
    <h2 class="title">${t("adminTitle")}</h2>
    <p class="mut">${t("adminSummary", data.users.length, data.households.length)}</p>
    <h3 style="margin:18px 0 8px">${t("adminUsersH")}</h3>
    ${data.users.map(u => `<div class="task todo">
      <span>${esc(u.email)} <em class="turnus">${t("adminSince", fd(u.created_at))}</em></span>
      ${u.id === currentUserId ? "" : `<span class="del" data-deluser="${u.id}" data-email="${esc(u.email)}">✕</span>`}
    </div>`).join("")}
    <h3 style="margin:18px 0 8px">${t("adminHhH")}</h3>
    ${data.households.map(h => `<div class="zone" style="margin:0 0 14px">
      <div class="zone-head">
        <h3 data-renamehh="${h.id}" data-name="${esc(h.name)}" title="${t("renameHint")}">${esc(h.name)}</h3>
        <span class="del" data-delhh="${h.id}" data-name="${esc(h.name)}">${t("del")}</span></div>
      <p class="mut" style="margin:4px 0 8px">${t("adminInvite", esc(h.invite_code))} · ${t("adminSince", fd(h.created_at))}</p>
      ${h.members.map(m => `<div class="task todo"><span>👤 ${esc(m.email)}</span>
        <span class="del" data-rmmember="${h.id}" data-user="${m.id}" data-email="${esc(m.email)}">✕</span></div>`).join("")
        || `<p class="mut">${t("adminNoMembers")}</p>`}
      ${h.zones.map(z => `<div class="task todo">
        <span>${esc(z.emoji)} ${esc(z.name)} <em class="turnus">${z.tasks_done}/${z.tasks}</em></span>
        <span class="del" data-delzone="${z.id}">✕</span></div>`).join("")}
    </div>`).join("")}`;
  el.querySelectorAll("[data-deluser]").forEach(b => b.onclick = async () => {
    if (!confirm(t("confirmDelUser", b.dataset.email))) return;
    if (!ok(await supabase.rpc("admin_delete_user", { p_user_id: b.dataset.deluser }))) return;
    renderAdmin();
  });
  el.querySelectorAll("[data-renamehh]").forEach(b => b.onclick = async () => {
    const name = prompt(t("renameHhPrompt"), b.dataset.name);
    if (!name || !name.trim() || name.trim() === b.dataset.name) return;
    if (!ok(await supabase.from("households").update({ name: name.trim() }).eq("id", b.dataset.renamehh))) return;
    if (currentHousehold && currentHousehold.id === b.dataset.renamehh) {
      currentHousehold.name = name.trim();
      $("hh-name").textContent = currentHousehold.name;
    }
    renderAdmin();
  });
  el.querySelectorAll("[data-delhh]").forEach(b => b.onclick = async () => {
    if (!confirm(t("confirmDelHh", b.dataset.name))) return;
    if (!ok(await supabase.from("households").delete().eq("id", b.dataset.delhh))) return;
    if (currentHousehold && currentHousehold.id === b.dataset.delhh) { route(); return; }
    renderAdmin();
  });
  el.querySelectorAll("[data-rmmember]").forEach(b => b.onclick = async () => {
    if (!confirm(t("confirmRmMember", b.dataset.email))) return;
    if (!ok(await supabase.from("household_members").delete()
      .eq("household_id", b.dataset.rmmember).eq("user_id", b.dataset.user))) return;
    renderAdmin();
  });
  el.querySelectorAll("[data-delzone]").forEach(b => b.onclick = async () => {
    if (!confirm(t("confirmDelZone"))) return;
    if (!ok(await supabase.from("zones").delete().eq("id", b.dataset.delzone))) return;
    renderAdmin();
  });
}
