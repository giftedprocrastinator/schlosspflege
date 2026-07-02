import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { zoneProgress, taskIsDone } from "./logic.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

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
  showScreen("app-view");
  showView("zonen");
}

// --- Magic-Link Login ---
$("login-send").addEventListener("click", async () => {
  const email = $("login-email").value.trim();
  if (!email) { $("login-msg").textContent = "Bitte E-Mail eingeben."; return; }
  $("login-msg").textContent = "Sende …";
  const { error } = await supabase.auth.signInWithOtp({
    email, options: { emailRedirectTo: window.location.href }
  });
  $("login-msg").textContent = error
    ? ("Versand fehlgeschlagen: " + (error.message || error.code || "unbekannter Fehler (E-Mail-Einstellungen prüfen)"))
    : "Link gesendet — prüf dein Postfach ✉️";
});

$("logout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  route();
});

// --- Haushalt anlegen / beitreten ---
$("setup-create").addEventListener("click", async () => {
  const name = $("setup-name").value.trim();
  if (!name) { $("setup-msg").textContent = "Bitte einen Namen eingeben."; return; }
  const { error } = await supabase.rpc("create_household", { p_name: name });
  if (error) { $("setup-msg").textContent = error.message; return; }
  route();
});

$("setup-join").addEventListener("click", async () => {
  const code = $("setup-code").value.trim();
  if (!code) { $("setup-msg").textContent = "Bitte Invite-Code eingeben."; return; }
  const { error } = await supabase.rpc("join_household", { p_code: code });
  if (error) { $("setup-msg").textContent = "Beitritt fehlgeschlagen: " + error.message; return; }
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

function showView(name) {
  for (const v of ["zonen", "fortschritt", "haushalt"])
    $("view-" + v).classList.toggle("hidden", v !== name);
  if (name === "zonen") renderZonen();
  if (name === "fortschritt") renderFortschritt();
  if (name === "haushalt") renderHaushalt();
}

// Reagiert auf Login/Logout (auch nach Magic-Link-Redirect).
supabase.auth.onAuthStateChange(() => route());
route();

// --- Zonen-Plan ---

// Beispiel-Zonen mit Standardaufgaben + empfohlenem Turnus (Tage; null = einmalig).
const SEED = [
  { emoji: "🍽️", name: "Küche", tasks: [
    ["Arbeitsflächen abwischen", 1], ["Spüle reinigen", 1], ["Boden wischen", 7],
    ["Mülleimer auswaschen", 14], ["Kühlschrank auswischen", 30], ["Backofen reinigen", 90],
  ]},
  { emoji: "🛁", name: "Bad", tasks: [
    ["Toilette putzen", 3], ["Handtücher wechseln", 4], ["Waschbecken & Armaturen", 7],
    ["Dusche/Badewanne reinigen", 7], ["Boden wischen", 7],
  ]},
  { emoji: "🛏️", name: "Schlafzimmer", tasks: [
    ["Boden saugen", 7], ["Bettwäsche wechseln", 14], ["Staub wischen", 14], ["Fenster putzen", 90],
  ]},
  { emoji: "🛋️", name: "Wohnzimmer", tasks: [
    ["Aufräumen", 1], ["Staub wischen", 7], ["Boden saugen", 7],
    ["Sofa absaugen", 30], ["Fenster putzen", 90],
  ]},
  { emoji: "🏋️", name: "Sportzimmer", tasks: [
    ["Lüften", 1], ["Geräte & Matten abwischen", 7], ["Boden saugen", 7],
    ["Boden wischen", 14], ["Equipment checken & sortieren", 30],
  ]},
  { emoji: "🚗", name: "Garage", tasks: [
    ["Aufräumen & Werkzeug wegräumen", 14], ["Boden fegen", 30],
    ["Regale ausmisten", 90], ["Entrümpeln", 90],
  ]},
  { emoji: "💻", name: "Büro", tasks: [
    ["Schreibtisch aufräumen", 1], ["Papierkram ablegen", 7], ["Staub wischen", 7],
    ["Boden saugen", 7], ["Bildschirm & Tastatur reinigen", 14], ["Kabel & Schubladen sortieren", 30],
  ]},
];

const INTERVALS = [[null, "einmalig"], [1, "täglich"], [3, "alle 3 Tage"], [4, "alle 4 Tage"],
  [7, "wöchentlich"], [14, "alle 2 Wochen"], [30, "monatlich"], [90, "alle 3 Monate"]];

function intervalLabel(days) {
  const hit = INTERVALS.find(([d]) => d === days);
  return hit ? hit[1] : `alle ${days} Tage`;
}

async function seedZones() {
  for (const [i, z] of SEED.entries()) {
    const { data: zone } = await supabase.from("zones")
      .insert({ household_id: currentHousehold.id, name: z.name, emoji: z.emoji, position: i })
      .select().single();
    if (!zone) continue;
    await supabase.from("tasks").insert(z.tasks.map(([title, days], j) =>
      ({ zone_id: zone.id, title, interval_days: days, position: j })));
  }
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

async function renderZonen() {
  const { zones, tasks } = await loadZonen();
  const byZone = (zid) => tasks.filter(t => t.zone_id === zid);
  const el = $("view-zonen");
  const intervalOptions = INTERVALS.map(([d, l]) => `<option value="${d ?? ""}">${l}</option>`).join("");
  el.innerHTML = `
    <div class="kh">Diese Woche</div>
    <h2 class="title">Zonen-Plan</h2>
    ${zones.length === 0 ? `<p class="mut" style="margin-bottom:10px">Noch keine Zonen — leg los mit unseren Vorschlägen samt empfohlener Rhythmen, oder erstelle eigene.</p>
      <button class="btn" id="seed-zones" style="margin-bottom:18px">✨ Beispiel-Zonen einfügen</button>` : ""}
    <div id="zone-list">${zones.map(z => {
      const zt = byZone(z.id); const p = zoneProgress(zt);
      return `<div class="zone" data-zone="${z.id}">
        <div class="zone-head"><span class="emoji">${z.emoji}</span>
          <h3 data-rename="${z.id}" title="Tippen zum Umbenennen">${z.name}</h3><span class="del" data-delzone="${z.id}">löschen</span></div>
        <div class="prog"><div class="lab"><span>${p.done} von ${p.total} erledigt</span><span>${p.pct} %</span></div>
          <div class="track"><i style="width:${p.pct}%"></i></div></div>
        ${zt.map(t => { const isDone = taskIsDone(t);
          return `<div class="task ${isDone ? "done" : "todo"}">
          <span class="ck" data-toggle="${t.id}" data-done="${isDone}">${isDone ? "✓" : ""}</span>
          <span>${t.title}${t.interval_days ? ` <em class="turnus">${intervalLabel(t.interval_days)}</em>` : ""}</span>
          <span class="del" data-deltask="${t.id}">✕</span></div>`; }).join("")}
        <div class="addrow"><input placeholder="Aufgabe hinzufügen …" data-newtask="${z.id}">
          <select data-newinterval="${z.id}">${intervalOptions}</select>
          <button class="btn" data-addtask="${z.id}">+</button></div>
      </div>`;
    }).join("")}</div>
    <div class="addrow" style="margin-top:18px">
      <input id="new-zone" placeholder="Neue Zone (z. B. 🧺 Waschküche) …">
      <button class="btn" id="add-zone">Zone anlegen</button>
    </div>`;
  wireZonen();
}

function wireZonen() {
  $("add-zone").onclick = () => addZone($("new-zone").value.trim());
  const el = $("view-zonen");
  const seedBtn = $("seed-zones");
  if (seedBtn) seedBtn.onclick = () => { seedBtn.disabled = true; seedBtn.textContent = "Lege an …"; seedZones(); };
  el.querySelectorAll("[data-rename]").forEach(h => h.onclick = () => renameZone(h.dataset.rename, h.textContent));
  el.querySelectorAll("[data-addtask]").forEach(b => b.onclick = () => {
    const zid = b.dataset.addtask;
    const inp = el.querySelector(`[data-newtask="${zid}"]`);
    const sel = el.querySelector(`[data-newinterval="${zid}"]`);
    addTask(zid, inp.value.trim(), sel.value ? Number(sel.value) : null);
  });
  el.querySelectorAll("[data-toggle]").forEach(c => c.onclick = () =>
    toggleTask(c.dataset.toggle, c.dataset.done !== "true"));
  el.querySelectorAll("[data-deltask]").forEach(x => x.onclick = () => delTask(x.dataset.deltask));
  el.querySelectorAll("[data-delzone]").forEach(x => x.onclick = () => delZone(x.dataset.delzone));
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
  if (!confirm("Zone samt Aufgaben löschen?")) return;
  await supabase.from("zones").delete().eq("id", id);
  renderZonen();
}
async function renameZone(id, current) {
  const text = prompt("Zone umbenennen (Emoji voranstellen möglich):", current);
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
    <div class="kh">Überblick</div>
    <h2 class="title">Fortschritt — ${all.pct} %</h2>
    <div class="prog"><div class="lab"><span>Gesamt: ${all.done} von ${all.total} Aufgaben</span><span>${all.pct} %</span></div>
      <div class="track"><i style="width:${all.pct}%"></i></div></div>
    <div style="margin-top:22px">${rows || "<p class='mut'>Noch keine Zonen.</p>"}</div>`;
}

// --- Haushalt ---
async function renderHaushalt() {
  $("view-haushalt").innerHTML = `
    <div class="kh">Haushalt</div>
    <h2 class="title">${currentHousehold.name}</h2>
    <p class="mut">Teile diesen Code, damit jemand beitreten kann:</p>
    <div class="code-box">${currentHousehold.invite_code}</div>`;
}
