# Schlosspflege

Familien-Organizer (Wohnung Zone für Zone). Statische App + Supabase.

## Lokal starten
1. `cp config.example.js config.js` und Werte eintragen (aus Supabase → Settings → API).
2. Statisch serven (z. B. `python3 -m http.server` im `APP/`-Ordner) und `index.html` öffnen.

## Supabase einrichten
1. Projekt auf supabase.com anlegen.
2. SQL-Editor → Inhalt von `supabase/schema.sql` ausführen.
3. Authentication → Providers → Email aktivieren (Magic Link).
4. Authentication → URL Configuration → Site-URL + Redirect auf die Vercel-Domain setzen.
5. `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `config.js` eintragen.

## Deploy (Vercel)
- Neues Vercel-Projekt, Root = `APP/`, Framework „Other", kein Build.
- Nach Deploy die Live-URL in Supabase als Redirect-URL nachtragen.

## Tests
- `node logic.js` → prüft die reine Logik (Fortschritt).

## Phase 2 (später)
Wochen-Kalender (`tasks.planned_for`), Routinen (Tabelle `routines`),
Notizen/Foto pro Zone (Storage-Bucket `zone-photos`).
