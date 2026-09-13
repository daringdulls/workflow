// Hand-authored types mirroring supabase/migrations/*.sql.
// Regenerate with `supabase gen types typescript` once a live project exists
// if you want the fully strict, auto-generated version.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserStatus = "active" | "inactive" | "suspended";
export type PropertyStatus = "active" | "inactive";
export type RoomStatus = "available" | "occupied" | "dirty" | "cleaning" | "maintenance" | "out_of_order";
export type RoomTypeStatus = "active" | "inactive";
export type RateType = "public" | "direct" | "agent" | "b2b" | "promotion" | "package" | "corporate" | "special";
export type RateStatus = "active" | "inactive" | "expired";
export type BookingStatus =
  | "inquiry" | "quotation" | "tentative" | "confirmed"
  | "checked_in" | "checked_out" | "cancelled" | "no_show";
export type PaymentStatus = "unpaid" | "partially_paid" | "paid" | "refunded";
export type BookingSource =
  | "direct" | "whatsapp" | "website" | "instagram" | "facebook" | "email" | "phone"
  | "walk_in" | "agent" | "b2b" | "booking_com" | "agoda" | "expedia" | "tripadvisor" | "other";
export type SyncStatus = "pending" | "syncing" | "synced" | "error";
export type AgentStatus = "active" | "inactive";
export type LeadSource =
  | "whatsapp" | "instagram" | "facebook" | "website" | "email" | "google"
  | "tripadvisor" | "phone" | "walk_in" | "referral" | "tiktok" | "agent" | "other";
export type LeadStatus = "new" | "contacted" | "qualified" | "quotation" | "follow_up" | "won" | "lost";
export type LostReason =
  | "price" | "no_availability" | "no_response" | "booked_competitor"
  | "dates_changed" | "flight_issue" | "visa_issue" | "other";
export type QuotationStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "converted";
export type CommunicationChannel = "whatsapp" | "email" | "phone" | "instagram" | "facebook" | "internal_note";
export type CommunicationDirection = "inbound" | "outbound" | "internal";
export type AppConnectionStatus = "connected" | "disconnected" | "syncing" | "error" | "coming_soon";
export type EventStatus = "pending" | "processing" | "completed" | "failed";
export type AuditAction =
  | "created" | "updated" | "deleted" | "cancelled" | "status_changed"
  | "login" | "permission_changed" | "rate_changed" | "manual_override";
export type NotificationType =
  | "booking_new" | "booking_changed" | "cancellation" | "payment_received" | "payment_overdue"
  | "arrival" | "departure" | "inquiry_new" | "follow_up_due" | "sync_failure" | "review_new" | "system_warning";
export type NotificationStatus = "unread" | "read" | "dismissed";
export type TransactionType = "restaurant" | "dive" | "accommodation" | "transfer" | "activity" | "other";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "room_charge" | "credit" | "other";
export type TransactionStatus = "pending" | "completed" | "voided" | "refunded";
export type ReviewPlatform = "google" | "tripadvisor" | "booking_com" | "expedia" | "facebook" | "other";
export type ReviewSentiment = "positive" | "neutral" | "negative";
export type ReviewResponseStatus = "pending" | "responded" | "not_required";
export type AiDraftStatus = "pending" | "approved" | "rejected" | "sent";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  currency: string;
  status: PropertyStatus;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  key: string;
  label: string;
  module: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  role_id: string | null;
  is_org_admin: boolean;
  status: UserStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPropertyAccess {
  user_id: string;
  property_id: string;
}

export interface Agent {
  id: string;
  organization_id: string;
  agent_code: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  market: string | null;
  credit_limit: number | null;
  payment_terms: string | null;
  status: AgentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  guest_number: string;
  organization_id: string;
  title: string | null;
  first_name: string;
  last_name: string;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  country: string | null;
  preferred_language: string | null;
  vip_status: boolean;
  notes: string | null;
  dietary_requirements: string | null;
  special_requirements: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface DiveProfile {
  id: string;
  guest_id: string;
  certification_agency: string | null;
  certification_level: string | null;
  certification_number: string | null;
  number_of_dives: number | null;
  last_dive_date: string | null;
  nitrox_certified: boolean;
  medical_notes: string | null;
  equipment_requirements: string | null;
  bcd_size: string | null;
  fins_size: string | null;
  wetsuit_size: string | null;
  tank_preference: string | null;
  emergency_contact: string | null;
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  code: string;
  max_guests: number;
  base_occupancy: number;
  description: string | null;
  status: RoomTypeStatus;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  room_type_id: string;
  room_number: string;
  floor: string | null;
  status: RoomStatus;
  created_at: string;
  updated_at: string;
}

export interface RatePlan {
  id: string;
  organization_id: string;
  property_id: string;
  room_type_id: string | null;
  rate_type: RateType;
  name: string;
  meal_plan: string | null;
  market: string | null;
  agent_id: string | null;
  currency: string;
  amount: number;
  start_date: string;
  end_date: string;
  min_stay: number | null;
  max_stay: number | null;
  blackout_dates: string[];
  booking_window: string | null;
  cancellation_policy: string | null;
  status: RateStatus;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  booking_number: string;
  external_booking_id: string | null;
  organization_id: string;
  property_id: string;
  guest_id: string;
  booking_date: string;
  arrival_date: string;
  departure_date: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  num_rooms: number;
  room_type_id: string | null;
  room_id: string | null;
  meal_plan: string | null;
  booking_source: BookingSource;
  market: string | null;
  agent_id: string | null;
  handler_id: string | null;
  currency: string;
  accommodation_amount: number;
  dive_amount: number;
  transfer_amount: number;
  extra_amount: number;
  domestic_flight_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_revenue: number;
  amount_paid: number;
  outstanding_amount: number;
  invoice_number: string | null;
  extra_invoice_number: string | null;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  special_requests: string | null;
  internal_notes: string | null;
  source_app: string;
  source_record_id: string | null;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  lead_number: string;
  organization_id: string;
  property_id: string | null;
  guest_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  source: LeadSource;
  travel_start_date: string | null;
  travel_end_date: string | null;
  adults: number | null;
  children: number | null;
  requirements: string | null;
  assigned_to: string | null;
  status: LeadStatus;
  follow_up_date: string | null;
  estimated_value: number | null;
  currency: string | null;
  lost_reason: LostReason | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  organization_id: string;
  property_id: string;
  lead_id: string | null;
  guest_id: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  room_type_id: string | null;
  meal_plan: string | null;
  accommodation_amount: number;
  dive_amount: number;
  transfer_amount: number;
  activities_amount: number;
  domestic_flight_amount: number;
  extras_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  expiry_date: string | null;
  terms: string | null;
  status: QuotationStatus;
  converted_reservation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Communication {
  id: string;
  organization_id: string;
  guest_id: string | null;
  lead_id: string | null;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject: string | null;
  message: string;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
}

export interface AppConnection {
  id: string;
  app_key: string;
  app_name: string;
  description: string | null;
  api_endpoint: string | null;
  status: AppConnectionStatus;
  is_primary_source: boolean;
  last_sync_at: string | null;
  api_key_ref: string | null;
  webhook_secret_ref: string | null;
  allowed_events: string[];
  created_at: string;
  updated_at: string;
}

export interface PixelEvent {
  id: string;
  event_number: string;
  event_type: string;
  source_app: string;
  target_app: string | null;
  entity_type: string;
  entity_id: string | null;
  payload: Json;
  status: EventStatus;
  created_at: string;
  processed_at: string | null;
  retry_count: number;
  error_message: string | null;
}

export interface SyncLog {
  id: string;
  app_key: string;
  started_at: string;
  finished_at: string | null;
  records_received: number;
  records_sent: number;
  failed_records: number;
  status: SyncStatus;
  details: Json;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  application: string;
  entity_type: string;
  entity_id: string | null;
  action: AuditAction;
  old_value: Json;
  new_value: Json;
  ip_address: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  status: NotificationStatus;
  created_at: string;
  read_at: string | null;
}

export interface FileRecord {
  id: string;
  organization_id: string;
  property_id: string | null;
  related_type: string;
  related_id: string;
  file_type: string;
  file_name: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface AvailabilityDaily {
  id: string;
  property_id: string;
  room_type_id: string;
  date: string;
  total_inventory: number;
  confirmed_rooms: number;
  tentative_rooms: number;
  out_of_order_rooms: number;
  available_rooms: number;
  updated_at: string;
}

export interface DiveBooking {
  id: string;
  guest_id: string;
  reservation_id: string | null;
  dive_package: string | null;
  dive_start_date: string | null;
  dive_end_date: string | null;
  number_of_dives: number | null;
  dive_sites: string[];
  guide: string | null;
  boat: string | null;
  equipment: string | null;
  status: string;
  amount: number | null;
  currency: string;
}

export interface PosTransaction {
  id: string;
  property_id: string;
  outlet: string;
  guest_id: string | null;
  reservation_id: string | null;
  room_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  transaction_date: string;
}

export interface Review {
  id: string;
  guest_id: string | null;
  property_id: string;
  platform: ReviewPlatform;
  rating: number | null;
  review_text: string | null;
  review_date: string;
  sentiment: ReviewSentiment | null;
  response: string | null;
  response_status: ReviewResponseStatus;
  staff_assigned: string | null;
}

export interface SuggestedQuotation {
  property_code: string;
  room_type_code: string | null;
  arrival_date: string;
  departure_date: string;
  meal_plan: string | null;
  currency: string;
  accommodation_amount: number;
  notes: string | null;
}

export interface AiDraft {
  id: string;
  organization_id: string;
  lead_id: string | null;
  guest_id: string | null;
  channel: CommunicationChannel;
  contact_address: string | null;
  inbound_message: string;
  draft_reply: string;
  suggested_quotation: SuggestedQuotation | null;
  needs_more_info: string[];
  confidence: string | null;
  tool_log: Json;
  model_used: string;
  status: AiDraftStatus;
  quotation_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  sent_at: string | null;
  created_at: string;
}

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      organizations: Table<Organization>;
      properties: Table<Property>;
      roles: Table<Role>;
      permissions: Table<Permission>;
      profiles: Table<Profile>;
      user_property_access: Table<UserPropertyAccess>;
      agents: Table<Agent>;
      guests: Table<Guest>;
      dive_profiles: Table<DiveProfile>;
      room_types: Table<RoomType>;
      rooms: Table<Room>;
      rate_plans: Table<RatePlan>;
      reservations: Table<Reservation>;
      leads: Table<Lead>;
      quotations: Table<Quotation>;
      communications: Table<Communication>;
      app_connections: Table<AppConnection>;
      events: Table<PixelEvent>;
      sync_logs: Table<SyncLog>;
      audit_logs: Table<AuditLog>;
      notifications: Table<Notification>;
      files: Table<FileRecord>;
      availability_daily: Table<AvailabilityDaily>;
      dive_bookings: Table<DiveBooking>;
      pos_transactions: Table<PosTransaction>;
      reviews: Table<Review>;
      ai_drafts: Table<AiDraft>;
    };
    Views: {};
    Functions: {
      recalculate_availability: {
        Args: { p_property_id: string; p_room_type_id: string; p_start: string; p_end: string };
        Returns: void;
      };
      next_reference: {
        Args: { p_prefix: string };
        Returns: string;
      };
    };
  };
}
