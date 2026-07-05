# Schlosspflege 🏰

**EN** — *Schlosspflege* (German for "castle care") is a small family
home-organizer: clean your home **zone by zone** (Marie-Kondo style), share one
household with your family via invite code, and check off tasks that come back
on their own rhythm (e.g. *change bed linens — every 2 weeks*). Built as a
zero-build static web app on Supabase. **The UI is bilingual — switch DE/EN
in-app.**

**DE** — Familien-Organizer fürs Zuhause: Wohnung **Zone für Zone** aufräumen,
Haushalt per Invite-Code teilen, Aufgaben mit Turnus werden automatisch wieder
fällig. Statische Web-App ohne Build, Backend ist Supabase. **Sprache in der
App umschaltbar (DE/EN).**

## Features

- 🧩 Zone tiles with progress bars (three-step color scale) → tap to open the task list
- 🔁 Recurring tasks (`interval_days`) in **calendar days**: checked off in the
  evening, due again the next morning — repeat is changeable per task (tap the pill)
- 🗓 This-week list on the overview: everything due now or coming back by Sunday,
  checkable in place, with an "All / Just me" filter
- 🙋 Assign zones & tasks to household members (tap the chip to cycle); tasks
  inherit the zone's assignee; members pick their own display name + emoji
- ⏪ Backfill "done on" via the native date picker (🗓 per task)
- 📋 Zone templates with sensible default tasks & rhythms (DE/EN) — usable multiple times
- 👨‍👩‍👧 One shared household per family, row-level security; sign-in via
  **magic link or the 6-digit code** from the same email (code works around
  the separate-Safari-session issue of iOS home-screen apps)
- 🔒 **Sign-ups are closed** (`shouldCreateUser:false` + dashboard toggle):
  accounts are created deliberately; the invite code only lets *existing*
  accounts join a household
- 🛠 Admin panel (admin account only, enforced server-side): manage accounts,
  households, members and zones
- 📱 Mobile-first, installable on the home screen (app icon included)

## Stack

Static SPA (`index.html` + `styles.css` + `app.js` + pure `logic.js`) ·
`@supabase/supabase-js@2` via CDN · Supabase (Postgres, Auth, RLS). No
framework, no build step.

## Lokal starten / Run locally

1. `config.js` enthält URL + Publishable-Key (öffentlich ok — RLS schützt die Daten).
   Für ein eigenes Supabase-Projekt: Werte aus Supabase → Settings → API eintragen.
2. Statisch serven (z. B. `php -S 0.0.0.0:8642` im App-Ordner) und `index.html` öffnen.

## Supabase einrichten / Setup

1. Projekt auf supabase.com anlegen. / Create a project on supabase.com.
2. SQL-Editor → die vier Dateien aus `supabase/` **in dieser Reihenfolge**
   ausführen / run the four files in `supabase/` in this order:
   `schema.sql` (Tabellen, RPCs, RLS) → `admin.sql` (Admin-Rolle + Panel-RPCs;
   Admin-E-Mail in `is_admin()` anpassen / adjust the admin email) →
   `hardening.sql` (RPCs nur für eingeloggte Nutzer / RPCs for signed-in users
   only) → `assignments.sql` (Zuordnungen + Mitglieder-Profile).
3. Authentication → Providers → Email aktivieren (Magic Link).
4. Authentication → Email Templates → „Magic Link": neben dem Link auch
   `{{ .Token }}` einfügen — das ist der 6-stellige Code für den Code-Login. /
   Add `{{ .Token }}` to the magic-link template for the code sign-in.
5. Authentication → Sign In / Up → „Allow new users to sign up" **aus**schalten
   (die App setzt zusätzlich `shouldCreateUser:false`); Konten dann bewusst
   anlegen. / Disable open sign-ups; create accounts deliberately.
6. Authentication → URL Configuration → Site-URL + Redirect auf die Deploy-Domain setzen.
7. `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `config.js` eintragen.

## Deploy (Vercel)

- Neues Vercel-Projekt, Framework „Other", kein Build. / New Vercel project,
  framework "Other", no build step.
- Nach Deploy die Live-URL in Supabase als Redirect-URL nachtragen. / Add the
  live URL as a redirect URL in Supabase afterwards.

## Tests

- `node logic.js` → prüft die reine Logik (Kalendertag-Turnus, Fortschritt,
  Wochen-Rechnung). / self-tests for the pure logic (calendar-day recurrence,
  progress, week math).

## Phase 2 (später / later)

Notizen/Foto pro Zone (Storage-Bucket `zone-photos`); der geplante
Wochen-Kalender (`tasks.planned_for`) ist durch die Wochenliste teilweise
abgedeckt. / Notes/photo per zone; the weekly calendar is partly covered by
the this-week list already.
