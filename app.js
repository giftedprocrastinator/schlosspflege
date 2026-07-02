import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { zoneProgress, taskIsDone } from "./logic.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

// --- Sprache (DE/EN) ---
const STR = {
  de: {
    lede: "Ordnung fürs Zuhause — Zone für Zone.", emailPh: "deine@email.de",
    sendLink: "Magic-Link senden", enterEmail: "Bitte E-Mail eingeben.", sending: "Sende …",
    sent: "Link gesendet — prüf dein Postfach ✉️", sendFail: "Versand fehlgeschlagen: ",
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
  },
  en: {
    lede: "A tidy home — zone by zone.", emailPh: "you@email.com",
    sendLink: "Send magic link", enterEmail: "Please enter your email.", sending: "Sending …",
    sent: "Link sent — check your inbox ✉️", sendFail: "Sending failed: ",
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

async function route() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { showScreen("login-view"); return; }
  $("user-email").textContent = session.user.email;
  // Mitgliedschaft laden
  const { data: members } = await supabase
    .from("household_members")
    .select("household_id, households(id,name,invite_code)")
    .limit(1);
  if (!members || members.length === 0) { showScreen("setup-view"); return; }
  currentHousehold = members[0].households;
  $("hh-name").textContent = currentHousehold.name;
  showScreen("app-view");
  showView("zonen");
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
});

$("logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  route();
});

// --- Haushalt anlegen / beitreten ---
$("setup-create").addEventListener("click", async () => {
  const name = $("setup-name").value.trim();
  if (!name) { $("setup-msg").textContent = t("enterName"); return; }
  const { error } = await supabase.rpc("create_household", { p_name: name });
  if (error) { $("setup-msg").textContent = error.message; return; }
  route();
});

$("setup-join").addEventListener("click", async () => {
  const code = $("setup-code").value.trim();
  if (!code) { $("setup-msg").textContent = t("enterCode"); return; }
  const { error } = await supabase.rpc("join_household", { p_code: code });
  if (error) { $("setup-msg").textContent = t("joinFail") + error.message; return; }
  route();
});

// Sidebar-Navigation
$("sidebar-nav").addEventListener("click", (e) => {
  const a = e.target.closest("a[data-view]");
  if (!a) return;
  document.querySelectorAll("#sidebar-nav a").forEach(x => x.classList.remove("act"));
  a.classList.add("act");
  showView(a.dataset.view);
});

let currentView = "zonen";
function showView(name) {
  currentView = name;
  for (const v of ["zonen", "fortschritt", "haushalt"])
    $("view-" + v).classList.toggle("hidden", v !== name);
  if (name === "zonen") renderZonen();
  if (name === "fortschritt") renderFortschritt();
  if (name === "haushalt") renderHaushalt();
}

// Reagiert auf Login/Logout (auch nach Magic-Link-Redirect).
supabase.auth.onAuthStateChange(() => route());
applyLang();
route();

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

const INTERVAL_DAYS = [null, 1, 3, 4, 7, 14, 30, 90];

function intervalLabel(days) {
  return STR[lang].intervals[days ?? ""] ?? t("everyNDays", days);
}

// Eine Zone aus einer Vorlage anlegen (inkl. Standardaufgaben, in der aktiven Sprache) — mehrfach möglich.
async function addZoneFromTemplate(tpl) {
  const { data: zone } = await supabase.from("zones")
    .insert({ household_id: currentHousehold.id, name: tpl.name[lang], emoji: tpl.emoji })
    .select().single();
  if (zone) await supabase.from("tasks").insert(tpl.tasks.map(([title, days], j) =>
    ({ zone_id: zone.id, title: title[lang], interval_days: days, position: j })));
  renderZonen();
}
async function loadZonen() {
  const { data: zones } = await supabase
    .from("zones").select("*").eq("household_id", currentHousehold.id)
    .order("position").order("created_at");
  const ids = (zones || []).map(z => z.id);
  let tasks = [];
  if (ids.length) {
    const res = await supabase.from("tasks").select("*").in("zone_id", ids).order("created_at");
    tasks = res.data || [];
  }
  return { zones: zones || [], tasks };
}

let openZoneId = null; // gerade geöffnete Zone (null = Kachel-Übersicht)

async function renderZonen() {
  const { zones, tasks } = await loadZonen();
  const el = $("view-zonen");
  const open = zones.find(z => z.id === openZoneId);
  if (open) { renderZoneDetail(el, open, tasks.filter(t => t.zone_id === open.id)); return; }
  openZoneId = null;
  el.innerHTML = `
    <div class="kh">${t("thisWeek")}</div>
    <h2 class="title">${t("zonePlan")}</h2>
    ${zones.length === 0 ? `<p class="mut" style="margin-bottom:10px">${t("noZones")}</p>` : ""}
    <div class="zone-grid">${zones.map(z => {
      const p = zoneProgress(tasks.filter(t => t.zone_id === z.id));
      // Ampel-Farbe nach Fortschritt: rosé = viel offen, sand = mittendrin, mint = fast fertig.
      const cls = p.total === 0 ? "" : p.pct < 35 ? "low" : p.pct < 70 ? "mid" : "high";
      return `<button class="tile ${cls}" data-open="${z.id}">
        <span class="tile-emoji">${z.emoji}</span>
        <span class="tile-name">${z.name}</span>
        <div class="track"><i style="width:${p.pct}%"></i></div>
        <span class="tile-sub">${p.total ? t("doneOf", p.done, p.total) + (p.pct === 100 ? " ✨" : "") : t("noTasksTile")}</span>
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
    <div class="zone-head" style="margin:14px 0 10px"><span class="emoji">${z.emoji}</span>
      <h3 data-rename="${z.id}" title="${t("renameHint")}">${z.name}</h3>
      <span class="del" data-delzone="${z.id}">${t("del")}</span></div>
    <div class="prog"><div class="lab"><span>${t("doneOf", p.done, p.total)}</span><span>${p.pct} %</span></div>
      <div class="track"><i style="width:${p.pct}%"></i></div></div>
    <div class="zone" style="margin-top:14px">
      ${zt.map(task => { const isDone = taskIsDone(task);
        return `<div class="task ${isDone ? "done" : "todo"}">
        <span class="ck" data-toggle="${task.id}" data-done="${isDone}">${isDone ? "✓" : ""}</span>
        <span>${task.title}${task.interval_days ? ` <em class="turnus">${intervalLabel(task.interval_days)}</em>` : ""}</span>
        <span class="del" data-deltask="${task.id}">✕</span></div>`; }).join("") || `<p class='mut'>${t("noTasks")}</p>`}
      <div class="addrow"><input placeholder="${t("taskPh")}" data-newtask="${z.id}">
        <select data-newinterval="${z.id}">${intervalOptions}</select>
        <button class="btn" data-addtask="${z.id}">+</button></div>
    </div>`;
  $("zone-back").onclick = () => { openZoneId = null; renderZonen(); };
  el.querySelector("[data-rename]").onclick = () => renameZone(z.id, z.name);
  el.querySelector("[data-delzone]").onclick = () => delZone(z.id);
  el.querySelectorAll("[data-toggle]").forEach(c => c.onclick = () =>
    toggleTask(c.dataset.toggle, c.dataset.done !== "true"));
  el.querySelectorAll("[data-deltask]").forEach(x => x.onclick = () => delTask(x.dataset.deltask));
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
  await supabase.from("zones").insert({ household_id: currentHousehold.id, name, emoji });
  renderZonen();
}
async function delZone(id) {
  if (!confirm(t("confirmDelZone"))) return;
  await supabase.from("zones").delete().eq("id", id);
  renderZonen();
}
async function renameZone(id, current) {
  const text = prompt(t("renamePrompt"), current);
  if (!text || !text.trim() || text.trim() === current) return;
  const { emoji, name } = splitEmoji(text.trim());
  const patch = { name };
  if (emoji !== "🏠" || text.trim().startsWith("🏠")) patch.emoji = emoji;
  await supabase.from("zones").update(patch).eq("id", id);
  renderZonen();
}
async function addTask(zoneId, title, intervalDays = null) {
  if (!title) return;
  await supabase.from("tasks").insert({ zone_id: zoneId, title, interval_days: intervalDays });
  renderZonen();
}
async function toggleTask(id, done) {
  await supabase.from("tasks").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", id);
  renderZonen();
}
async function delTask(id) {
  await supabase.from("tasks").delete().eq("id", id);
  renderZonen();
}

// --- Fortschritt (Gesamtübersicht) ---
async function renderFortschritt() {
  const { zones, tasks } = await loadZonen();
  const all = zoneProgress(tasks);
  const rows = zones.map(z => {
    const p = zoneProgress(tasks.filter(t => t.zone_id === z.id));
    return `<div class="prog" style="margin:14px 0">
      <div class="lab"><span>${z.emoji} ${z.name}</span><span>${p.done}/${p.total} · ${p.pct} %</span></div>
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
  $("view-haushalt").innerHTML = `
    <div class="kh">${t("household")}</div>
    <h2 class="title">${currentHousehold.name}</h2>
    <p class="mut">${t("shareCode")}</p>
    <div class="code-box">${currentHousehold.invite_code}</div>`;
}
