-- ============================================================================
-- Pixel Core — initial schema (V1)
-- Central integration hub for the Pixel hospitality ecosystem.
-- Run in the Supabase SQL editor, or via `supabase db push`.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type user_status as enum ('active', 'inactive', 'suspended');
create type property_status as enum ('active', 'inactive');
create type room_status as enum ('available', 'occupied', 'dirty', 'cleaning', 'maintenance', 'out_of_order');
create type room_type_status as enum ('active', 'inactive');

create type rate_type as enum ('public', 'direct', 'agent', 'b2b', 'promotion', 'package', 'corporate', 'special');
create type rate_status as enum ('active', 'inactive', 'expired');

create type booking_status as enum (
  'inquiry', 'quotation', 'tentative', 'confirmed',
  'checked_in', 'checked_out', 'cancelled', 'no_show'
);
create type payment_status as enum ('unpaid', 'partially_paid', 'paid', 'refunded');
create type booking_source as enum (
  'direct', 'whatsapp', 'website', 'instagram', 'facebook', 'email', 'phone',
  'walk_in', 'agent', 'b2b', 'booking_com', 'agoda', 'expedia', 'tripadvisor', 'other'
);
create type sync_status as enum ('pending', 'syncing', 'synced', 'error');

create type agent_status as enum ('active', 'inactive');

create type lead_source as enum (
  'whatsapp', 'instagram', 'facebook', 'website', 'email', 'google',
  'tripadvisor', 'phone', 'walk_in', 'referral', 'tiktok', 'agent', 'other'
);
create type lead_status as enum ('new', 'contacted', 'qualified', 'quotation', 'follow_up', 'won', 'lost');
create type lost_reason as enum (
  'price', 'no_availability', 'no_response', 'booked_competitor',
  'dates_changed', 'flight_issue', 'visa_issue', 'other'
);

create type quotation_status as enum ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted');

create type communication_channel as enum ('whatsapp', 'email', 'phone', 'instagram', 'facebook', 'internal_note');
create type communication_direction as enum ('inbound', 'outbound', 'internal');

create type app_connection_status as enum ('connected', 'disconnected', 'syncing', 'error', 'coming_soon');

create type event_status as enum ('pending', 'processing', 'completed', 'failed');

create type audit_action as enum (
  'created', 'updated', 'deleted', 'cancelled', 'status_changed',
  'login', 'permission_changed', 'rate_changed', 'manual_override'
);

create type notification_type as enum (
  'booking_new', 'booking_changed', 'cancellation', 'payment_received', 'payment_overdue',
  'arrival', 'departure', 'inquiry_new', 'follow_up_due', 'sync_failure', 'review_new', 'system_warning'
);
create type notification_status as enum ('unread', 'read', 'dismissed');

create type transaction_type as enum ('restaurant', 'dive', 'accommodation', 'transfer', 'activity', 'other');
create type payment_method as enum ('cash', 'card', 'bank_transfer', 'room_charge', 'credit', 'other');
create type transaction_status as enum ('pending', 'completed', 'voided', 'refunded');

create type review_platform as enum ('google', 'tripadvisor', 'booking_com', 'expedia', 'facebook', 'other');
create type review_sentiment as enum ('positive', 'neutral', 'negative');
create type review_response_status as enum ('pending', 'responded', 'not_required');

-- ----------------------------------------------------------------------------
-- Reference-number generator (GST-000001, BKG-000001, ...)
-- ----------------------------------------------------------------------------

create table reference_sequences (
  prefix text primary key,
  next_value bigint not null default 1
);

create or replace function next_reference(p_prefix text)
returns text
language plpgsql
as $$
declare
  v_next bigint;
begin
  insert into reference_sequences (prefix, next_value)
  values (p_prefix, 2)
  on conflict (prefix) do update set next_value = reference_sequences.next_value + 1
  returning next_value - 1 into v_next;

  return p_prefix || '-' || lpad(v_next::text, 6, '0');
end;
$$;

-- ----------------------------------------------------------------------------
-- Core: organizations, properties, profiles, roles, permissions
-- ----------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status property_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  code text not null,
  address text,
  city text,
  country text,
  timezone text default 'Indian/Maldives',
  currency text not null default 'USD',
  status property_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  module text not null
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Extends auth.users (Supabase Auth) with Pixel Core profile data.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  phone text,
  avatar_url text,
  job_title text,
  department text,
  role_id uuid references roles(id) on delete set null,
  is_org_admin boolean not null default false,
  status user_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_property_access (
  user_id uuid not null references profiles(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  primary key (user_id, property_id)
);

-- ----------------------------------------------------------------------------
-- Agents & companies (Pixel B2B foundation)
-- ----------------------------------------------------------------------------

create table agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_code text not null,
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  whatsapp text,
  country text,
  market text,
  credit_limit numeric(14, 2),
  payment_terms text,
  status agent_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_code)
);

-- Agent portal login: links a Supabase auth user to an agent (Pixel B2B).
create table agent_users (
  id uuid primary key references auth.users(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  status user_status not null default 'active',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Guest master
-- ----------------------------------------------------------------------------

create table guests (
  id uuid primary key default gen_random_uuid(),
  guest_number text not null unique default next_reference('GST'),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text,
  first_name text not null,
  last_name text not null,
  gender text,
  date_of_birth date,
  nationality text,
  passport_number text,
  passport_expiry date,
  email text,
  phone text,
  whatsapp text,
  address text,
  country text,
  preferred_language text,
  vip_status boolean not null default false,
  notes text,
  dietary_requirements text,
  special_requirements text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id)
);

create index guests_org_idx on guests(organization_id);
create index guests_email_idx on guests(lower(email));
create index guests_phone_idx on guests(phone);
create index guests_passport_idx on guests(passport_number);
create index guests_name_idx on guests(lower(first_name || ' ' || last_name));

-- Pixel Diving foundation
create table dive_profiles (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade unique,
  certification_agency text,
  certification_level text,
  certification_number text,
  number_of_dives integer,
  last_dive_date date,
  nitrox_certified boolean not null default false,
  medical_notes text,
  equipment_requirements text,
  bcd_size text,
  fins_size text,
  wetsuit_size text,
  tank_preference text,
  emergency_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Rooms, room types
-- ----------------------------------------------------------------------------

create table room_types (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  code text not null,
  max_guests integer not null default 2,
  base_occupancy integer not null default 2,
  description text,
  status room_type_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, code)
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  room_type_id uuid not null references room_types(id) on delete restrict,
  room_number text not null,
  floor text,
  status room_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, room_number)
);

create index rooms_property_idx on rooms(property_id);
create index rooms_room_type_idx on rooms(room_type_id);

-- ----------------------------------------------------------------------------
-- Rate engine
-- ----------------------------------------------------------------------------

create table rate_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  room_type_id uuid references room_types(id) on delete cascade,
  rate_type rate_type not null default 'public',
  name text not null,
  meal_plan text,
  market text,
  agent_id uuid references agents(id) on delete cascade,
  currency text not null default 'USD',
  amount numeric(14, 2) not null,
  start_date date not null,
  end_date date not null,
  min_stay integer,
  max_stay integer,
  blackout_dates date[] not null default '{}',
  booking_window text,
  cancellation_policy text,
  status rate_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index rate_plans_property_idx on rate_plans(property_id, room_type_id, start_date, end_date);

-- ----------------------------------------------------------------------------
-- Reservation master (synced from Pixel Booking Manager)
-- ----------------------------------------------------------------------------

create table reservations (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique default next_reference('BKG'),
  external_booking_id text,
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  guest_id uuid not null references guests(id) on delete restrict,

  booking_date date not null default current_date,
  arrival_date date not null,
  departure_date date not null,
  nights integer generated always as (departure_date - arrival_date) stored,
  adults integer not null default 1,
  children integer not null default 0,
  infants integer not null default 0,
  num_rooms integer not null default 1,

  room_type_id uuid references room_types(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  meal_plan text,

  booking_source booking_source not null default 'direct',
  market text,
  agent_id uuid references agents(id) on delete set null,
  handler_id uuid references profiles(id) on delete set null,

  currency text not null default 'USD',
  accommodation_amount numeric(14, 2) not null default 0,
  dive_amount numeric(14, 2) not null default 0,
  transfer_amount numeric(14, 2) not null default 0,
  extra_amount numeric(14, 2) not null default 0,
  domestic_flight_amount numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  total_revenue numeric(14, 2) generated always as (
    accommodation_amount + dive_amount + transfer_amount + extra_amount +
    domestic_flight_amount + tax_amount - discount_amount
  ) stored,
  amount_paid numeric(14, 2) not null default 0,
  outstanding_amount numeric(14, 2) generated always as (
    (accommodation_amount + dive_amount + transfer_amount + extra_amount +
     domestic_flight_amount + tax_amount - discount_amount) - amount_paid
  ) stored,

  invoice_number text,
  extra_invoice_number text,
  payment_status payment_status not null default 'unpaid',
  booking_status booking_status not null default 'inquiry',
  special_requests text,
  internal_notes text,

  -- synchronization metadata
  source_app text not null default 'pixel_core',
  source_record_id text,
  last_synced_at timestamptz,
  sync_status sync_status not null default 'synced',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),

  unique (source_app, source_record_id)
);

create index reservations_org_idx on reservations(organization_id);
create index reservations_property_idx on reservations(property_id);
create index reservations_guest_idx on reservations(guest_id);
create index reservations_arrival_idx on reservations(arrival_date);
create index reservations_status_idx on reservations(booking_status);

-- Pixel Diving foundation
create table dive_bookings (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  dive_package text,
  dive_start_date date,
  dive_end_date date,
  number_of_dives integer,
  dive_sites text[] not null default '{}',
  guide text,
  boat text,
  equipment text,
  status text not null default 'scheduled',
  amount numeric(14, 2) default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pixel POS foundation
create table pos_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  outlet text not null,
  guest_id uuid references guests(id) on delete set null,
  reservation_id uuid references reservations(id) on delete set null,
  room_id uuid references rooms(id) on delete set null,
  transaction_type transaction_type not null default 'other',
  amount numeric(14, 2) not null,
  currency text not null default 'USD',
  payment_method payment_method not null default 'cash',
  status transaction_status not null default 'completed',
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Pixel Reputation foundation
create table reviews (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid references guests(id) on delete set null,
  property_id uuid not null references properties(id) on delete cascade,
  platform review_platform not null default 'other',
  rating numeric(3, 1),
  review_text text,
  review_date date not null default current_date,
  sentiment review_sentiment,
  response text,
  response_status review_response_status not null default 'pending',
  staff_assigned uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Availability
-- ----------------------------------------------------------------------------

create table availability_daily (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  room_type_id uuid not null references room_types(id) on delete cascade,
  date date not null,
  total_inventory integer not null default 0,
  confirmed_rooms integer not null default 0,
  tentative_rooms integer not null default 0,
  out_of_order_rooms integer not null default 0,
  available_rooms integer generated always as (
    total_inventory - confirmed_rooms - tentative_rooms - out_of_order_rooms
  ) stored,
  updated_at timestamptz not null default now(),
  unique (property_id, room_type_id, date)
);

create index availability_daily_lookup_idx on availability_daily(property_id, room_type_id, date);

create table availability_overrides (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  room_type_id uuid not null references room_types(id) on delete cascade,
  date date not null,
  adjustment integer not null,
  reason text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Recalculates availability_daily for a property/room_type over a date range
-- from confirmed/tentative reservations and out-of-order rooms.
create or replace function recalculate_availability(
  p_property_id uuid, p_room_type_id uuid, p_start date, p_end date
) returns void
language plpgsql
as $$
declare
  v_total integer;
  v_ooo integer;
  d date;
begin
  select count(*) into v_total from rooms
    where property_id = p_property_id and room_type_id = p_room_type_id;
  select count(*) into v_ooo from rooms
    where property_id = p_property_id and room_type_id = p_room_type_id and status = 'out_of_order';

  for d in select generate_series(p_start, p_end, interval '1 day')::date loop
    insert into availability_daily (property_id, room_type_id, date, total_inventory, confirmed_rooms, tentative_rooms, out_of_order_rooms, updated_at)
    select
      p_property_id, p_room_type_id, d, v_total,
      coalesce(sum(case when r.booking_status = 'confirmed' then r.num_rooms else 0 end), 0),
      coalesce(sum(case when r.booking_status in ('inquiry', 'quotation', 'tentative') then r.num_rooms else 0 end), 0),
      v_ooo, now()
    from reservations r
    where r.property_id = p_property_id and r.room_type_id = p_room_type_id
      and r.booking_status not in ('cancelled', 'no_show', 'checked_out')
      and d >= r.arrival_date and d < r.departure_date
    on conflict (property_id, room_type_id, date) do update set
      total_inventory = excluded.total_inventory,
      confirmed_rooms = excluded.confirmed_rooms,
      tentative_rooms = excluded.tentative_rooms,
      out_of_order_rooms = excluded.out_of_order_rooms,
      updated_at = now();
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- CRM: leads, quotations, communications
-- ----------------------------------------------------------------------------

create table leads (
  id uuid primary key default gen_random_uuid(),
  lead_number text not null unique default next_reference('INQ'),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  guest_name text not null,
  contact_email text,
  contact_phone text,
  source lead_source not null default 'other',
  travel_start_date date,
  travel_end_date date,
  adults integer default 1,
  children integer default 0,
  requirements text,
  assigned_to uuid references profiles(id) on delete set null,
  status lead_status not null default 'new',
  follow_up_date date,
  estimated_value numeric(14, 2),
  currency text default 'USD',
  lost_reason lost_reason,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index leads_org_idx on leads(organization_id);
create index leads_status_idx on leads(status);
create index leads_followup_idx on leads(follow_up_date);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique default next_reference('QUO'),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  guest_id uuid references guests(id) on delete set null,
  arrival_date date,
  departure_date date,
  room_type_id uuid references room_types(id) on delete set null,
  meal_plan text,
  accommodation_amount numeric(14, 2) not null default 0,
  dive_amount numeric(14, 2) not null default 0,
  transfer_amount numeric(14, 2) not null default 0,
  activities_amount numeric(14, 2) not null default 0,
  domestic_flight_amount numeric(14, 2) not null default 0,
  extras_amount numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) generated always as (
    accommodation_amount + dive_amount + transfer_amount + activities_amount +
    domestic_flight_amount + extras_amount + tax_amount - discount_amount
  ) stored,
  currency text not null default 'USD',
  expiry_date date,
  terms text,
  status quotation_status not null default 'draft',
  converted_reservation_id uuid references reservations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index quotations_org_idx on quotations(organization_id);
create index quotations_status_idx on quotations(status);

create table communications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  guest_id uuid references guests(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  channel communication_channel not null,
  direction communication_direction not null default 'outbound',
  subject text,
  message text not null,
  occurred_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (guest_id is not null or lead_id is not null)
);

create index communications_guest_idx on communications(guest_id);
create index communications_lead_idx on communications(lead_id);

-- ----------------------------------------------------------------------------
-- Integrations: app connections, events, sync logs
-- ----------------------------------------------------------------------------

create table app_connections (
  id uuid primary key default gen_random_uuid(),
  app_key text not null unique,
  app_name text not null,
  description text,
  api_endpoint text,
  status app_connection_status not null default 'coming_soon',
  is_primary_source boolean not null default false,
  last_sync_at timestamptz,
  api_key_ref text,
  webhook_secret_ref text,
  allowed_events text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  event_number text not null unique default next_reference('EVT'),
  event_type text not null,
  source_app text not null,
  target_app text,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}',
  status event_status not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  retry_count integer not null default 0,
  error_message text
);

create index events_status_idx on events(status);
create index events_type_idx on events(event_type);
create index events_created_idx on events(created_at desc);

create table sync_logs (
  id uuid primary key default gen_random_uuid(),
  app_key text not null references app_connections(app_key) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_received integer not null default 0,
  records_sent integer not null default 0,
  failed_records integer not null default 0,
  status sync_status not null default 'pending',
  details jsonb not null default '{}'
);

create index sync_logs_app_idx on sync_logs(app_key, started_at desc);

-- ----------------------------------------------------------------------------
-- System: audit logs, notifications, files
-- ----------------------------------------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  organization_id uuid references organizations(id) on delete cascade,
  application text not null default 'pixel_core',
  entity_type text not null,
  entity_id text,
  action audit_action not null,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index audit_logs_org_idx on audit_logs(organization_id, created_at desc);
create index audit_logs_entity_idx on audit_logs(entity_type, entity_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text,
  link text,
  status notification_status not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx on notifications(user_id, status, created_at desc);

create table files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete set null,
  related_type text not null, -- guest | booking | quotation | agent | property
  related_id uuid not null,
  file_type text not null, -- passport | voucher | invoice | quotation | rate_sheet | factsheet | contract | other
  file_name text not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index files_related_idx on files(related_type, related_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations','properties','profiles','agents','guests','dive_profiles',
    'room_types','rooms','rate_plans','reservations','dive_bookings','reviews',
    'leads','quotations','app_connections'
  ] loop
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;
