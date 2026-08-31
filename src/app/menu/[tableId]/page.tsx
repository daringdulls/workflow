"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ModOption {
  id: number;
  group_id: number;
  name: string;
  price_delta: number;
}
interface ModGroup {
  id: number;
  name: string;
  min_select: number;
  max_select: number;
  required: boolean;
  options: ModOption[];
}
interface MenuItem {
  id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  modifier_group_ids: number[];
}
interface MenuData {
  outlet: { name: string; logo_url: string | null; currency: string };
  table: { id: number; name: string } | null;
  categories: { id: number; name: string }[];
  items: MenuItem[];
  modifierGroups: ModGroup[];
}
interface CartLine {
  item: MenuItem;
  modifiers: { group: string; option: string; price_delta: number }[];
  quantity: number;
  notes: string;
}

export default function GuestMenuPage() {
  const params = useParams<{ tableId: string }>();
  const [data, setData] = useState<MenuData | null>(null);
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pickerItem, setPickerItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [billRequested, setBillRequested] = useState(false);

  useEffect(() => {
    fetch(`/api/public/pos/menu?table=${params.tableId}`)
      .then((r) => r.json())
      .then(setData);
  }, [params.tableId]);

  if (!data) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading menu…</div>;

  const groupById = Object.fromEntries(data.modifierGroups.map((g) => [g.id, g]));
  const filteredItems = activeCat === "all" ? data.items : data.items.filter((i) => i.category_id === activeCat);
  const cartTotal = cart.reduce((s, l) => s + (Number(l.item.price) + l.modifiers.reduce((m, x) => m + x.price_delta, 0)) * l.quantity, 0);

  function addToCart(item: MenuItem, modifiers: CartLine["modifiers"], quantity: number, notes: string) {
    setCart((prev) => [...prev, { item, modifiers, quantity, notes }]);
  }

  async function submitOrder() {
    await fetch("/api/public/pos/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table_id: Number(params.tableId),
        items: cart.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity, modifiers: l.modifiers, notes: l.notes || null })),
      }),
    });
    setCart([]);
    setCartOpen(false);
    setSubmitted(true);
  }

  async function requestBill() {
    await fetch("/api/public/pos/request-bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: Number(params.tableId) }),
    });
    setBillRequested(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {data.outlet.logo_url && <img src={data.outlet.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
          <div>
            <p className="font-semibold text-slate-800">{data.outlet.name}</p>
            <p className="text-xs text-slate-400">{data.table ? `Table ${data.table.name}` : "Digital Menu"}</p>
          </div>
          {data.table && (
            <button onClick={requestBill} disabled={billRequested} className="ml-auto text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 disabled:opacity-50">
              {billRequested ? "Bill requested" : "Request Bill"}
            </button>
          )}
        </div>
      </div>

      {submitted && (
        <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center justify-between">
          Order sent! Your server will confirm it shortly.
          <button onClick={() => setSubmitted(false)} className="text-emerald-500">
            ×
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        <button onClick={() => setActiveCat("all")} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${activeCat === "all" ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          All
        </button>
        {data.categories.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-sm ${activeCat === c.id ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredItems.map((item) => (
          <button key={item.id} onClick={() => setPickerItem(item)} className="text-left bg-white border border-slate-200 rounded-xl p-3.5 flex gap-3 hover:shadow-md transition">
            {item.image_url && <img src={item.image_url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />}
            <div className="min-w-0">
              <p className="font-medium text-sm text-slate-800">{item.name}</p>
              {item.description && <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>}
              <p className="text-sm font-semibold text-orange-600 mt-1">{Number(item.price).toFixed(2)}</p>
            </div>
          </button>
        ))}
      </div>

      {cart.length > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-4 left-4 right-4 bg-orange-500 text-white rounded-2xl py-3.5 font-medium shadow-lg">
          View Cart · {cart.reduce((s, l) => s + l.quantity, 0)} items · {cartTotal.toFixed(2)}
        </button>
      )}

      {pickerItem && (
        <GuestModifierModal item={pickerItem} groups={pickerItem.modifier_group_ids.map((id) => groupById[id]).filter(Boolean)} onClose={() => setPickerItem(null)} onAdd={addToCart} />
      )}

      {cartOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={() => setCartOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5">
            <h2 className="font-semibold text-lg text-slate-800 mb-3">Your Order</h2>
            <div className="space-y-2 mb-4">
              {cart.map((l, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-slate-700">{l.quantity}× {l.item.name}</p>
                    {l.modifiers.length > 0 && <p className="text-xs text-slate-400">{l.modifiers.map((m) => m.option).join(", ")}</p>}
                  </div>
                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold text-slate-800 mb-4">
              <span>Total</span>
              <span>{cartTotal.toFixed(2)}</span>
            </div>
            <button onClick={submitOrder} className="w-full text-sm px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium">
              Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GuestModifierModal({
  item,
  groups,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  groups: ModGroup[];
  onClose: () => void;
  onAdd: (item: MenuItem, modifiers: CartLine["modifiers"], quantity: number, notes: string) => void;
}) {
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  function toggle(g: ModGroup, optId: number) {
    setSelected((prev) => {
      const current = prev[g.id] ?? [];
      if (current.includes(optId)) return { ...prev, [g.id]: current.filter((id) => id !== optId) };
      const next = g.max_select === 1 ? [optId] : [...current, optId].slice(0, g.max_select);
      return { ...prev, [g.id]: next };
    });
  }

  function confirm() {
    const modifiers: CartLine["modifiers"] = [];
    for (const g of groups) {
      for (const optId of selected[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) modifiers.push({ group: g.name, option: opt.name, price_delta: Number(opt.price_delta) });
      }
    }
    onAdd(item, modifiers, qty, notes);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5">
        <h2 className="font-semibold text-lg text-slate-800">{item.name}</h2>
        <p className="text-sm text-slate-400 mb-4">{Number(item.price).toFixed(2)}</p>
        {groups.map((g) => (
          <div key={g.id} className="mb-4">
            <p className="text-sm font-medium text-slate-700 mb-1.5">
              {g.name} {g.required && <span className="text-red-500 text-xs">*required</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.options.map((o) => (
                <button
                  key={o.id}
                  onClick={() => toggle(g, o.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${(selected[g.id] ?? []).includes(o.id) ? "bg-orange-500 border-orange-500 text-white" : "border-slate-200 text-slate-600"}`}
                >
                  {o.name} {Number(o.price_delta) !== 0 && `(+${o.price_delta})`}
                </button>
              ))}
            </div>
          </div>
        ))}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes? (e.g. no onion)" rows={2} className="w-full text-sm rounded-lg border border-slate-200 px-3 py-2 mb-4" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-8 w-8 rounded-lg bg-slate-100">
              −
            </button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="h-8 w-8 rounded-lg bg-slate-100">
              +
            </button>
          </div>
          <button onClick={confirm} className="text-sm px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}
