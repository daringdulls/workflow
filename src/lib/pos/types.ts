export type StaffRole =
  | "admin"
  | "owner"
  | "manager"
  | "supervisor"
  | "cashier"
  | "waiter"
  | "kitchen"
  | "bar"
  | "inventory"
  | "accountant";

export const STAFF_ROLES: StaffRole[] = [
  "admin",
  "owner",
  "manager",
  "supervisor",
  "cashier",
  "waiter",
  "kitchen",
  "bar",
  "inventory",
  "accountant",
];

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Administrator",
  owner: "Owner",
  manager: "Restaurant Manager",
  supervisor: "Supervisor",
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen: "Kitchen Staff",
  bar: "Bar Staff",
  inventory: "Inventory Staff",
  accountant: "Accountant",
};

// Coarse, per-area capability grants. ADMIN/OWNER/MANAGER get everything
// relevant to running the floor; other roles are scoped to their job.
export interface RolePermissions {
  pos: boolean; // take orders, POS screen
  tables: boolean;
  kitchen: boolean;
  menu: boolean; // manage menu/modifiers
  customers: boolean;
  reservations: boolean;
  inventory: boolean;
  purchasing: boolean;
  expenses: boolean;
  shifts: boolean;
  reports: boolean;
  staff: boolean;
  settings: boolean;
  discounts: boolean; // apply discounts beyond the auto-approve limit
  voidsRefunds: boolean; // approve voids/refunds/comps
}

export const ROLE_PERMISSIONS: Record<StaffRole, RolePermissions> = {
  admin: allTrue(),
  owner: allTrue(),
  manager: allTrue(),
  supervisor: {
    ...allTrue(),
    staff: false,
    settings: false,
  },
  cashier: {
    pos: true,
    tables: true,
    kitchen: false,
    menu: false,
    customers: true,
    reservations: true,
    inventory: false,
    purchasing: false,
    expenses: false,
    shifts: true,
    reports: false,
    staff: false,
    settings: false,
    discounts: false,
    voidsRefunds: false,
  },
  waiter: {
    pos: true,
    tables: true,
    kitchen: false,
    menu: false,
    customers: true,
    reservations: true,
    inventory: false,
    purchasing: false,
    expenses: false,
    shifts: false,
    reports: false,
    staff: false,
    settings: false,
    discounts: false,
    voidsRefunds: false,
  },
  kitchen: {
    pos: false,
    tables: false,
    kitchen: true,
    menu: false,
    customers: false,
    reservations: false,
    inventory: false,
    purchasing: false,
    expenses: false,
    shifts: false,
    reports: false,
    staff: false,
    settings: false,
    discounts: false,
    voidsRefunds: false,
  },
  bar: {
    pos: false,
    tables: false,
    kitchen: true,
    menu: false,
    customers: false,
    reservations: false,
    inventory: false,
    purchasing: false,
    expenses: false,
    shifts: false,
    reports: false,
    staff: false,
    settings: false,
    discounts: false,
    voidsRefunds: false,
  },
  inventory: {
    pos: false,
    tables: false,
    kitchen: false,
    menu: false,
    customers: false,
    reservations: false,
    inventory: true,
    purchasing: true,
    expenses: false,
    shifts: false,
    reports: false,
    staff: false,
    settings: false,
    discounts: false,
    voidsRefunds: false,
  },
  accountant: {
    pos: false,
    tables: false,
    kitchen: false,
    menu: false,
    customers: false,
    reservations: false,
    inventory: true,
    purchasing: true,
    expenses: true,
    shifts: false,
    reports: true,
    staff: false,
    settings: false,
    discounts: false,
    voidsRefunds: false,
  },
};

function allTrue(): RolePermissions {
  return {
    pos: true,
    tables: true,
    kitchen: true,
    menu: true,
    customers: true,
    reservations: true,
    inventory: true,
    purchasing: true,
    expenses: true,
    shifts: true,
    reports: true,
    staff: true,
    settings: true,
    discounts: true,
    voidsRefunds: true,
  };
}

export const ORDER_TYPES = [
  "dine_in",
  "takeaway",
  "delivery",
  "room_service",
  "staff_meal",
  "complimentary",
] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
  room_service: "Room Service",
  staff_meal: "Staff Meal",
  complimentary: "Complimentary",
};

export const ORDER_STATUSES = [
  "open",
  "held",
  "sent_to_kitchen",
  "ready",
  "served",
  "billed",
  "paid",
  "void",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ITEM_STATUSES = ["new", "accepted", "preparing", "ready", "served", "cancelled"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const TABLE_STATUSES = ["available", "occupied", "reserved", "waiting_bill", "cleaning", "blocked"] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  waiting_bill: "Waiting for Bill",
  cleaning: "Cleaning",
  blocked: "Blocked",
};

export const TABLE_STATUS_COLOR: Record<TableStatus, string> = {
  available: "bg-emerald-100 border-emerald-300 text-emerald-700",
  occupied: "bg-rose-100 border-rose-300 text-rose-700",
  reserved: "bg-amber-100 border-amber-300 text-amber-700",
  waiting_bill: "bg-violet-100 border-violet-300 text-violet-700",
  cleaning: "bg-sky-100 border-sky-300 text-sky-700",
  blocked: "bg-slate-200 border-slate-300 text-slate-500",
};

export const PAYMENT_METHODS = [
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "mobile_payment",
  "online_payment",
  "room_charge",
  "company_credit",
  "voucher",
  "complimentary",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  bank_transfer: "Bank Transfer",
  mobile_payment: "Mobile Payment",
  online_payment: "Online Payment",
  room_charge: "Room Charge",
  company_credit: "Company Credit",
  voucher: "Voucher",
  complimentary: "Complimentary",
};

export const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "arrived",
  "seated",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  "Food Purchases",
  "Utilities",
  "Transport",
  "Repairs",
  "Staff Expenses",
  "Cleaning",
  "Marketing",
  "Equipment",
  "Miscellaneous",
];

export const STOCK_MOVEMENT_TYPES = ["purchase", "issue", "waste", "adjustment", "sale", "transfer"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const WASTAGE_REASONS = ["Expired", "Spoiled", "Preparation waste", "Damaged", "Staff error", "Complimentary use", "Other"];

export const KITCHEN_STATIONS = [
  "Main Kitchen",
  "Hot Kitchen",
  "Cold Kitchen",
  "Bar",
  "Coffee Station",
  "Dessert Station",
  "Pizza Station",
];

export interface PosStaff {
  id: number;
  outlet_id: number;
  name: string;
  role: StaffRole;
  phone: string | null;
  email: string | null;
  department: string | null;
  active: boolean;
  created_at: string;
}

export interface PosOutlet {
  id: number;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  tax_percent: number;
  service_charge_percent: number;
  discount_auth_limit: number;
  timezone: string;
  receipt_footer: string | null;
  order_number_prefix: string;
}

export interface DiningArea {
  id: number;
  outlet_id: number;
  name: string;
  sort_order: number;
}

export interface PosTable {
  id: number;
  outlet_id: number;
  area_id: number | null;
  name: string;
  capacity: number;
  pos_x: number;
  pos_y: number;
  status: TableStatus;
  qr_code: string | null;
}

export interface PosCategory {
  id: number;
  outlet_id: number;
  name: string;
  sort_order: number;
}

export interface ModifierOption {
  id: number;
  group_id: number;
  name: string;
  price_delta: number;
  sort_order: number;
}

export interface ModifierGroup {
  id: number;
  outlet_id: number;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  options: ModifierOption[];
}

export interface MenuItem {
  id: number;
  outlet_id: number;
  category_id: number | null;
  category_name?: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  sku: string | null;
  price: number;
  takeaway_price: number | null;
  delivery_price: number | null;
  cost_price: number;
  tax_percent: number | null;
  station: string;
  prep_time_minutes: number;
  is_available: boolean;
  is_favorite: boolean;
  sort_order: number;
  modifier_group_ids?: number[];
}

export interface Ingredient {
  id: number;
  outlet_id: number;
  name: string;
  unit: string;
  stock_qty: number;
  reorder_level: number;
  cost_per_unit: number;
  supplier_id: number | null;
  expiry_date: string | null;
  batch_number: string | null;
}

export interface RecipeItem {
  id: number;
  menu_item_id: number;
  ingredient_id: number;
  ingredient_name?: string;
  unit?: string;
  quantity: number;
}

export interface PosCustomer {
  id: number;
  outlet_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  address: string | null;
  nationality: string | null;
  notes: string | null;
  dietary_preferences: string | null;
  allergies: string | null;
  loyalty_points: number;
  credit_balance: number;
  created_at: string;
}

export interface Reservation {
  id: number;
  outlet_id: number;
  customer_id: number | null;
  customer_name: string;
  contact: string | null;
  reservation_date: string;
  reservation_time: string;
  guests: number;
  table_id: number | null;
  area_id: number | null;
  special_requests: string | null;
  occasion: string | null;
  deposit: number;
  source: string;
  status: ReservationStatus;
  created_at: string;
}

export interface OrderItemModifier {
  group: string;
  option: string;
  price_delta: number;
}

export interface PosOrderItem {
  id: number;
  order_id: number;
  menu_item_id: number | null;
  name_snapshot: string;
  quantity: number;
  unit_price: number;
  modifiers: OrderItemModifier[];
  notes: string | null;
  kitchen_notes: string | null;
  station: string;
  status: ItemStatus;
  is_complimentary: boolean;
  is_void: boolean;
  void_reason: string | null;
  sent_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  created_at: string;
}

export interface PosOrder {
  id: number;
  outlet_id: number;
  order_number: string;
  order_type: OrderType;
  table_id: number | null;
  table_name?: string | null;
  customer_id: number | null;
  customer_name?: string | null;
  waiter_id: number | null;
  waiter_name?: string | null;
  cashier_id: number | null;
  guest_count: number;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  discount_reason: string | null;
  service_charge_amount: number;
  tax_amount: number;
  tip_amount: number;
  total_amount: number;
  paid_amount: number;
  is_complimentary: boolean;
  notes: string | null;
  room_number: string | null;
  guest_name: string | null;
  hotel_name: string | null;
  source: string;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_driver: string | null;
  delivery_fee: number;
  pickup_time: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  items?: PosOrderItem[];
}

export interface PosPayment {
  id: number;
  order_id: number;
  method: PaymentMethod;
  amount: number;
  amount_received: number | null;
  reference: string | null;
  room_number: string | null;
  guest_name: string | null;
  received_by: number | null;
  is_refund: boolean;
  refund_reason: string | null;
  created_at: string;
}

export interface Supplier {
  id: number;
  outlet_id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  products_supplied: string | null;
  payment_terms: string | null;
  balance: number;
}

export interface PurchaseOrder {
  id: number;
  outlet_id: number;
  supplier_id: number | null;
  supplier_name?: string | null;
  status: string;
  order_date: string;
  expected_date: string | null;
  invoice_number: string | null;
  total_amount: number;
  tax_amount: number;
  payment_status: string;
  due_date: string | null;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  ingredient_id: number | null;
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
  received: boolean;
}

export interface Expense {
  id: number;
  outlet_id: number;
  category: string;
  amount: number;
  payment_method: string;
  supplier_id: number | null;
  description: string | null;
  receipt_url: string | null;
  entered_by: number | null;
  approved_by: number | null;
  expense_date: string;
  created_at: string;
}

export interface Shift {
  id: number;
  outlet_id: number;
  staff_id: number;
  staff_name?: string;
  terminal: string;
  opening_cash: number;
  closing_cash_expected: number | null;
  closing_cash_actual: number | null;
  cash_difference: number | null;
  status: "open" | "closed";
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface AuditLogEntry {
  id: number;
  outlet_id: number;
  staff_id: number | null;
  staff_name?: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  created_at: string;
}

export function formatOrderNumber(prefix: string, id: number) {
  return `${prefix}-${String(id).padStart(5, "0")}`;
}

export function money(n: number | string | null | undefined): number {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
