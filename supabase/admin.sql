-- Schlosspflege · Admin-Zugang (Verwaltung durch das Admin-Konto)
-- Admin-Prüfung liegt serverseitig in Postgres — der Client blendet nur die UI ein.
-- Eingespielt als Migrationen: admin_access + admin_manage (2026-07-05).

-- Genau ein Admin-Konto, geprüft über die E-Mail im JWT.
create or replace function is_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'patriciafindel@icloud.com';
$$;

-- Admin darf Haushalte/Mitglieder/Zonen/Aufgaben direkt verwalten
-- (permissive Policies — wirken zusätzlich zu den is_member-Policies aus schema.sql).
create policy households_admin on households for all using (is_admin()) with check (is_admin());
create policy members_admin on household_members for all using (is_admin()) with check (is_admin());
create policy zones_admin on zones for all using (is_admin()) with check (is_admin());
create policy tasks_admin on tasks for all using (is_admin()) with check (is_admin());

-- Admin-Überblick: alle Konten + Haushalte mit Mitgliedern (inkl. IDs) und Zonen.
-- SECURITY DEFINER umgeht RLS und liest auth.users, wirft daher für Nicht-Admins sofort.
create or replace function admin_overview()
returns json language plpgsql security definer stable set search_path = public as $$
begin
  if not is_admin() then raise exception 'Kein Admin'; end if;
  return json_build_object(
    'users', coalesce((
      select json_agg(json_build_object(
        'id', u.id, 'email', u.email, 'created_at', u.created_at
      ) order by u.created_at) from auth.users u), '[]'::json),
    'households', coalesce((
      select json_agg(row_to_json(x) order by x.created_at)
      from (
        select h.id, h.name, h.invite_code, h.created_at,
          (select coalesce(json_agg(json_build_object('id', u.id, 'email', u.email) order by m.joined_at), '[]'::json)
             from household_members m join auth.users u on u.id = m.user_id
            where m.household_id = h.id) as members,
          (select coalesce(json_agg(json_build_object(
                'id', z.id, 'emoji', z.emoji, 'name', z.name,
                'tasks', (select count(*) from tasks t where t.zone_id = z.id),
                'tasks_done', (select count(*) from tasks t where t.zone_id = z.id and t.done)
              ) order by z.position, z.created_at), '[]'::json)
             from zones z where z.household_id = h.id) as zones
        from households h
      ) x), '[]'::json)
  );
end; $$;

-- Konto löschen (Mitgliedschaften hängen per FK-Cascade dran; das eigene nie).
create or replace function admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Kein Admin'; end if;
  if p_user_id = auth.uid() then raise exception 'Eigenes Konto nicht löschbar'; end if;
  delete from auth.users where id = p_user_id;
end; $$;

grant execute on function is_admin() to authenticated;
grant execute on function admin_overview() to authenticated;
grant execute on function admin_delete_user(uuid) to authenticated;
revoke execute on function is_admin() from public, anon;
revoke execute on function admin_overview() from public, anon;
revoke execute on function admin_delete_user(uuid) from public, anon;
