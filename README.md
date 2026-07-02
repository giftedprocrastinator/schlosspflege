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

- 🧩 Zone tiles with progress bars → tap to open the task list
- 🔁 Recurring tasks (`interval_days`): done today, due again after the interval
- 📋 Zone templates with sensible default tasks & rhythms (DE/EN) — usable multiple times
- 👨‍👩‍👧 One shared household per family, magic-link login, row-level security
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
2. SQL-Editor → Inhalt von `supabase/schema.sql` ausführen. / Run `supabase/schema.sql`.
3. Authentication → Providers → Email aktivieren (Magic Link).
4. Authentication → URL Configuration → Site-URL + Redirect auf die Deploy-Domain setzen.
5. `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `config.js` eintragen.

## Deploy (Vercel)

- Neues Vercel-Projekt, Framework „Other", kein Build. / New Vercel project,
  framework "Other", no build step.
- Nach Deploy die Live-URL in Supabase als Redirect-URL nachtragen. / Add the
  live URL as a redirect URL in Supabase afterwards.

## Tests

- `node logic.js` → prüft die reine Logik (Turnus + Fortschritt). / self-tests
  for the pure logic (recurrence + progress).

## Phase 2 (später / later)

Wochen-Kalender (`tasks.planned_for`), Notizen/Foto pro Zone (Storage-Bucket
`zone-photos`). / Weekly calendar, notes/photo per zone.
