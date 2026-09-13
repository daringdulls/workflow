-- ============================================================================
-- Pixel Core — AI inquiry agent (Pixel AI foundation)
-- Inbound WhatsApp/email inquiries are read by a Claude-powered agent that
-- checks live availability, rates and promotions, then drafts a reply and an
-- optional quotation. Nothing reaches a guest until a staff member approves it.
-- ============================================================================

create type ai_draft_status as enum ('pending', 'approved', 'rejected', 'sent');

create table ai_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  guest_id uuid references guests(id) on delete set null,
  channel communication_channel not null,
  contact_address text, -- phone (whatsapp) or email address the reply goes back to
  inbound_message text not null,
  draft_reply text not null,
  suggested_quotation jsonb,
  needs_more_info text[] not null default '{}',
  confidence text,
  tool_log jsonb not null default '[]',
  model_used text not null,
  status ai_draft_status not null default 'pending',
  quotation_id uuid references quotations(id) on delete set null,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index ai_drafts_org_status_idx on ai_drafts(organization_id, status, created_at desc);

alter table ai_drafts enable row level security;

create policy "ai drafts scoped to org" on ai_drafts for all to authenticated
  using (organization_id = current_profile_org())
  with check (organization_id = current_profile_org());
