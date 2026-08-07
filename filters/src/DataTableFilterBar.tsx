import { useState, useEffect, useRef } from "react";
import * as React from "react";
import dayjs from "dayjs";
import { FilterProvider } from "./FilterProvider";
import { OrderFilters } from "./OrderFilters";
import { FilterElement } from "./FilterElement";
import { AddFilterPicker } from "./AddFilterPicker";
import { FilterSearchBar } from "./FilterSearchBar";
import type { SearchFieldEntry } from "./FilterSearch";
import { humanizeFieldName, prettyOptionLabel } from "./utils";
import type { Filters, FilterValue, FilterOption, FilterCatalogEntry, FilterInitialValue } from "./types";
import { ListFilter, X } from "lucide-react";

function formatOptionsLabel(value: string[], options: FilterOption[] | undefined): string {
  // Same prettifying the control itself applies, so the summary chip and the
  // dropdown never disagree about how a status is spelled.
  if (!options || options.length === 0) return value.map(prettyOptionLabel).join(", ");
  const map = new Map(options.map((o) => [o.value, prettyOptionLabel(o.label)]));
  return value.map((v) => map.get(v) ?? prettyOptionLabel(v)).join(", ");
}

function formatFilterLabel(name: string, filter: FilterValue): string {
  // Prefer the schema title ("Size (mm)") over the raw key — a dynamic instance's
  // key is synthetic ("weight_g#2"), so the key alone reads badly in a chip.
  const label = filter.title ?? humanizeFieldName(filter.field ?? name);
  switch (filter.type) {
    case "string":
      return `${label} ${filter.rule} "${filter.value}"`;
    case "number": {
      const v = filter.value as { min: number; max: number };
      return `${label}: ${v.min} – ${v.max}`;
    }
    case "options": {
      const vals = filter.value as string[];
      const rule = filter.rule === "all" ? " (all)" : "";
      if (filter.display === "swatch-grid") {
        return `${label}: ${vals.length} colour${vals.length !== 1 ? "s" : ""}`;
      }
      return `${label}${rule}: ${formatOptionsLabel(vals, filter.options)}`;
    }
    case "datetime": {
      const v = filter.value as { timespan_begin: string; timespan_end: string };
      const start = dayjs(v.timespan_begin).format("MMM D, YYYY");
      const end = dayjs(v.timespan_end).format("MMM D, YYYY");
      return `${label}: ${start} → ${end}`;
    }
    default:
      return label;
  }
}

/** How many table columns may be auto-pinned before it stops being a hint. */
const MAX_DEFAULT_FILTERS = 6;

/**
 * Field names behind a TanStack column list, in table order.
 *
 * Accessor columns expose `accessorKey`; display columns (select, expander,
 * actions) only have an `id` that matches no attribute, and are dropped later
 * by intersecting with the filter catalog. Columns explicitly hidden via the
 * table's columnVisibility map are skipped — if it isn't worth showing, it
 * isn't worth pinning a filter for.
 */
function columnFields(
  columns: unknown[] | undefined,
  columnVisibility: Record<string, boolean> | undefined,
): string[] {
  if (!Array.isArray(columns)) return [];
  const fields: string[] = [];
  for (const column of columns) {
    const def = column as { accessorKey?: unknown; id?: unknown };
    const field =
      typeof def?.accessorKey === "string"
        ? def.accessorKey
        : typeof def?.id === "string"
          ? def.id
          : undefined;
    if (!field) continue;
    if (columnVisibility && columnVisibility[field] === false) continue;
    if (!fields.includes(field)) fields.push(field);
  }
  return fields;
}

export interface DataTableFilter {
  toolbar: React.ReactNode;
  panel: React.ReactNode;
  filteredCount: number;
  totalCount: number;
}

interface UseDataTableFilterBarProps {
  filters: Filters;
  changeFilters: (name: string, key: string, value: unknown) => void;
  activeFilters: Filters;
  filteredCount: number;
  totalCount: number;
  // Optional — supplied together they enable the "+ Add filter" picker.
  // Omit them and the panel just renders whatever filters already exist.
  addFilter?: (
    field: string,
    initial?: FilterInitialValue,
    options?: { pinned?: boolean },
  ) => string | null;
  removeFilter?: (name: string) => void;
  filterCatalog?: FilterCatalogEntry[];
  // Optional — enables the free-text filter search box in the toolbar.
  searchIndex?: SearchFieldEntry[];
  /**
   * The data table's column definitions. Used only as a fallback: when the
   * entity declares no primaryFilter at all, the columns you chose to put on
   * screen are the best available guess at what you'd want to filter by, so
   * they get pinned instead of leaving the panel empty.
   */
  columns?: unknown[];
  /** The table's column-visibility map; hidden columns aren't pinned. */
  columnVisibility?: Record<string, boolean>;
  /**
   * Whether the entity declares any primaryFilter (from useEntityFilters).
   * Checked instead of inspecting `filters`, which is briefly empty after the
   * catalog is ready but before the schema-declared filters are built — long
   * enough for the fallback to fire on an entity that never needed it.
   */
  hasPrimaryFilters?: boolean;
}

export function useDataTableFilterBar({
  filters: allFilters,
  changeFilters,
  activeFilters,
  filteredCount,
  totalCount,
  addFilter,
  removeFilter,
  filterCatalog,
  searchIndex,
  columns,
  columnVisibility,
  hasPrimaryFilters,
}: UseDataTableFilterBarProps): DataTableFilter {
  // One flat, ordered list instead of per-kind tabs: pinned filters first,
  // then the always-present options filters, then user-added instances in the
  // order they were added. See OrderFilters for why bucketing by type is wrong
  // here.
  const orderedFilters = allFilters ? OrderFilters(allFilters) : [];
  const [open, setOpen] = useState(false);
  const hasSetInitialOpen = useRef(false);
  const activeCount = Object.keys(activeFilters).length;
  const catalog = filterCatalog ?? [];
  const canAddFilters = !!addFilter && catalog.length > 0;

  // Entities with no primaryFilter (Vendors, Printers, …) would otherwise open
  // to an empty panel. Fall back to the table's own columns: they're already a
  // curated, human-ordered view of the entity. Runs once, and only while the
  // panel is genuinely unpinned — never overrides a schema-declared set.
  const seededDefaultsRef = useRef(false);
  useEffect(() => {
    if (seededDefaultsRef.current) return;
    if (!addFilter || !allFilters || catalog.length === 0) return;

    if (hasPrimaryFilters || Object.values(allFilters).some((f) => f.primaryFilter)) {
      seededDefaultsRef.current = true;
      return;
    }

    const addable = new Set(
      catalog.filter((entry) => !entry.disabled).map((entry) => entry.field),
    );
    const fields = columnFields(columns, columnVisibility)
      .filter((field) => addable.has(field) && !allFilters[field])
      .slice(0, MAX_DEFAULT_FILTERS);

    seededDefaultsRef.current = true;
    fields.forEach((field) => addFilter(field, undefined, { pinned: true }));
  }, [addFilter, allFilters, catalog, columns, columnVisibility, hasPrimaryFilters]);

  // Open on first load when the entity has pinned filters — same behaviour the
  // auto-selected "Main" tab used to give.
  useEffect(() => {
    if (!hasSetInitialOpen.current && orderedFilters.some((entry) => entry["primaryFilter"])) {
      setOpen(true);
      hasSetInitialOpen.current = true;
    }
  }, [orderedFilters]);

  function resetFilter(name: string) {
    // A user-added instance has no "empty" resting state worth keeping around —
    // ✕ drops the slot. Schema-declared filters reset to their full range.
    if (allFilters?.[name]?.dynamic && removeFilter) {
      removeFilter(name);
      return;
    }
    if (allFilters?.[name]) {
      changeFilters(
        name,
        "value",
        structuredClone(allFilters[name]["filter_empty"]),
      );
    }
  }

  const toolbar = (
    <>
      {searchIndex && searchIndex.length > 0 && allFilters && (
        <FilterSearchBar
          index={searchIndex}
          filters={allFilters}
          changeFilters={changeFilters}
          addFilter={addFilter}
          // Reveal the panel so the applied filter is visible immediately.
          onApplied={() => setOpen(true)}
        />
      )}
      {canAddFilters && (
        <AddFilterPicker
          catalog={catalog}
          // Adding a filter mounts its control inside the panel, so reveal the
          // panel too — otherwise the button appears to do nothing while the
          // panel is collapsed.
          onAdd={(field) => {
            addFilter!(field);
            setOpen(true);
          }}
        />
      )}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
          open
            ? "bg-primary/20 text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title={open ? "Hide filters" : "Show filters"}
      >
        <ListFilter size={14} />
        Filters
        {activeCount > 0 && (
          <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
            {activeCount}
          </span>
        )}
      </button>
      {activeCount > 0 &&
        Object.entries(activeFilters).map(([key, entry]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5 shrink-0"
          >
            {formatFilterLabel(key, entry)}
            <button
              onClick={() => resetFilter(key)}
              className="hover:text-destructive transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
    </>
  );

  const panel = (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
      <div className={open ? "overflow-visible" : "overflow-hidden"}>
        {allFilters && (
          <FilterProvider
            filters={allFilters}
            changeFilters={changeFilters}
            addFilter={addFilter}
            removeFilter={removeFilter}
            filterCatalog={filterCatalog}
          >
            {/* One padded block, not three nested ones: the old pt-2 / py-2 /
                pb-1 stack spent ~24px of the panel on its own margins. */}
            <div className="space-y-1.5 border-b py-1.5">
              {canAddFilters && orderedFilters.length === 0 && (
                // The picker itself lives in the toolbar above now, so an empty
                // panel needs to point back at it rather than leave a blank
                // strip that reads as a loading state.
                <span className="text-xs text-muted-foreground">
                  Pick an attribute from “Add filter” above to start filtering.
                </span>
              )}
              {orderedFilters.length > 0 && (
                // Denser than the old 1/2/3/4 ladder — the cards carry a
                // caption and one control now, so they read fine at ~240px and
                // a typical six-filter set fits on a single row on a wide
                // screen instead of two.
                <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {orderedFilters.map((entry) => (
                    <FilterElement key={entry.name} filter_data={entry} />
                  ))}
                </div>
              )}
            </div>
          </FilterProvider>
        )}
      </div>
    </div>
  );

  return { toolbar, panel, filteredCount, totalCount };
}
