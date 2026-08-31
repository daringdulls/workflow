"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MenuItem,
  ModifierGroup,
  OrderItemModifier,
  ORDER_TYPES,
  ORDER_TYPE_LABEL,
  OrderType,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  PaymentMethod,
  PosOrder,
  PosOrderItem,
  PosCategory,
  PosCustomer,
  PosStaff,
  PosTable,
  ROLE_PERMISSIONS,
  money,
} from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

export default function OrderPageWrapper() {
  return (
    <Suspense fallback={null}>
      <OrderPage />
    </Suspense>
  );
}

function OrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("order");
  const tableParam = searchParams.get("table");

  const [order, setOrder] = useState<PosOrder | null>(null);
  const [openOrders, setOpenOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const loadOpenOrders = useCallback(async () => {
    const rows = await api<PosOrder[]>("/api/pos/orders?open=1");
    setOpenOrders(rows);
  }, []);

  useEffect(() => {
    loadOpenOrders();
  }, [loadOpenOrders]);

  const loadOrder = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const o = await api<PosOrder>(`/api/pos/orders/${id}`);
      setOrder(o);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (orderIdParam) {
        await loadOrder(orderIdParam);
        return;
      }
      if (tableParam) {
        setStarting(true);
        try {
          const existing = await api<PosOrder[]>(`/api/pos/orders?table_id=${tableParam}&open=1`);
          if (existing.length > 0) {
            router.replace(`/pos/order?order=${existing[0].id}`);
          } else {
            const created = await api<PosOrder>("/api/pos/orders", {
              method: "POST",
              body: JSON.stringify({ order_type: "dine_in", table_id: Number(tableParam), guest_count: 2 }),
            });
            router.replace(`/pos/order?order=${created.id}`);
          }
        } finally {
          setStarting(false);
        }
        return;
      }
      setOrder(null);
      setLoading(false);
    })();
  }, [orderIdParam, tableParam, loadOrder, router]);

  if (loading || starting) {
    return <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>;
  }

  if (!order) {
    return (
      <OrderListView
        openOrders={openOrders}
        onOpen={(id) => router.push(`/pos/order?order=${id}`)}
        onCreated={(id) => router.push(`/pos/order?order=${id}`)}
      />
    );
  }

  return (
    <OrderEditor
      order={order}
      onRefresh={async () => {
        await loadOrder(String(order.id));
        loadOpenOrders();
      }}
      onClosed={() => {
        loadOpenOrders();
        router.push("/pos/order");
      }}
      onExit={() => router.push("/pos/order")}
    />
  );
}

function OrderListView({
  openOrders,
  onOpen,
  onCreated,
}: {
  openOrders: PosOrder[];
  onOpen: (id: number) => void;
  onCreated: (id: number) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("takeaway");
  const [guestCount, setGuestCount] = useState(1);

  async function create() {
    const created = await api<PosOrder>("/api/pos/orders", { method: "POST", body: JSON.stringify({ order_type: orderType, guest_count: guestCount }) });
    onCreated(created.id);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Open Orders</h1>
        <button onClick={() => setCreating(true)} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
          + New Order
        </button>
      </div>

      {creating && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-5">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Start a new order — for dine-in, pick a table from the Tables page instead.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {ORDER_TYPES.filter((t) => t !== "dine_in").map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`px-3 py-1.5 rounded-full text-sm ${orderType === t ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
              >
                {ORDER_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-500">Guests</label>
            <input type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)} className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm" />
            <button onClick={create} className="ml-auto text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
              Start
            </button>
            <button onClick={() => setCreating(false)} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {openOrders.map((o) => (
          <button
            key={o.id}
            onClick={() => onOpen(o.id)}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <p className="font-medium text-slate-800 dark:text-slate-100">{o.order_number}</p>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{o.status.replace(/_/g, " ")}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {ORDER_TYPE_LABEL[o.order_type]} {o.table_name && `· Table ${o.table_name}`}
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-100 mt-2">{money(o.total_amount).toFixed(2)}</p>
          </button>
        ))}
        {openOrders.length === 0 && !creating && <p className="text-sm text-slate-400 col-span-full py-10 text-center">No open orders. Start one above, or pick a table.</p>}
      </div>
    </div>
  );
}

function OrderEditor({ order, onRefresh, onClosed, onExit }: { order: PosOrder; onRefresh: () => Promise<void>; onClosed: () => void; onExit: () => void }) {
  const router = useRouter();
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [staff, setStaff] = useState<PosStaff[]>([]);
  const [tables, setTables] = useState<PosTable[]>([]);
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [pickerItem, setPickerItem] = useState<MenuItem | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ permission: "voidsRefunds" | "discounts"; onConfirm: (staffId: number, pin: string) => void } | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<PosCustomer[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api<PosCategory[]>("/api/pos/categories"),
      api<MenuItem[]>("/api/pos/items"),
      api<ModifierGroup[]>("/api/pos/modifier-groups"),
      api<PosStaff[]>("/api/pos/staff"),
      api<PosTable[]>("/api/pos/tables"),
    ]).then(([c, i, g, s, t]) => {
      setCategories(c);
      setItems(i.filter((x) => x.is_available));
      setGroups(g);
      setStaff(s.filter((x) => x.active));
      setTables(t);
    });
  }, []);

  useEffect(() => {
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const handle = setTimeout(() => {
      api<PosCustomer[]>(`/api/pos/customers?q=${encodeURIComponent(customerQuery)}`).then(setCustomerResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [customerQuery]);

  const groupById = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g])), [groups]);

  const filteredItems = items.filter((i) => {
    if (activeCat !== "all" && i.category_id !== activeCat) return false;
    if (search.trim() && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeItems = (order.items ?? []).filter((i) => !i.is_void);
  const hasUnsent = activeItems.some((i) => !i.sent_at);
  const canManagerAuth = staff.filter((s) => ROLE_PERMISSIONS[s.role]?.voidsRefunds || ROLE_PERMISSIONS[s.role]?.discounts);

  async function addToCart(item: MenuItem, modifiers: OrderItemModifier[], quantity: number, notes: string) {
    await api(`/api/pos/orders/${order.id}/items`, {
      method: "POST",
      body: JSON.stringify({ menu_item_id: item.id, quantity, modifiers, notes: notes || null }),
    });
    onRefresh();
  }

  function openItem(item: MenuItem) {
    if ((item.modifier_group_ids ?? []).length > 0) {
      setPickerItem(item);
    } else {
      addToCart(item, [], 1, "");
    }
  }

  async function updateLine(line: PosOrderItem, patch: Record<string, unknown>) {
    await api(`/api/pos/orders/${order.id}/items/${line.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    onRefresh();
  }

  async function removeLine(line: PosOrderItem) {
    if (line.sent_at) {
      setAuthModal({
        permission: "voidsRefunds",
        onConfirm: async (staffId, pin) => {
          const reason = prompt("Reason for void?") ?? "";
          await updateLine(line, { is_void: true, void_reason: reason, authorized_by: staffId, authorization_pin: pin });
          setAuthModal(null);
        },
      });
    } else {
      await api(`/api/pos/orders/${order.id}/items/${line.id}`, { method: "DELETE" });
      onRefresh();
    }
  }

  async function sendToKitchen() {
    setBusy(true);
    try {
      await api(`/api/pos/orders/${order.id}/send`, { method: "POST" });
      await onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleHold() {
    await api(`/api/pos/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ status: order.status === "held" ? "open" : "held" }) });
    onRefresh();
  }

  async function voidOrder() {
    setAuthModal({
      permission: "voidsRefunds",
      onConfirm: async (staffId, pin) => {
        const reason = prompt("Reason for voiding this whole order?") ?? "";
        await api(`/api/pos/orders/${order.id}/void`, { method: "POST", body: JSON.stringify({ authorized_by: staffId, authorization_pin: pin, reason }) });
        setAuthModal(null);
        onClosed();
      },
    });
  }

  async function assignField(field: string, value: unknown) {
    await api(`/api/pos/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
    onRefresh();
  }

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="flex-1 min-w-0 p-4 lg:p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onExit} className="text-sm text-slate-400 hover:text-slate-600">
            ← All orders
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu…"
            className="w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => setActiveCat("all")} className={`px-3 py-1.5 rounded-full text-sm ${activeCat === "all" ? "bg-orange-500 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm ${activeCat === c.id ? "bg-orange-500 text-white" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => openItem(item)}
              className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:border-orange-400 hover:shadow-md transition active:scale-[0.98]"
            >
              <p className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">
                {item.is_favorite && "⭐ "}
                {item.name}
              </p>
              <p className="text-sm font-semibold text-orange-600 mt-1.5">{money(item.price).toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[380px] shrink-0 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col max-h-screen lg:sticky lg:top-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{order.order_number}</p>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{order.status.replace(/_/g, " ")}</span>
          </div>
          <select
            value={order.order_type}
            onChange={(e) => assignField("order_type", e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 mb-2"
          >
            {ORDER_TYPES.map((t) => (
              <option key={t} value={t}>
                {ORDER_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select value={order.table_id ?? ""} onChange={(e) => assignField("table_id", e.target.value ? Number(e.target.value) : null)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5">
              <option value="">No table</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.name}
                </option>
              ))}
            </select>
            <select value={order.waiter_id ?? ""} onChange={(e) => assignField("waiter_id", e.target.value ? Number(e.target.value) : null)} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5">
              <option value="">No waiter</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-slate-400">Guests</label>
            <input type="number" min={1} value={order.guest_count} onChange={(e) => assignField("guest_count", parseInt(e.target.value) || 1)} className="w-16 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1" />
          </div>
          <div className="relative">
            <input
              value={order.customer_name ?? customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                if (order.customer_id) assignField("customer_id", null);
              }}
              placeholder="Search customer by name/phone…"
              className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
            />
            {customerResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      assignField("customer_id", c.id);
                      setCustomerQuery("");
                      setCustomerResults([]);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {c.name} {c.phone && `· ${c.phone}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeItems.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Cart is empty — tap a menu item.</p>}
          {activeItems.map((line) => (
            <CartLine key={line.id} line={line} onUpdate={updateLine} onRemove={removeLine} locked={!!line.sent_at} />
          ))}
        </div>

        <OrderTotals order={order} />

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
          <button onClick={toggleHold} className="text-sm px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            {order.status === "held" ? "Resume" : "Hold"}
          </button>
          <button disabled={!hasUnsent || busy} onClick={sendToKitchen} className="text-sm px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium disabled:opacity-40">
            Send to Kitchen
          </button>
          <button onClick={() => setDiscountOpen(true)} className="text-sm px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            Discount
          </button>
          <button onClick={voidOrder} className="text-sm px-3 py-2.5 rounded-lg border border-red-200 dark:border-red-900 text-red-500">
            Void Order
          </button>
          <button
            disabled={activeItems.length === 0}
            onClick={() => setPayOpen(true)}
            className="col-span-2 text-sm px-3 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold disabled:opacity-40"
          >
            Pay {money(order.total_amount).toFixed(2)}
          </button>
        </div>
      </div>

      {pickerItem && (
        <ModifierPickerModal
          item={pickerItem}
          groups={pickerItem.modifier_group_ids?.map((id) => groupById[id]).filter(Boolean) ?? []}
          onClose={() => setPickerItem(null)}
          onConfirm={(modifiers, qty, notes) => {
            addToCart(pickerItem, modifiers, qty, notes);
            setPickerItem(null);
          }}
        />
      )}

      {discountOpen && (
        <DiscountModal
          onClose={() => setDiscountOpen(false)}
          onApply={async (type, value, reason) => {
            try {
              await api(`/api/pos/orders/${order.id}/discount`, { method: "POST", body: JSON.stringify({ type, value, reason }) });
              setDiscountOpen(false);
              onRefresh();
            } catch {
              setDiscountOpen(false);
              setAuthModal({
                permission: "discounts",
                onConfirm: async (staffId, pin) => {
                  await api(`/api/pos/orders/${order.id}/discount`, { method: "POST", body: JSON.stringify({ type, value, reason, authorized_by: staffId, authorization_pin: pin }) });
                  setAuthModal(null);
                  onRefresh();
                },
              });
            }
          }}
        />
      )}

      {authModal && (
        <ManagerAuthModal
          staffOptions={canManagerAuth}
          onClose={() => setAuthModal(null)}
          onConfirm={authModal.onConfirm}
        />
      )}

      {payOpen && (
        <PayModal
          order={order}
          onClose={() => setPayOpen(false)}
          onPaid={(updated) => {
            setPayOpen(false);
            if (updated.status === "paid") {
              router.push(`/pos/receipt/${order.id}`);
            } else {
              onRefresh();
            }
          }}
        />
      )}
    </div>
  );
}

function CartLine({
  line,
  onUpdate,
  onRemove,
  locked,
}: {
  line: PosOrderItem;
  onUpdate: (line: PosOrderItem, patch: Record<string, unknown>) => void;
  onRemove: (line: PosOrderItem) => void;
  locked: boolean;
}) {
  const modTotal = (line.modifiers ?? []).reduce((s, m) => s + Number(m.price_delta ?? 0), 0);
  const lineTotal = line.is_complimentary ? 0 : money((Number(line.unit_price) + modTotal) * Number(line.quantity));
  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{line.name_snapshot}</p>
          {(line.modifiers ?? []).length > 0 && (
            <p className="text-[11px] text-slate-400">{line.modifiers.map((m) => m.option).join(", ")}</p>
          )}
          {line.notes && <p className="text-[11px] text-slate-400 italic">“{line.notes}”</p>}
          <p className="text-[11px] font-medium mt-0.5">
            <span className={`px-1.5 py-0.5 rounded-full ${statusColor(line.status)}`}>{line.status}</span>
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 shrink-0">{lineTotal.toFixed(2)}</p>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <button disabled={locked} onClick={() => onUpdate(line, { quantity: Math.max(1, Number(line.quantity) - 1) })} className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 text-sm disabled:opacity-30">
            −
          </button>
          <span className="text-sm w-6 text-center">{line.quantity}</span>
          <button disabled={locked} onClick={() => onUpdate(line, { quantity: Number(line.quantity) + 1 })} className="h-6 w-6 rounded bg-slate-100 dark:bg-slate-800 text-sm disabled:opacity-30">
            +
          </button>
        </div>
        <button onClick={() => onRemove(line)} className="text-xs text-red-500 hover:underline">
          {locked ? "Void" : "Remove"}
        </button>
      </div>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "ready":
      return "bg-emerald-100 text-emerald-700";
    case "preparing":
    case "accepted":
      return "bg-amber-100 text-amber-700";
    case "served":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-sky-100 text-sky-700";
  }
}

function OrderTotals({ order }: { order: PosOrder }) {
  return (
    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-sm">
      <Row label="Subtotal" value={order.subtotal} />
      {Number(order.discount_amount) > 0 && <Row label="Discount" value={-order.discount_amount} tone="text-emerald-600" />}
      {Number(order.service_charge_amount) > 0 && <Row label="Service charge" value={order.service_charge_amount} />}
      {Number(order.tax_amount) > 0 && <Row label="Tax" value={order.tax_amount} />}
      {Number(order.tip_amount) > 0 && <Row label="Tip" value={order.tip_amount} />}
      <div className="flex justify-between font-semibold text-base pt-1 text-slate-800 dark:text-slate-100">
        <span>Total</span>
        <span>{money(order.total_amount).toFixed(2)}</span>
      </div>
      {Number(order.paid_amount) > 0 && <Row label="Paid" value={order.paid_amount} tone="text-emerald-600" />}
    </div>
  );
}
function Row({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className={`flex justify-between ${tone ?? "text-slate-500"}`}>
      <span>{label}</span>
      <span>{money(value).toFixed(2)}</span>
    </div>
  );
}

function ModifierPickerModal({
  item,
  groups,
  onClose,
  onConfirm,
}: {
  item: MenuItem;
  groups: ModifierGroup[];
  onClose: () => void;
  onConfirm: (modifiers: OrderItemModifier[], qty: number, notes: string) => void;
}) {
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  function toggle(group: ModifierGroup, optionId: number) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (current.includes(optionId)) return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      const next = group.max_select === 1 ? [optionId] : [...current, optionId].slice(0, group.max_select);
      return { ...prev, [group.id]: next };
    });
  }

  function confirm() {
    const modifiers: OrderItemModifier[] = [];
    for (const g of groups) {
      for (const optId of selected[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) modifiers.push({ group: g.name, option: opt.name, price_delta: Number(opt.price_delta) });
      }
    }
    onConfirm(modifiers, qty, notes);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-1">{item.name}</h2>
        <p className="text-sm text-slate-400 mb-4">{money(item.price).toFixed(2)}</p>
        {groups.map((g) => (
          <div key={g.id} className="mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              {g.name} {g.required && <span className="text-red-500 text-xs">*required</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => toggle(g, o.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${(selected[g.id] ?? []).includes(o.id) ? "bg-orange-500 border-orange-500 text-white" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                >
                  {o.name} {Number(o.price_delta) !== 0 && `(+${o.price_delta})`}
                </button>
              ))}
            </div>
          </div>
        ))}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Item / kitchen notes (e.g. no onion)" rows={2} className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mb-4" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800">
              −
            </button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800">
              +
            </button>
          </div>
          <button onClick={confirm} className="text-sm px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            Add to order
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscountModal({ onClose, onApply }: { onClose: () => void; onApply: (type: "percent" | "fixed", value: number, reason: string) => void }) {
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState(10);
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">Apply Discount</h2>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setType("percent")} className={`flex-1 text-sm px-3 py-2 rounded-lg border ${type === "percent" ? "bg-orange-500 border-orange-500 text-white" : "border-slate-200 dark:border-slate-700"}`}>
            Percentage
          </button>
          <button onClick={() => setType("fixed")} className={`flex-1 text-sm px-3 py-2 rounded-lg border ${type === "fixed" ? "bg-orange-500 border-orange-500 text-white" : "border-slate-200 dark:border-slate-700"}`}>
            Fixed amount
          </button>
        </div>
        <input type="number" value={value} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mb-3" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. loyalty, complaint)" className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mb-4" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            Cancel
          </button>
          <button onClick={() => onApply(type, value, reason)} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function ManagerAuthModal({
  staffOptions,
  onClose,
  onConfirm,
}: {
  staffOptions: PosStaff[];
  onClose: () => void;
  onConfirm: (staffId: number, pin: string) => void;
}) {
  const [staffId, setStaffId] = useState(staffOptions[0]?.id ?? 0);
  const [pin, setPin] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-1">Manager Authorization Required</h2>
        <p className="text-sm text-slate-400 mb-4">This action needs sign-off from a manager or admin.</p>
        <select value={staffId} onChange={(e) => setStaffId(Number(e.target.value))} className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mb-3">
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Manager PIN" className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mb-4" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            Cancel
          </button>
          <button onClick={() => onConfirm(staffId, pin)} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            Authorize
          </button>
        </div>
      </div>
    </div>
  );
}

function PayModal({ order, onClose, onPaid }: { order: PosOrder; onClose: () => void; onPaid: (updated: PosOrder) => void }) {
  const remaining = money(Number(order.total_amount) - Number(order.paid_amount));
  const [splitCount, setSplitCount] = useState(1);
  const [rows, setRows] = useState<{ method: PaymentMethod; amount: number; amount_received?: number }[]>([{ method: "cash", amount: remaining }]);
  const [tip, setTip] = useState(order.tip_amount);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function applySplit(n: number) {
    setSplitCount(n);
    const each = money(remaining / n);
    setRows(Array.from({ length: n }, (_, i) => ({ method: "cash", amount: i === n - 1 ? money(remaining - each * (n - 1)) : each })));
  }

  const totalEntered = money(rows.reduce((s, r) => s + Number(r.amount || 0), 0));

  async function submit() {
    setSaving(true);
    setError("");
    try {
      if (Number(tip) !== Number(order.tip_amount)) {
        await api(`/api/pos/orders/${order.id}`, { method: "PATCH", body: JSON.stringify({ tip_amount: tip }) });
      }
      const updated = await api<PosOrder>(`/api/pos/orders/${order.id}/pay`, { method: "POST", body: JSON.stringify({ payments: rows }) });
      onPaid(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-1">Take Payment</h2>
        <p className="text-sm text-slate-400 mb-4">Balance due: {remaining.toFixed(2)}</p>

        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-slate-400">Split equally between</label>
          <select value={splitCount} onChange={(e) => applySplit(Number(e.target.value))} className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "payment" : "ways"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 mb-3">
          {rows.map((r, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                value={r.method}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...r, method: e.target.value as PaymentMethod };
                  setRows(next);
                }}
                className="flex-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={r.amount}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...r, amount: parseFloat(e.target.value) || 0 };
                  setRows(next);
                }}
                className="w-24 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
              />
              {rows.length > 1 && (
                <button onClick={() => setRows(rows.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 px-1">
                  ×
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setRows([...rows, { method: "cash", amount: money(remaining - totalEntered) }])} className="text-xs text-orange-600 hover:underline">
            + Add payment method
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs text-slate-400">Tip</label>
          <input type="number" step="0.01" value={tip} onChange={(e) => setTip(parseFloat(e.target.value) || 0)} className="w-24 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5" />
        </div>

        <div className="flex justify-between text-sm mb-4">
          <span className="text-slate-500">Entered</span>
          <span className={totalEntered < remaining - 0.01 ? "text-amber-600" : "text-emerald-600"}>{totalEntered.toFixed(2)} / {remaining.toFixed(2)}</span>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            Cancel
          </button>
          <button disabled={saving || totalEntered <= 0} onClick={submit} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50">
            {totalEntered < remaining - 0.01 ? "Take Partial Payment" : "Complete Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
