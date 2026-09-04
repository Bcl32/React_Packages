import { useState, useEffect, useRef } from "react";
import * as React from "react";
import dayjs from "dayjs";
import { FilterProvider } from "./FilterProvider";
import { OrderFilters } from "./OrderFilters";
import { FilterElement } from "./FilterElement";
import { AddFilterPicker } from "./AddFilterPicker";
import { FilterSearchBar } from "./FilterSearchBar";
import { baseFieldName } from "./BuildFilterCatalog";
import { pumpFilterRequests, registerFilterBar } from "./FilterTargeting";
import type { SearchFieldEntry } from "./FilterSearch";
import { humanizeFieldName, prettyOptionLabel } from "./utils";
import type { Filters, FilterValue, FilterOption, FilterCatalogEntry, FilterInitialValue } from "./types";
import { ListFilter, X } from "lucide-react";
import { CustomTooltip } from "@bcl32/utils/Tooltip";

/** Characters a chip shows before it ellipsises; the tooltip carries the rest. */
const CHIP_LABEL_CAP = { default: 28, large: 40 } as const;

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

/**
 * What `useDataTableFilterBar` hands back.
 *
 * `toolbar` and `panel` are the two nodes `DataTable` renders, and they are the
 * whole contract for a bar that lives inside the table. The rest are the same
 * pieces one at a time — for a page that lays the bar out itself (see
 * `PageFilterBar`) and wants the search box in one row and the chips in another,
 * or the chips wrapping instead of scrolling. Rendering a piece here *and* the
 * composed `toolbar` mounts it twice; pick one.
 */
export interface DataTableFilter {
  toolbar: React.ReactNode;
  panel: React.ReactNode;
  filteredCount: number;
  totalCount: number;
  /** The free-text search box, or null when no `searchIndex` was supplied. */
  search: React.ReactNode;
  /** The "+ Add filter" picker, or null when the bar cannot add filters. */
  addPicker: React.ReactNode;
  /** The show/hide toggle with its active count, or null when not collapsible. */
  toggle: React.ReactNode;
  /** One chip per active filter, each with its ✕; null when nothing is active. */
  chips: React.ReactNode;
  /** How many filters are currently narrowing the rows. */
  activeCount: number;
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
  /**
   * Fields whose cards this bar must not render.
   *
   * For filters that are mounted and writable but whose UI lives somewhere else
   * on the page — a colour wheel, a map, a calendar — so the control and a
   * duplicate card don't both drive the same field. The filter itself is
   * untouched: it still matches rows, still shows a toolbar chip, and is still
   * reachable from filter search and the keyboard shortcuts.
   *
   * Matched on the data column (`field ?? key`), so a user-added second
   * instance of the same field is hidden too.
   */
  hiddenFields?: string[];
  /**
   * Whether the card panel can be folded away behind a "Filters" toggle.
   *
   * Defaults to true — inside a table's toolbar the panel opens *above* the
   * rows and pushes them down, so it has to be dismissable. A bar that owns the
   * top of its page has nowhere to push anything, so it passes false: the
   * toggle disappears, the cards are always on screen, and an empty card set
   * collapses to nothing rather than showing the "pick an attribute" hint.
   */
  collapsible?: boolean;
  /**
   * How big the search box, picker and chips are drawn.
   *
   * `default` is sized for a table toolbar, where the bar shares a row with
   * the title and the chips scroll sideways. `large` is for a bar that owns
   * the top of its page (`PageFilterBar`): controls a step up in size and
   * chips that read as the page's headline state rather than a footnote.
   */
  size?: "default" | "large";
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
  hiddenFields,
  collapsible = true,
  size = "default",
}: UseDataTableFilterBarProps): DataTableFilter {
  const large = size === "large";
  // One flat, ordered list instead of per-kind tabs: pinned filters first,
  // then the always-present options filters, then user-added instances in the
  // order they were added. See OrderFilters for why bucketing by type is wrong
  // here.
  const allOrderedFilters = allFilters ? OrderFilters(allFilters) : [];
  // Hidden fields drop out of the *rendered* list only. Everything else in this
  // hook — the initial-open check, the chips, targeting — keeps working off the
  // full filter map, because a hidden filter is still a live one.
  const orderedFilters =
    hiddenFields && hiddenFields.length > 0
      ? allOrderedFilters.filter(
          (entry) =>
            !hiddenFields.includes(
              (entry["field"] as string | undefined) ?? baseFieldName(entry.name),
            ),
        )
      : allOrderedFilters;
  const [open, setOpen] = useState(false);
  // What the panel actually does. `open` keeps tracking the toggle so a bar
  // that later becomes collapsible resumes where it was; a non-collapsible
  // one simply never consults it.
  const expanded = !collapsible || open;
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const hasSetInitialOpen = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCount = Object.keys(activeFilters).length;
  const catalog = filterCatalog ?? [];
  const canAddFilters = !!addFilter && catalog.length > 0;

  // The registration below is made once, on mount, but its callbacks have to
  // answer with this render's props — so they read through a box rather than
  // closing over them.
  const latest = useRef({ allFilters, catalog, addFilter, canAddFilters, collapsible });
  latest.current = { allFilters, catalog, addFilter, canAddFilters, collapsible };

  /** The mounted instance of `field`, preferring the schema-declared one. */
  const keyForField = (field: string): string | null => {
    const filters = latest.current.allFilters ?? {};
    for (const key of Object.keys(filters)) {
      if ((filters[key].field ?? baseFieldName(key)) === field) return key;
    }
    return null;
  };

  // Publishes this bar so a keyboard shortcut can reach a filter that lives on
  // whatever page happens to be mounted. See FilterTargeting for why this is a
  // registry and not the data-attribute trick the `/` hotkey uses.
  useEffect(
    () =>
      registerFilterBar({
        element: () => panelRef.current,
        // "Reveal" means "make the cards visible": expand a folded panel, or —
        // when there is nothing to unfold — bring the always-open one back
        // into view, since a page-level bar may have been scrolled past.
        reveal: () => {
          if (latest.current.collapsible) setOpen(true);
          else panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        },
        hasField: (field) =>
          keyForField(field) !== null ||
          latest.current.catalog.some((entry) => entry.field === field),
        keyForField,
        addField: (field) => latest.current.addFilter?.(field) ?? null,
        openAddPicker: () => {
          if (latest.current.canAddFilters) setAddPickerOpen(true);
        },
      }),
    [],
  );

  // A targeting request usually cannot finish on its first try — the dataset is
  // still loading, or the filter it just asked for is a render away from being
  // in the DOM. Each of those resolves into one of these dependencies, so this
  // replaces guessing at timeouts with retrying exactly when something changed.
  useEffect(() => {
    pumpFilterRequests();
  }, [allFilters, filterCatalog, expanded]);

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
    // `orderedFilters`, not the full set: a pinned filter that is hidden has no
    // card to reveal, so opening the panel for it shows an empty strip.
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

  const search =
    searchIndex && searchIndex.length > 0 && allFilters ? (
      <FilterSearchBar
        index={searchIndex}
        filters={allFilters}
        changeFilters={changeFilters}
        addFilter={addFilter}
        // Reveal the panel so the applied filter is visible immediately.
        onApplied={() => setOpen(true)}
        size={size}
      />
    ) : null;

  const addPicker = canAddFilters ? (
    <AddFilterPicker
      catalog={catalog}
      // Controlled so the `f <entity> a` shortcut can open it; the picker
      // still drives every open/close itself through onOpenChange.
      open={addPickerOpen}
      onOpenChange={setAddPickerOpen}
      // Adding a filter mounts its control inside the panel, so reveal the
      // panel too — otherwise the button appears to do nothing while the
      // panel is collapsed.
      onAdd={(field) => {
        addFilter!(field);
        setOpen(true);
      }}
      size={size}
    />
  ) : null;

  const toggle = collapsible ? (
    <button
      onClick={() => setOpen((prev) => !prev)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium transition-colors ${
        large ? "px-3.5 py-1.5 text-base" : "px-2.5 py-0.5 text-xs"
      } ${
        open
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
      title={open ? "Hide filters" : "Show filters"}
    >
      <ListFilter size={large ? 17 : 14} />
      Filters
      {activeCount > 0 && (
        <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-semibold text-primary">
          {activeCount}
        </span>
      )}
    </button>
  ) : null;

  const chips =
    activeCount > 0
      ? Object.entries(activeFilters).map(([key, entry]) => {
          const label = formatFilterLabel(key, entry);
          const cap = CHIP_LABEL_CAP[size];
          const chip = (
          <span
            key={key}
            // Large chips are the page's headline state — what the rows are
            // being cut by — so they get a fill, a ring and weight, where the
            // toolbar's read as a quiet annotation beside the title.
            className={`inline-flex shrink-0 items-center rounded-full text-primary ${
              large
                ? "gap-1.5 bg-primary/15 px-3.5 py-1.5 text-base font-medium ring-1 ring-primary/30"
                : "gap-1 bg-primary/10 px-2 py-0.5 text-xs"
            }`}
          >
            {/* An options filter with twenty values picked would stretch the
                chip across the whole row, so the text is capped and
                ellipsised; the tooltip below carries the rest. */}
            <span className={`truncate ${large ? "max-w-[40ch]" : "max-w-[28ch]"}`}>
              {label}
            </span>
            <button
              onClick={() => resetFilter(key)}
              className="hover:text-destructive transition-colors"
            >
              <X size={large ? 16 : 12} />
            </button>
          </span>
          );
          // A real tooltip, not `title`: the browser's own waits a fixed
          // second before showing, which is too slow for a label you are
          // actively trying to read. Only on chips that were actually cut —
          // `ch` tracks character count closely enough that the length check
          // and the CSS ellipsis agree.
          return label.length > cap ? (
            <CustomTooltip key={key} content={label} delayDuration={150}>
              {chip}
            </CustomTooltip>
          ) : (
            chip
          );
        })
      : null;

  const toolbar = (
    <>
      {search}
      {addPicker}
      {toggle}
      {chips}
    </>
  );

  const cards = allFilters && (
    <FilterProvider
      filters={allFilters}
      changeFilters={changeFilters}
      addFilter={addFilter}
      removeFilter={removeFilter}
      filterCatalog={filterCatalog}
    >
      {/* One padded block, not three nested ones: the old pt-2 / py-2 /
          pb-1 stack spent ~24px of the panel on its own margins. The bottom
          rule separates a folding panel from the rows beneath it; a bar that
          owns its own box has nothing beneath to separate from. */}
      <div className={collapsible ? "space-y-1.5 border-b py-1.5" : "space-y-1.5 py-1.5"}>
        {collapsible && canAddFilters && orderedFilters.length === 0 && (
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
  );

  const panel = collapsible ? (
    <div
      ref={panelRef}
      className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
      <div className={open ? "overflow-visible" : "overflow-hidden"}>{cards}</div>
    </div>
  ) : (
    // No fold and no hint: with nothing mounted this is an empty element, so
    // the bar above it reads as complete rather than as waiting for something.
    // The element itself stays — targeting needs it to find the cards.
    <div ref={panelRef}>{orderedFilters.length > 0 && cards}</div>
  );

  return {
    toolbar,
    panel,
    filteredCount,
    totalCount,
    search,
    addPicker,
    toggle,
    chips,
    activeCount,
  };
}
