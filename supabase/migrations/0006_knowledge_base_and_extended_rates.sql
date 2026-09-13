-- ============================================================================
-- Pixel Core — Knowledge Base, dive/transfer rates, offers, AI escalation
--
-- Splits "rates" into the distinct concepts the AI agent needs as separate,
-- narrowly-scoped tools: room rates (rate_plans, existing), dive rates,
-- transfer rates, and stay-triggered offers. Adds a property Knowledge Base
-- (with a source citation on every article) so the agent can answer
-- non-transactional questions from approved content instead of guessing.
-- Adds an escalation path so low-confidence answers become "Human Required"
-- instead of a fabricated reply.
-- ============================================================================

create type knowledge_category as enum (
  'check_in_out', 'meal_times', 'airport_transfer', 'room_info', 'facilities',
  'diving', 'dive_requirements', 'cancellation_policy', 'payment_policy',
  'children_policy', 'extra_bed_policy', 'restaurant_menu', 'activities',
  'bike_rental', 'island_info', 'emergency_info', 'faq', 'other'
);

create table knowledge_base_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade, -- null = applies to every property in the org
  category knowledge_category not null,
  title text not null,
  content text not null,
  status property_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id)
);

create index knowledge_base_lookup_idx on knowledge_base_articles(organization_id, property_id, category, status);

create table dive_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  package_name text not null,
  dives_included integer not null,
  price_per_person numeric(14, 2) not null,
  currency text not null default 'USD',
  min_participants integer not null default 1,
  start_date date not null,
  end_date date not null,
  status rate_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dive_rates_lookup_idx on dive_rates(property_id, start_date, end_date, status);

create table transfer_rates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  transfer_type text not null, -- e.g. domestic_flight, speedboat, seaplane
  direction text not null check (direction in ('one_way', 'return')),
  price_per_person numeric(14, 2) not null,
  currency text not null default 'USD',
  start_date date not null,
  end_date date not null,
  status rate_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transfer_rates_lookup_idx on transfer_rates(property_id, start_date, end_date, status);

create table offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade, -- null = applies to every property in the org
  name text not null,
  description text,
  promo_code text,
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  discount_value numeric(14, 2) not null,
  trigger_min_nights integer,
  applies_to text[] not null default '{accommodation}', -- accommodation | diving | transfer | all
  start_date date not null,
  end_date date not null,
  status rate_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offers_lookup_idx on offers(property_id, start_date, end_date, status);

alter table organizations add column ai_auto_reply_enabled boolean not null default false;

alter type ai_draft_status add value 'human_required';

alter table ai_drafts add column intent text;
alter table ai_drafts add column escalated boolean not null default false;
alter table ai_drafts add column escalation_reason text;
alter table ai_drafts add column ai_action_summary text;

alter table knowledge_base_articles enable row level security;
alter table dive_rates enable row level security;
alter table transfer_rates enable row level security;
alter table offers enable row level security;

create policy "knowledge base scoped to org" on knowledge_base_articles for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());

create policy "dive rates scoped to property access" on dive_rates for all to authenticated
  using (has_property_access(property_id))
  with check (has_property_access(property_id));

create policy "transfer rates scoped to property access" on transfer_rates for all to authenticated
  using (has_property_access(property_id))
  with check (has_property_access(property_id));

create policy "offers scoped to org" on offers for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());

create trigger set_updated_at before update on knowledge_base_articles for each row execute function set_updated_at();
create trigger set_updated_at before update on dive_rates for each row execute function set_updated_at();
create trigger set_updated_at before update on transfer_rates for each row execute function set_updated_at();
create trigger set_updated_at before update on offers for each row execute function set_updated_at();
