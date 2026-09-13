import Link from "next/link";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
}) {
  return (
    <div className="card overflow-hidden">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              return (
                <tr
                  key={row.id}
                  className="relative border-b border-slate-50 last:border-0 hover:bg-surface-alt/60"
                >
                  {columns.map((col, i) => (
                    <td key={col.header} className={col.className ?? "px-4 py-3 text-navy-800"}>
                      {i === 0 && rowHref ? (
                        <Link href={rowHref(row)} className="block">
                          {col.cell(row)}
                        </Link>
                      ) : (
                        col.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => {
          const body = (
            <dl className="space-y-1">
              {columns.map((col) => (
                <div key={col.header} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{col.header}</dt>
                  <dd className="text-right text-navy-800">{col.cell(row)}</dd>
                </div>
              ))}
            </dl>
          );
          return rowHref ? (
            <Link key={row.id} href={rowHref(row)} className="block px-4 py-3 hover:bg-surface-alt/60">
              {body}
            </Link>
          ) : (
            <div key={row.id} className="px-4 py-3">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
