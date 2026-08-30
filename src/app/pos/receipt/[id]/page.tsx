import { redirect } from "next/navigation";
import { getPosSession } from "@/lib/pos/auth";
import { sql } from "@/lib/db";
import { ORDER_TYPE_LABEL, OrderType, PAYMENT_METHOD_LABEL, PaymentMethod, money } from "@/lib/pos/types";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getPosSession();
  if (!session) redirect("/pos/login");
  const { id } = await params;

  const orderRows = await sql`
    SELECT o.*, t.name AS table_name, c.name AS customer_name, w.name AS waiter_name, cs.name AS cashier_name
    FROM pos_orders o
    LEFT JOIN pos_tables t ON t.id = o.table_id
    LEFT JOIN pos_customers c ON c.id = o.customer_id
    LEFT JOIN pos_staff w ON w.id = o.waiter_id
    LEFT JOIN pos_staff cs ON cs.id = o.cashier_id
    WHERE o.id = ${id} AND o.outlet_id = ${session.outletId};
  `;
  const order = orderRows[0];
  if (!order) redirect("/pos/order");

  const items = await sql`SELECT * FROM pos_order_items WHERE order_id = ${id} AND is_void = false ORDER BY created_at;`;
  const payments = await sql`SELECT * FROM pos_payments WHERE order_id = ${id} ORDER BY created_at;`;
  const outletRows = await sql`SELECT * FROM pos_outlets WHERE id = ${session.outletId};`;
  const outlet = outletRows[0];

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg p-6 print:shadow-none print:rounded-none font-mono text-sm text-slate-800">
        <div className="text-center mb-4">
          {outlet.logo_url && <img src={outlet.logo_url} alt="" className="h-12 mx-auto mb-2 object-contain" />}
          <p className="font-bold text-base">{outlet.name}</p>
          {outlet.address && <p className="text-xs text-slate-500">{outlet.address}</p>}
          {outlet.phone && <p className="text-xs text-slate-500">{outlet.phone}</p>}
        </div>

        <div className="border-t border-dashed border-slate-300 my-3" />

        <div className="text-xs space-y-0.5 mb-3">
          <Row label="Receipt #" value={order.order_number} />
          <Row label="Order type" value={ORDER_TYPE_LABEL[order.order_type as OrderType]} />
          {order.table_name && <Row label="Table" value={order.table_name} />}
          <Row label="Date" value={new Date(order.created_at).toLocaleString()} />
          {order.waiter_name && <Row label="Waiter" value={order.waiter_name} />}
          {order.cashier_name && <Row label="Cashier" value={order.cashier_name} />}
          {order.customer_name && <Row label="Customer" value={order.customer_name} />}
          {order.room_number && <Row label="Room" value={`${order.room_number} (${order.guest_name ?? ""})`} />}
        </div>

        <div className="border-t border-dashed border-slate-300 my-3" />

        <table className="w-full text-xs">
          <tbody>
            {items.map((item) => {
              const modifiers = Array.isArray(item.modifiers) ? item.modifiers : [];
              const modTotal = modifiers.reduce((s: number, m: { price_delta?: number }) => s + Number(m.price_delta ?? 0), 0);
              const total = item.is_complimentary ? 0 : money((Number(item.unit_price) + modTotal) * Number(item.quantity));
              return (
                <tr key={item.id} className="align-top">
                  <td className="py-1 pr-2">
                    <div>
                      {item.quantity}× {item.name_snapshot} {item.is_complimentary && "(comp)"}
                    </div>
                    {modifiers.length > 0 && <div className="text-slate-400">{modifiers.map((m: { option: string }) => m.option).join(", ")}</div>}
                  </td>
                  <td className="py-1 text-right whitespace-nowrap">{total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t border-dashed border-slate-300 my-3" />

        <div className="text-xs space-y-0.5">
          <Row label="Subtotal" value={money(order.subtotal).toFixed(2)} />
          {Number(order.discount_amount) > 0 && <Row label={`Discount${order.discount_reason ? ` (${order.discount_reason})` : ""}`} value={`-${money(order.discount_amount).toFixed(2)}`} />}
          {Number(order.service_charge_amount) > 0 && <Row label={`Service charge (${outlet.service_charge_percent}%)`} value={money(order.service_charge_amount).toFixed(2)} />}
          {Number(order.tax_amount) > 0 && <Row label={`Tax (${outlet.tax_percent}%)`} value={money(order.tax_amount).toFixed(2)} />}
          {Number(order.tip_amount) > 0 && <Row label="Tip" value={money(order.tip_amount).toFixed(2)} />}
          {Number(order.delivery_fee) > 0 && <Row label="Delivery fee" value={money(order.delivery_fee).toFixed(2)} />}
        </div>

        <div className="border-t border-slate-800 my-2" />
        <div className="flex justify-between font-bold text-base">
          <span>TOTAL</span>
          <span>{money(order.total_amount).toFixed(2)}</span>
        </div>
        <div className="border-t border-dashed border-slate-300 my-3" />

        <div className="text-xs space-y-0.5">
          {payments.map((p) => (
            <Row key={p.id} label={PAYMENT_METHOD_LABEL[p.method as PaymentMethod] ?? p.method} value={money(p.amount).toFixed(2)} />
          ))}
          {payments.some((p) => p.amount_received) && (
            <Row label="Change" value={money(Number(payments.reduce((s, p) => s + Number(p.amount_received ?? p.amount), 0)) - Number(order.paid_amount)).toFixed(2)} />
          )}
        </div>

        <div className="border-t border-dashed border-slate-300 my-3" />
        <p className="text-center text-xs text-slate-500">{outlet.receipt_footer || "Thank you!"}</p>

        <div className="mt-5 print:hidden flex gap-2">
          <button
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium"
            data-print-trigger
          >
            Print Receipt
          </button>
          <a href="/pos/order" className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 text-center">
            Back to POS
          </a>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelector('[data-print-trigger]')?.addEventListener('click', () => window.print());`,
        }}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
