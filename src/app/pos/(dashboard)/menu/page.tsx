"use client";

import { useEffect, useState } from "react";
import { KITCHEN_STATIONS, MenuItem, ModifierGroup, PosCategory, RecipeItem, Ingredient } from "@/lib/pos/types";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
  return res.json();
}

export default function MenuPage() {
  const [tab, setTab] = useState<"items" | "modifiers">("items");
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [editingItem, setEditingItem] = useState<MenuItem | "new" | null>(null);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | "new" | null>(null);
  const [newCatName, setNewCatName] = useState("");

  async function loadAll() {
    const [c, i, g, ing] = await Promise.all([
      api<PosCategory[]>("/api/pos/categories"),
      api<MenuItem[]>("/api/pos/items"),
      api<ModifierGroup[]>("/api/pos/modifier-groups"),
      api<Ingredient[]>("/api/pos/ingredients"),
    ]);
    setCategories(c);
    setItems(i);
    setGroups(g);
    setIngredients(ing);
  }
  useEffect(() => {
    loadAll();
  }, []);

  async function addCategory() {
    if (!newCatName.trim()) return;
    const c = await api<PosCategory>("/api/pos/categories", {
      method: "POST",
      body: JSON.stringify({ name: newCatName.trim(), sort_order: categories.length }),
    });
    setCategories((p) => [...p, c]);
    setNewCatName("");
  }
  async function deleteCategory(id: number) {
    if (!confirm("Delete this category? Items in it will become uncategorized.")) return;
    await api(`/api/pos/categories/${id}`, { method: "DELETE" });
    setCategories((p) => p.filter((c) => c.id !== id));
  }

  const filteredItems = activeCat === "all" ? items : items.filter((i) => i.category_id === activeCat);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Menu Management</h1>
        <div className="flex gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
          <button
            onClick={() => setTab("items")}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium ${tab === "items" ? "bg-orange-500 text-white" : "text-slate-500"}`}
          >
            Items & Categories
          </button>
          <button
            onClick={() => setTab("modifiers")}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium ${tab === "modifiers" ? "bg-orange-500 text-white" : "text-slate-500"}`}
          >
            Modifiers & Add-ons
          </button>
        </div>
      </div>

      {tab === "items" && (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 h-fit">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Categories</p>
            <button
              onClick={() => setActiveCat("all")}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm mb-1 ${activeCat === "all" ? "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              All items ({items.length})
            </button>
            {categories.map((c) => (
              <div key={c.id} className="flex items-center group">
                <button
                  onClick={() => setActiveCat(c.id)}
                  className={`flex-1 text-left px-2.5 py-1.5 rounded-lg text-sm mb-1 ${activeCat === c.id ? "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  {c.name} ({items.filter((i) => i.category_id === c.id).length})
                </button>
                <button onClick={() => deleteCategory(c.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 px-1 text-xs">
                  ×
                </button>
              </div>
            ))}
            <div className="flex gap-1 mt-3">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                placeholder="New category"
                className="flex-1 min-w-0 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5"
              />
              <button onClick={addCategory} className="text-xs px-2 py-1.5 rounded-lg bg-slate-800 text-white">
                Add
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setEditingItem("new")}
                className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
              >
                + Add Menu Item
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setEditingItem(item)}
                  className={`text-left bg-white dark:bg-slate-900 rounded-xl border p-3.5 hover:shadow-md transition ${item.is_available ? "border-slate-200 dark:border-slate-800" : "border-red-200 dark:border-red-900 opacity-60"}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-sm text-slate-800 dark:text-slate-100">{item.name}</p>
                    {item.is_favorite && <span title="Favorite">⭐</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{item.category_name ?? "Uncategorized"} · {item.station}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{Number(item.price).toFixed(2)}</p>
                    {!item.is_available && <span className="text-[10px] text-red-500 font-medium">UNAVAILABLE</span>}
                  </div>
                </button>
              ))}
              {filteredItems.length === 0 && <p className="text-sm text-slate-400 col-span-full py-10 text-center">No items yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "modifiers" && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setEditingGroup("new")}
              className="text-sm px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
            >
              + Add Modifier Group
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setEditingGroup(g)}
                className="text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md transition"
              >
                <p className="font-medium text-sm text-slate-800 dark:text-slate-100">
                  {g.name} {g.required && <span className="text-red-500 text-xs">*required</span>}
                </p>
                <p className="text-xs text-slate-400 mb-2">Pick {g.min_select}–{g.max_select}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.options.map((o) => (
                    <span key={o.id} className="text-xs bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5 text-slate-600 dark:text-slate-300">
                      {o.name} {Number(o.price_delta) !== 0 && `(+${o.price_delta})`}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {groups.length === 0 && <p className="text-sm text-slate-400 col-span-full py-10 text-center">No modifier groups yet.</p>}
          </div>
        </div>
      )}

      {editingItem && (
        <ItemModal
          item={editingItem === "new" ? null : editingItem}
          categories={categories}
          groups={groups}
          ingredients={ingredients}
          onClose={() => setEditingItem(null)}
          onSaved={(saved, deleted) => {
            if (deleted) setItems((p) => p.filter((i) => i.id !== saved.id));
            else setItems((p) => (p.some((i) => i.id === saved.id) ? p.map((i) => (i.id === saved.id ? saved : i)) : [...p, saved]));
            setEditingItem(null);
          }}
        />
      )}

      {editingGroup && (
        <GroupModal
          group={editingGroup === "new" ? null : editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={(saved, deleted) => {
            if (deleted) setGroups((p) => p.filter((g) => g.id !== saved.id));
            else setGroups((p) => (p.some((g) => g.id === saved.id) ? p.map((g) => (g.id === saved.id ? saved : g)) : [...p, saved]));
            setEditingGroup(null);
          }}
        />
      )}
    </div>
  );
}

function ItemModal({
  item,
  categories,
  groups,
  ingredients,
  onClose,
  onSaved,
}: {
  item: MenuItem | null;
  categories: PosCategory[];
  groups: ModifierGroup[];
  ingredients: Ingredient[];
  onClose: () => void;
  onSaved: (item: MenuItem, deleted?: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    category_id: (item?.category_id ?? categories[0]?.id ?? null) as number | null,
    description: item?.description ?? "",
    image_url: item?.image_url ?? "",
    sku: item?.sku ?? "",
    price: item?.price ?? 0,
    takeaway_price: item?.takeaway_price ?? "",
    delivery_price: item?.delivery_price ?? "",
    cost_price: item?.cost_price ?? 0,
    tax_percent: item?.tax_percent ?? "",
    station: item?.station ?? KITCHEN_STATIONS[0],
    prep_time_minutes: item?.prep_time_minutes ?? 10,
    is_available: item?.is_available ?? true,
    is_favorite: item?.is_favorite ?? false,
  });
  const [modGroupIds, setModGroupIds] = useState<number[]>(item?.modifier_group_ids ?? []);
  const [tab, setTab] = useState<"details" | "recipe">("details");
  const [recipe, setRecipe] = useState<RecipeItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) api<RecipeItem[]>(`/api/pos/items/${item.id}/recipe`).then(setRecipe);
  }, [item]);

  const margin = form.price > 0 ? (((Number(form.price) - Number(form.cost_price)) / Number(form.price)) * 100).toFixed(1) : "0";

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, category_id: form.category_id || null, modifier_group_ids: modGroupIds };
      const saved = item
        ? await api<MenuItem>(`/api/pos/items/${item.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api<MenuItem>("/api/pos/items", { method: "POST", body: JSON.stringify(payload) });
      onSaved(saved);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveRecipe() {
    if (!item) return;
    await api(`/api/pos/items/${item.id}/recipe`, {
      method: "PUT",
      body: JSON.stringify({ ingredients: recipe.map((r) => ({ ingredient_id: r.ingredient_id, quantity: r.quantity })) }),
    });
    alert("Recipe saved");
  }

  async function remove() {
    if (!item || !confirm(`Delete "${item.name}"?`)) return;
    await api(`/api/pos/items/${item.id}`, { method: "DELETE" });
    onSaved(item, true);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100">{item ? "Edit Item" : "New Menu Item"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>

        {item && (
          <div className="flex gap-2 mb-4 border-b border-slate-100 dark:border-slate-800">
            <button onClick={() => setTab("details")} className={`px-3 py-2 text-sm font-medium ${tab === "details" ? "border-b-2 border-orange-500 text-orange-600" : "text-slate-400"}`}>
              Details
            </button>
            <button onClick={() => setTab("recipe")} className={`px-3 py-2 text-sm font-medium ${tab === "recipe" ? "border-b-2 border-orange-500 text-orange-600" : "text-slate-400"}`}>
              Recipe / Ingredients
            </button>
          </div>
        )}

        {tab === "details" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Name</label>
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Category</label>
                <select
                  className={inputCls}
                  value={form.category_id ?? ""}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Description</label>
              <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Image URL</label>
                <input className={inputCls} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400">SKU / Item Code</label>
                <input className={inputCls} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400">Dine-in price</label>
                <input type="number" step="0.01" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Takeaway price</label>
                <input type="number" step="0.01" className={inputCls} value={form.takeaway_price} placeholder="same" onChange={(e) => setForm({ ...form, takeaway_price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Delivery price</label>
                <input type="number" step="0.01" className={inputCls} value={form.delivery_price} placeholder="same" onChange={(e) => setForm({ ...form, delivery_price: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400">Cost price</label>
                <input type="number" step="0.01" className={inputCls} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Tax % (blank = outlet default)</label>
                <input type="number" step="0.01" className={inputCls} value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Gross margin</label>
                <div className="h-[30px] flex items-center text-sm font-medium text-emerald-600">{margin}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Kitchen station</label>
                <select className={inputCls} value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })}>
                  {KITCHEN_STATIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Prep time (minutes)</label>
                <input type="number" className={inputCls} value={form.prep_time_minutes} onChange={(e) => setForm({ ...form, prep_time_minutes: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            {groups.length > 0 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Modifier groups</label>
                <div className="flex flex-wrap gap-2">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-full px-2.5 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modGroupIds.includes(g.id)}
                        onChange={(e) => setModGroupIds((p) => (e.target.checked ? [...p, g.id] : p.filter((id) => id !== g.id)))}
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} /> Available
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={form.is_favorite} onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })} /> Favorite
              </label>
            </div>

            <div className="flex justify-between pt-3">
              {item ? (
                <button onClick={remove} className="text-sm text-red-500 hover:underline">
                  Delete item
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  Cancel
                </button>
                <button disabled={saving} onClick={save} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "recipe" && item && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Ingredients consumed per one unit sold. Stock deducts automatically when this item is served.
            </p>
            {recipe.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  className={inputCls}
                  value={r.ingredient_id}
                  onChange={(e) => {
                    const next = [...recipe];
                    next[idx] = { ...r, ingredient_id: Number(e.target.value) };
                    setRecipe(next);
                  }}
                >
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.001"
                  className={`${inputCls} w-28`}
                  value={r.quantity}
                  onChange={(e) => {
                    const next = [...recipe];
                    next[idx] = { ...r, quantity: parseFloat(e.target.value) || 0 };
                    setRecipe(next);
                  }}
                />
                <button onClick={() => setRecipe(recipe.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 px-1">
                  ×
                </button>
              </div>
            ))}
            {ingredients.length === 0 ? (
              <p className="text-sm text-slate-400">Add ingredients under Inventory first.</p>
            ) : (
              <button
                onClick={() => setRecipe([...recipe, { id: 0, menu_item_id: item.id, ingredient_id: ingredients[0].id, quantity: 0 }])}
                className="text-sm text-orange-600 hover:underline"
              >
                + Add ingredient
              </button>
            )}
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                Close
              </button>
              <button onClick={saveRecipe} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
                Save Recipe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupModal({
  group,
  onClose,
  onSaved,
}: {
  group: ModifierGroup | null;
  onClose: () => void;
  onSaved: (g: ModifierGroup, deleted?: boolean) => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [minSelect, setMinSelect] = useState(group?.min_select ?? 0);
  const [maxSelect, setMaxSelect] = useState(group?.max_select ?? 1);
  const [required, setRequired] = useState(group?.required ?? false);
  const [options, setOptions] = useState(group?.options.map((o) => ({ name: o.name, price_delta: o.price_delta })) ?? [{ name: "", price_delta: 0 }]);

  async function save() {
    const payload = { name, min_select: minSelect, max_select: maxSelect, required, options: options.filter((o) => o.name.trim()) };
    const saved = group
      ? await api<ModifierGroup>(`/api/pos/modifier-groups/${group.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : await api<ModifierGroup>("/api/pos/modifier-groups", { method: "POST", body: JSON.stringify(payload) });
    onSaved(saved);
  }
  async function remove() {
    if (!group || !confirm(`Delete "${group.name}"?`)) return;
    await api(`/api/pos/modifier-groups/${group.id}`, { method: "DELETE" });
    onSaved(group, true);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6">
        <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-4">{group ? "Edit Modifier Group" : "New Modifier Group"}</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Group name (e.g. Steak Cooking Level)</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Min select</label>
              <input type="number" className={inputCls} value={minSelect} onChange={(e) => setMinSelect(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Max select</label>
              <input type="number" className={inputCls} value={maxSelect} onChange={(e) => setMaxSelect(parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required
          </label>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Options (name, extra charge)</label>
            {options.map((o, idx) => (
              <div key={idx} className="flex gap-2 mb-1.5">
                <input
                  className={inputCls}
                  placeholder="Option name"
                  value={o.name}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx] = { ...o, name: e.target.value };
                    setOptions(next);
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  className={`${inputCls} w-24`}
                  value={o.price_delta}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx] = { ...o, price_delta: parseFloat(e.target.value) || 0 };
                    setOptions(next);
                  }}
                />
                <button onClick={() => setOptions(options.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 px-1">
                  ×
                </button>
              </div>
            ))}
            <button onClick={() => setOptions([...options, { name: "", price_delta: 0 }])} className="text-sm text-orange-600 hover:underline">
              + Add option
            </button>
          </div>
        </div>
        <div className="flex justify-between pt-4">
          {group ? (
            <button onClick={remove} className="text-sm text-red-500 hover:underline">
              Delete group
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              Cancel
            </button>
            <button onClick={save} className="text-sm px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
