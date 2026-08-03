import * as React from "react";
import dayjs from "dayjs";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";

import { Input } from "@bcl32/utils/Input";
import type { FilterCatalogEntry } from "./types";

interface AddFilterPickerProps {
  catalog: FilterCatalogEntry[];
  onAdd: (field: string) => void;
  label?: string;
  /** Rendered when the catalog is empty (e.g. dataset still loading). */
  emptyHint?: string;
}

/** Compact span for a datetime attribute: "Mar 4 '25 – Aug 2 '26". */
const DATE_FORMAT = "MMM D 'YY";

/** Section order and headings when one picker offers several kinds. */
const KIND_ORDER = ["number", "datetime", "string", "boolean", "options"] as const;
const KIND_LABEL: Record<string, string> = {
  number: "Numeric",
  datetime: "Date",
  string: "Text",
  boolean: "Flags",
  options: "Options",
};

function kindOrder(type: string): number {
  const at = (KIND_ORDER as readonly string[]).indexOf(type);
  return at === -1 ? KIND_ORDER.length : at;
}

/**
 * Compact number formatting for the range preview. Byte counts and volumes run
 * into the millions while layer heights are 0.08 — one formatter has to stay
 * readable across both, so large values go compact ("41.2M") and small ones
 * keep up to three decimals.
 */
function formatBound(value: number): string {
  if (!isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  if (magnitude >= 10000) {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (magnitude >= 100 || Number.isInteger(value)) return String(Math.round(value));
  return String(+value.toPrecision(3));
}

/** The live data span shown on the right of a picker row. */
function formatRange(entry: FilterCatalogEntry): string {
  // A boolean's value list is a fixed pair, so the row just says what control
  // it will add rather than pretending to summarise the data.
  if (entry.type === "boolean") return "yes / no";
  if (entry.type === "string") {
    // Textareas have no grouped stats, so there's no count to show — the row
    // still adds a perfectly good contains-search.
    if (typeof entry.distinct !== "number") return "text";
    return `${entry.distinct} value${entry.distinct === 1 ? "" : "s"}`;
  }
  if (entry.type === "datetime") {
    if (!entry.earliest || !entry.latest) return "—";
    return `${dayjs(entry.earliest).format(DATE_FORMAT)} – ${dayjs(entry.latest).format(DATE_FORMAT)}`;
  }
  if (typeof entry.min !== "number" || typeof entry.max !== "number") return "—";
  return `${formatBound(entry.min)} – ${formatBound(entry.max)}`;
}

/**
 * Bin counts as a 12px strip of bars — enough to tell "clustered near zero"
 * from "evenly spread" at a glance, which is what decides whether a range
 * filter is worth adding. Heights are square-rooted so one dominant bin
 * doesn't flatten every other bar to nothing.
 */
function Sparkline({ values }: { values: number[] }): JSX.Element {
  // Log scale, not linear or sqrt: these distributions are heavily skewed (most
  // parts weigh very little, a few weigh a lot), and on a linear scale the one
  // dominant bin flattens every other bar into an unreadable line.
  const peak = Math.log1p(Math.max(...values, 1));
  return (
    <span className="flex h-4 items-end gap-[1px]" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={index}
          className={`w-[3px] rounded-[1px] ${value > 0 ? "bg-primary/70" : "bg-primary/15"}`}
          style={{
            height: value > 0 ? `${Math.max(18, (Math.log1p(value) / peak) * 100)}%` : "12%",
          }}
        />
      ))}
    </span>
  );
}

/** Longest single value shown in a preview before it's clipped. */
const MAX_VALUE_CHARS = 16;

/** "makerworld · printables · thingiverse" — what's actually in the column. */
function TopValues({
  values,
}: {
  values: { value: string; count: number }[];
}): JSX.Element {
  // Clip each value rather than the joined string: one long URL would
  // otherwise fill the row and hide the other values entirely, which is the
  // opposite of a preview.
  const preview = values
    .map((v) =>
      v.value.length > MAX_VALUE_CHARS
        ? `${v.value.slice(0, MAX_VALUE_CHARS - 1)}…`
        : v.value,
    )
    .join(" · ");

  return (
    <span
      className="truncate text-[10px] text-muted-foreground/80"
      title={values.map((v) => `${v.value} (${v.count})`).join("\n")}
    >
      {preview}
    </span>
  );
}

export function AddFilterPicker({
  catalog,
  onAdd,
  label = "Add filter",
  emptyHint = "No attributes available",
}: AddFilterPickerProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [showUnavailable, setShowUnavailable] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setShowUnavailable(false);
    }
  }, [open]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = catalog.filter(
      (entry) =>
        !q ||
        entry.title.toLowerCase().includes(q) ||
        entry.field.toLowerCase().includes(q),
    );
    // Group by kind (a single picker now serves numeric, date and text), and
    // within each kind put addable-and-unused first, then already-used, then
    // the ones with nothing to filter on.
    const rank = (e: FilterCatalogEntry) => (e.disabled ? 2 : e.usedCount > 0 ? 1 : 0);
    return [...matches].sort(
      (a, b) =>
        kindOrder(a.type) - kindOrder(b.type) ||
        rank(a) - rank(b) ||
        a.title.localeCompare(b.title),
    );
  }, [catalog, query]);

  // Attributes with nothing to filter on are hidden behind a footer toggle
  // rather than listed greyed out — across Print-Tracker they're 29% of every
  // declared filter, mostly columns that are never populated or tables with no
  // rows yet, and they crowd out the ones you can actually use.
  const available = React.useMemo(() => visible.filter((e) => !e.disabled), [visible]);
  const unavailable = React.useMemo(() => visible.filter((e) => e.disabled), [visible]);

  // Reveal them anyway when a search matches only unavailable attributes —
  // "no matches" would be a lie, and knowing the column exists but is empty is
  // the useful answer.
  const revealUnavailable =
    showUnavailable || (available.length === 0 && unavailable.length > 0);

  // Only label the sections when more than one kind is on offer — a
  // single-kind picker needs no headers.
  const showKindHeaders = React.useMemo(
    () => new Set(available.map((entry) => entry.type)).size > 1,
    [available],
  );

  function add(entry: FilterCatalogEntry) {
    if (entry.disabled) return;
    onAdd(entry.field);
    setOpen(false);
  }

  function renderRow(entry: FilterCatalogEntry, previous?: FilterCatalogEntry) {
    return (
      <React.Fragment key={entry.field}>
        {showKindHeaders && !entry.disabled && previous?.type !== entry.type && (
          <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {KIND_LABEL[entry.type] ?? entry.type}
          </p>
        )}
        <button
          type="button"
          disabled={entry.disabled}
          onClick={() => add(entry)}
          title={entry.disabled ? entry.reason : `Add a ${entry.title} filter`}
          className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
            entry.disabled
              ? "cursor-not-allowed text-muted-foreground/50"
              : "hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <span className="shrink-0 truncate font-medium">
            {entry.title}
            {entry.usedCount > 0 && (
              <span className="ml-1.5 rounded bg-primary/15 px-1 py-0.5 text-[10px] font-semibold text-primary">
                {entry.usedCount > 1 ? `×${entry.usedCount}` : "in use"}
              </span>
            )}
          </span>

          {/* Right-hand group: what the data looks like, then how much of it.
              A distribution for numbers, the most common values for text —
              both skipped when disabled, since an empty column has no shape. */}
          <span className="ml-auto flex min-w-0 items-center gap-2">
            {!entry.disabled && entry.histogram && (
              <Sparkline values={entry.histogram} />
            )}
            {!entry.disabled && entry.topValues && entry.topValues.length > 0 && (
              <TopValues values={entry.topValues} />
            )}
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {entry.disabled ? (entry.reason ?? "unavailable") : formatRange(entry)}
            </span>
          </span>
        </button>
      </React.Fragment>
    );
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <Plus size={13} />
        {label}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-80 rounded-md border bg-popover p-1 shadow-md">
          <div className="flex items-center gap-1.5 px-1.5 pb-1">
            <Search size={13} className="shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              variant="background"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && available.length > 0) add(available[0]);
              }}
              placeholder="Search attributes..."
              className="h-7 flex-1 text-xs"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {visible.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {catalog.length === 0 ? emptyHint : "No matches"}
              </p>
            )}

            {available.map((entry, index) => renderRow(entry, available[index - 1]))}

            {unavailable.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowUnavailable((v) => !v)}
                  className="mt-1 flex w-full items-center gap-1 border-t px-2 pb-0.5 pt-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                  title="Attributes with no values in the current data"
                >
                  {revealUnavailable ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  {unavailable.length} unavailable
                </button>
                {revealUnavailable &&
                  unavailable.map((entry) => renderRow(entry))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
