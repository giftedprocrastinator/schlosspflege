-- Schlosspflege · Admin-Zugang (Überblick über alle Haushalte)
-- Admin-Prüfung liegt serverseitig in Postgres — der Client blendet nur die UI ein.

-- Genau ein Admin-Konto, geprüft über die E-Mail im JWT.
create or replace function is_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'patriciafindel@icloud.com';
$$;
grant execute on function is_admin() to authenticated;

-- Admin-Überblick: Kontenzahl + alle Haushalte mit Kennzahlen.
-- SECURITY DEFINER umgeht RLS, wirft daher für Nicht-Admins sofort.
create or replace function admin_overview()
returns json language plpgsql security definer stable set search_path = public as $$
begin
  if not is_admin() then raise exception 'Kein Admin'; end if;
  return json_build_object(
    'users', (select count(*) from auth.users),
    'households', coalesce((
      select json_agg(row_to_json(x) order by x.created_at)
      from (
        select h.id, h.name, h.created_at,
          (select coalesce(json_agg(u.email order by m.joined_at), '[]'::json)
             from household_members m join auth.users u on u.id = m.user_id
            where m.household_id = h.id) as members,
          (select count(*) from zones z where z.household_id = h.id) as zones,
          (select count(*) from tasks t join zones z on z.id = t.zone_id
            where z.household_id = h.id) as tasks,
          (select count(*) from tasks t join zones z on z.id = t.zone_id
            where z.household_id = h.id and t.done) as tasks_done,
          (select max(t.done_at) from tasks t join zones z on z.id = t.zone_id
            where z.household_id = h.id) as last_done
        from households h
      ) x), '[]'::json)
  );
end; $$;
grant execute on function admin_overview() to authenticated;
