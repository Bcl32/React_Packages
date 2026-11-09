// ── The table twin: every chart's data, as a table ───────────────────────────
// A chart is not accessible on its own: a screen reader, a colour-blind reader
// at the contrast floor and anyone who wants the exact number all need the
// rows. The relief rule makes it mandatory for the light-mode slots under 3:1.
// `TableTwin` renders the same rows the chart drew, behind a disclosure by
// default so it costs no space until asked for.

import type { ReactNode } from "react";

import { cx } from "./_cx";
import { formatInt } from "./format";
import { MUTED } from "./palette";

export interface TwinColumn<R> {
  key: string;
  label: ReactNode;
  /** A number column is right-aligned with tabular figures. */
  numeric?: boolean;
  /** The cell's content; `row[key]` (numbers through `formatInt`) by default. */
  render?: (row: R) => ReactNode;
}

export interface TableTwinProps<R> {
  /** The table's caption — say which chart it is the twin of. */
  caption: string;
  columns: TwinColumn<R>[];
  rows: R[];
  rowKey?: (row: R, i: number) => string;
  /** Behind a "Show as table" disclosure (default) or always open. */
  collapsible?: boolean;
  summary?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

function cellOf<R>(row: R, col: TwinColumn<R>): ReactNode {
  if (col.render) return col.render(row);
  const v = (row as Record<string, unknown>)[col.key];
  if (typeof v === "number") return formatInt(v);
  if (v == null || v === "") return "—";
  return String(v);
}

export function TwinTable<R>({ caption, columns, rows, rowKey, className }: Omit<TableTwinProps<R>, "collapsible" | "summary" | "defaultOpen">) {
  return (
    <div className={cx("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cx("border-b px-2 py-1.5 font-medium", c.numeric ? "text-right" : "text-left")}
                style={{ color: MUTED }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-2 py-2" style={{ color: MUTED }}>
                No rows.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={rowKey ? rowKey(r, i) : i} className="border-b last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className={cx("px-2 py-1.5", c.numeric && "viz-tabular text-right")}>
                    {cellOf(r, c)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableTwin<R>({
  caption,
  columns,
  rows,
  rowKey,
  collapsible = true,
  summary = "Show as table",
  defaultOpen = false,
  className,
}: TableTwinProps<R>) {
  const table = <TwinTable caption={caption} columns={columns} rows={rows} rowKey={rowKey} />;
  if (!collapsible) return <div className={className}>{table}</div>;
  return (
    <details className={cx("text-xs", className)} open={defaultOpen || undefined}>
      <summary className="cursor-pointer select-none py-1" style={{ color: MUTED }}>
        {summary}
      </summary>
      <div className="pt-1">{table}</div>
    </details>
  );
}
