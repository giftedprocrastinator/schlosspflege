import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { zoneProgress } from "./logic.js";

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
  $("login-msg").textContent = error ? error.message : "Link gesendet — prüf dein Postfach ✉️";
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
  el.innerHTML = `
    <div class="kh">Diese Woche</div>
    <h2 class="title">Zonen-Plan</h2>
    <div id="zone-list">${zones.map(z => {
      const zt = byZone(z.id); const p = zoneProgress(zt);
      return `<div class="zone" data-zone="${z.id}">
        <div class="zone-head"><span class="emoji">${z.emoji}</span>
          <h3>${z.name}</h3><span class="del" data-delzone="${z.id}">löschen</span></div>
        <div class="prog"><div class="lab"><span>${p.done} von ${p.total} erledigt</span><span>${p.pct} %</span></div>
          <div class="track"><i style="width:${p.pct}%"></i></div></div>
        ${zt.map(t => `<div class="task ${t.done ? "done" : "todo"}">
          <span class="ck" data-toggle="${t.id}" data-done="${t.done}">${t.done ? "✓" : ""}</span>
          <span>${t.title}</span><span class="del" data-deltask="${t.id}">✕</span></div>`).join("")}
        <div class="addrow"><input placeholder="Aufgabe hinzufügen …" data-newtask="${z.id}">
          <button class="btn" data-addtask="${z.id}">+</button></div>
      </div>`;
    }).join("")}</div>
    <div class="addrow" style="margin-top:18px">
      <input id="new-zone" placeholder="Neue Zone (z. B. 🍽️ Küche) …">
      <button class="btn" id="add-zone">Zone anlegen</button>
    </div>`;
  wireZonen();
}

function wireZonen() {
  $("add-zone").onclick = () => addZone($("new-zone").value.trim());
  const el = $("view-zonen");
  el.querySelectorAll("[data-addtask]").forEach(b => b.onclick = () => {
    const zid = b.dataset.addtask;
    const inp = el.querySelector(`[data-newtask="${zid}"]`);
    addTask(zid, inp.value.trim());
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
async function addTask(zoneId, title) {
  if (!title) return;
  await supabase.from("tasks").insert({ zone_id: zoneId, title });
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
