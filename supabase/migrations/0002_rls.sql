-- ============================================================================
-- Pixel Core — row level security
-- Single rule of thumb: a signed-in user can only see rows belonging to
-- their own organization, and (for property-scoped tables) only properties
-- they've been granted access to, unless they are an org admin.
-- ============================================================================

create or replace function current_profile_org()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function current_profile_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_org_admin from profiles where id = auth.uid()), false);
$$;

create or replace function has_property_access(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    current_profile_is_admin()
    or exists (
      select 1 from user_property_access
      where user_id = auth.uid() and property_id = p_property_id
    );
$$;

alter table organizations enable row level security;
alter table properties enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table profiles enable row level security;
alter table user_property_access enable row level security;
alter table agents enable row level security;
alter table agent_users enable row level security;
alter table guests enable row level security;
alter table dive_profiles enable row level security;
alter table room_types enable row level security;
alter table rooms enable row level security;
alter table rate_plans enable row level security;
alter table reservations enable row level security;
alter table dive_bookings enable row level security;
alter table pos_transactions enable row level security;
alter table reviews enable row level security;
alter table availability_daily enable row level security;
alter table availability_overrides enable row level security;
alter table leads enable row level security;
alter table quotations enable row level security;
alter table communications enable row level security;
alter table app_connections enable row level security;
alter table events enable row level security;
alter table sync_logs enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
alter table files enable row level security;

-- Permissions catalog is global reference data — every authenticated user can read it.
create policy "permissions readable" on permissions for select to authenticated using (true);
create policy "app connections readable" on app_connections for select to authenticated using (true);
create policy "events readable" on events for select to authenticated using (true);
create policy "sync logs readable" on sync_logs for select to authenticated using (true);

create policy "org members read own org" on organizations for select to authenticated
  using (id = current_profile_org());
create policy "org admins update own org" on organizations for update to authenticated
  using (id = current_profile_org() and current_profile_is_admin());

create policy "roles scoped to org" on roles for select to authenticated
  using (organization_id = current_profile_org() or organization_id is null);
create policy "org admins manage roles" on roles for all to authenticated
  using (organization_id = current_profile_org() and current_profile_is_admin());

create policy "role permissions readable" on role_permissions for select to authenticated using (true);
create policy "org admins manage role permissions" on role_permissions for all to authenticated
  using (current_profile_is_admin());

create policy "profiles scoped to org" on profiles for select to authenticated
  using (organization_id = current_profile_org());
create policy "users update own profile" on profiles for update to authenticated
  using (id = auth.uid() or current_profile_is_admin());
create policy "org admins insert profiles" on profiles for insert to authenticated
  with check (current_profile_is_admin());

create policy "user property access scoped" on user_property_access for select to authenticated
  using (user_id = auth.uid() or current_profile_is_admin());
create policy "org admins manage property access" on user_property_access for all to authenticated
  using (current_profile_is_admin());

create policy "properties scoped to org" on properties for select to authenticated
  using (organization_id = current_profile_org());
create policy "org admins manage properties" on properties for insert to authenticated
  with check (organization_id = current_profile_org() and current_profile_is_admin());
create policy "org admins update properties" on properties for update to authenticated
  using (organization_id = current_profile_org() and current_profile_is_admin());

create policy "agents scoped to org" on agents for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());

create policy "agent users scoped to org" on agent_users for select to authenticated
  using (agent_id in (select id from agents where organization_id = current_profile_org()));

create policy "guests scoped to org" on guests for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());

create policy "dive profiles via guest org" on dive_profiles for all to authenticated
  using (guest_id in (select id from guests where organization_id = current_profile_org()));

create policy "room types scoped to property access" on room_types for select to authenticated
  using (has_property_access(property_id));
create policy "admins manage room types" on room_types for insert to authenticated
  with check (has_property_access(property_id));
create policy "admins update room types" on room_types for update to authenticated
  using (has_property_access(property_id));

create policy "rooms scoped to property access" on rooms for all to authenticated
  using (has_property_access(property_id))
  with check (has_property_access(property_id));

create policy "rate plans scoped to property access" on rate_plans for all to authenticated
  using (has_property_access(property_id))
  with check (has_property_access(property_id));

create policy "reservations scoped to property access" on reservations for all to authenticated
  using (has_property_access(property_id))
  with check (has_property_access(property_id));

create policy "dive bookings via guest org" on dive_bookings for all to authenticated
  using (guest_id in (select id from guests where organization_id = current_profile_org()));

create policy "pos transactions scoped to property access" on pos_transactions for all to authenticated
  using (has_property_access(property_id));

create policy "reviews scoped to property access" on reviews for all to authenticated
  using (has_property_access(property_id));

create policy "availability scoped to property access" on availability_daily for select to authenticated
  using (has_property_access(property_id));
create policy "availability overrides scoped to property access" on availability_overrides for all to authenticated
  using (has_property_access(property_id));

create policy "leads scoped to org" on leads for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());

create policy "quotations scoped to org" on quotations for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());

create policy "communications scoped to org" on communications for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());

create policy "audit logs scoped to org" on audit_logs for select to authenticated
  using (organization_id = current_profile_org());
create policy "system inserts audit logs" on audit_logs for insert to authenticated
  with check (organization_id = current_profile_org());

create policy "notifications scoped to user" on notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications updatable by owner" on notifications for update to authenticated
  using (user_id = auth.uid());

create policy "files scoped to org" on files for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());

-- ----------------------------------------------------------------------------
-- Auto-create a profile row whenever a new Supabase Auth user is created.
-- ----------------------------------------------------------------------------

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
