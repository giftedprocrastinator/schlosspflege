-- Schlosspflege · Härtung (2026-07-05)
-- Supabase vergibt EXECUTE auf Funktionen per Default an PUBLIC (inkl. anon).
-- Damit war join_household ohne Login ein Invite-Code-Orakel (gültiger Code
-- lieferte einen anderen Fehler als „Ungültiger Code"). RPCs sind jetzt nur
-- noch für eingeloggte Nutzer aufrufbar. (Security-Advisor-Lint 0028)
revoke execute on function create_household(text) from public, anon;
revoke execute on function join_household(text) from public, anon;
revoke execute on function is_member(uuid) from public, anon;
revoke execute on function is_admin() from public, anon;
revoke execute on function admin_overview() from public, anon;
-- Plattform-Helfer (Event-Trigger, nicht direkt aufrufbar) — nur fürs Linter-Grün:
revoke execute on function rls_auto_enable() from public, anon;
