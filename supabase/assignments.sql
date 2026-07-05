-- Schlosspflege · Personen-Zuordnung (Migration: assignments, 2026-07-05)

-- Zonen und Aufgaben können einem Haushaltsmitglied gehören.
-- Aufgabe erbt die Zonen-Zuordnung, wenn sie selbst keine hat (Client-Logik).
alter table zones add column assigned_to uuid references auth.users(id) on delete set null;
alter table tasks add column assigned_to uuid references auth.users(id) on delete set null;

-- Anzeigename + frei wählbares Emoji pro Mitglied (selbst editierbar).
alter table household_members add column display_name text, add column emoji text;
create policy members_update_self on household_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
