-- ============================================================================
-- Pixel Core — reference/catalog data (not demo data)
-- Permission catalog, system roles, and the Pixel application registry.
-- ============================================================================

insert into permissions (key, label, module) values
  ('view_dashboard', 'View dashboard', 'dashboard'),
  ('view_booking', 'View bookings', 'reservations'),
  ('create_booking', 'Create bookings', 'reservations'),
  ('edit_booking', 'Edit bookings', 'reservations'),
  ('cancel_booking', 'Cancel bookings', 'reservations'),
  ('view_guests', 'View guests', 'guests'),
  ('edit_guests', 'Edit guests', 'guests'),
  ('view_finance', 'View finance', 'finance'),
  ('view_reports', 'View reports', 'reports'),
  ('manage_users', 'Manage users', 'admin'),
  ('manage_roles', 'Manage roles & permissions', 'admin'),
  ('manage_properties', 'Manage properties', 'admin'),
  ('manage_rates', 'Manage rate engine', 'rates'),
  ('manage_availability', 'Manage availability overrides', 'availability'),
  ('manage_agents', 'Manage agents & companies', 'agents'),
  ('view_crm', 'View leads & quotations', 'crm'),
  ('manage_crm', 'Manage leads & quotations', 'crm'),
  ('manage_integrations', 'Manage app connections & webhooks', 'integrations'),
  ('view_audit_logs', 'View audit logs', 'system'),
  ('manage_files', 'Manage files & documents', 'system')
on conflict (key) do nothing;

insert into roles (organization_id, name, description, is_system) values
  (null, 'Super Admin', 'Full access to every organization, property and setting.', true),
  (null, 'Company Admin', 'Full access within their organization.', true),
  (null, 'Management', 'Property-level oversight across all modules.', true),
  (null, 'Reservations', 'Manages bookings, guests and rates.', true),
  (null, 'Front Office', 'Check-in/out, room assignment, guest requests.', true),
  (null, 'Finance', 'Payments, invoicing and financial reporting.', true),
  (null, 'Restaurant', 'Restaurant order manager access.', true),
  (null, 'Dive Team', 'Dive profiles and dive bookings.', true),
  (null, 'Marketing', 'Reputation and communications.', true),
  (null, 'Sales', 'Leads, inquiries and quotations.', true),
  (null, 'Operations', 'Cross-department operational visibility.', true),
  (null, 'Agent', 'Restricted external B2B agent access.', true)
on conflict (organization_id, name) do nothing;

-- Pixel application registry.
insert into app_connections (app_key, app_name, description, status, is_primary_source, allowed_events) values
  ('booking_manager', 'Pixel Booking Manager', 'Primary booking data source.', 'disconnected', true,
    array['BOOKING_CREATED','BOOKING_UPDATED','BOOKING_CANCELLED','GUEST_CREATED','GUEST_UPDATED','PAYMENT_CREATED','PAYMENT_UPDATED']),
  ('pms', 'Pixel PMS', 'Room assignment, check-in/out, operational status.', 'disconnected', false,
    array['ROOM_ASSIGNED','CHECKED_IN','CHECKED_OUT']),
  ('restaurant', 'Pixel Restaurant Order Manager', 'Restaurant orders and room charges.', 'disconnected', false,
    array['RESTAURANT_ORDER_CREATED']),
  ('reputation', 'Pixel Reputation Manager', 'Guest reviews and responses.', 'disconnected', false,
    array['REVIEW_RECEIVED']),
  ('availability', 'Pixel Availability', 'Cross-channel inventory distribution.', 'coming_soon', false, array[]::text[]),
  ('b2b', 'Pixel B2B', 'Agent self-service portal.', 'coming_soon', false, array[]::text[]),
  ('sales_b2c', 'Pixel Sales / B2C', 'Direct-to-consumer sales pipeline.', 'coming_soon', false, array[]::text[]),
  ('diving', 'Pixel Diving', 'Dive center operations.', 'coming_soon', false, array['DIVE_BOOKING_CREATED']),
  ('pos', 'Pixel POS', 'Point of sale across outlets.', 'coming_soon', false, array[]::text[]),
  ('analytics', 'Pixel Analytics', 'Cross-ecosystem reporting & BI.', 'coming_soon', false, array[]::text[]),
  ('ai', 'Pixel AI', 'AI-assisted operations.', 'coming_soon', false, array[]::text[]),
  ('finance', 'Pixel Finance', 'Consolidated financial management.', 'coming_soon', false, array[]::text[]),
  ('guest_portal', 'Pixel Guest Portal', 'Self-service guest experience.', 'coming_soon', false, array[]::text[]),
  ('operations', 'Pixel Operations', 'Cross-property operational tasks.', 'coming_soon', false, array[]::text[])
on conflict (app_key) do nothing;
