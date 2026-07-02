-- Schlosspflege · Supabase-Schema (Phase 1)
create extension if not exists pgcrypto;

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table zones (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  emoji text not null default '🏠',
  notes text not null default '',
  photo_path text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zones(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  planned_for date,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Mitgliedschafts-Helfer: SECURITY DEFINER umgeht RLS → keine Rekursion auf household_members.
create or replace function is_member(hid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- Haushalt anlegen (atomar: Haushalt + owner-Mitgliedschaft). Umgeht RETURNING/RLS-Falle.
create or replace function create_household(p_name text)
returns households language plpgsql security definer set search_path = public as $$
declare h households;
begin
  insert into households (name, invite_code, created_by)
  values (p_name, encode(gen_random_bytes(4), 'hex'), auth.uid())
  returning * into h;
  insert into household_members (household_id, user_id, role)
  values (h.id, auth.uid(), 'owner');
  return h;
end; $$;

-- Per Invite-Code beitreten.
create or replace function join_household(p_code text)
returns households language plpgsql security definer set search_path = public as $$
declare h households;
begin
  select * into h from households where invite_code = p_code;
  if h.id is null then raise exception 'Ungültiger Code'; end if;
  insert into household_members (household_id, user_id, role)
  values (h.id, auth.uid(), 'member')
  on conflict (household_id, user_id) do nothing;
  return h;
end; $$;

grant execute on function create_household(text) to authenticated;
grant execute on function join_household(text) to authenticated;

-- RLS
alter table households        enable row level security;
alter table household_members enable row level security;
alter table zones             enable row level security;
alter table tasks             enable row level security;

create policy households_select on households for select using (is_member(id));
create policy households_update on households for update using (is_member(id)) with check (is_member(id));

create policy members_select on household_members for select using (is_member(household_id));
create policy members_leave  on household_members for delete using (user_id = auth.uid());

create policy zones_all on zones for all
  using (is_member(household_id)) with check (is_member(household_id));

create policy tasks_all on tasks for all
  using (is_member((select z.household_id from zones z where z.id = zone_id)))
  with check (is_member((select z.household_id from zones z where z.id = zone_id)));
