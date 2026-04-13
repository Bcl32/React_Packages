import { useState, useEffect, useRef } from "react";
import * as React from "react";
import dayjs from "dayjs";
import { FilterProvider } from "./FilterProvider";
import { GroupFilters } from "./GroupFilters";
import { FilterElement } from "./FilterElement";
import type { Filters, FilterValue, FilterOption } from "./types";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";

function formatOptionsLabel(value: string[], options: FilterOption[] | undefined): string {
  if (!options || options.length === 0) return value.join(", ");
  const map = new Map(options.map((o) => [o.value, o.label]));
  return value.map((v) => map.get(v) ?? v).join(", ");
}

function formatFilterLabel(name: string, filter: FilterValue): string {
  const label = name.replace(/_/g, " ");
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
}

export function useDataTableFilterBar({
  filters: allFilters,
  changeFilters,
  activeFilters,
  filteredCount,
  totalCount,
}: UseDataTableFilterBarProps): DataTableFilter {
  const grouped = allFilters ? GroupFilters(allFilters) : null;
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const hasSetInitialTab = useRef(false);
  const activeCount = Object.keys(activeFilters).length;

  useEffect(() => {
    if (!hasSetInitialTab.current && grouped && grouped.primary_filters.length > 0) {
      setActiveTab("main");
      hasSetInitialTab.current = true;
    }
  }, [grouped]);

  function resetFilter(name: string) {
    if (allFilters?.[name]) {
      changeFilters(
        name,
        "value",
        structuredClone(allFilters[name]["filter_empty"]),
      );
    }
  }

  function toggleTab(tab: string) {
    setActiveTab((prev) => (prev === tab ? null : tab));
  }

  const tabs = [
    ...(grouped && grouped.primary_filters.length > 0
      ? [{ key: "main", label: "Main" }] : []),
    ...(grouped && (grouped.string_filters.length + grouped.options_filters.length) > 0
      ? [{ key: "filters", label: "Filters" }] : []),
    ...(grouped && grouped.numeric_filters.length > 0
      ? [{ key: "numerical", label: "Numerical" }] : []),
    ...(grouped && grouped.time_filters.length > 0
      ? [{ key: "time", label: "Time" }] : []),
  ];

  const toolbar = (
    <>
      <FilterListIcon className="text-muted-foreground shrink-0" style={{ fontSize: 16 }} />
      <div className="flex items-center gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => toggleTab(tab.key)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
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
              <CloseIcon style={{ fontSize: 12 }} />
            </button>
          </span>
        ))}
    </>
  );

  const panel = (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ${activeTab ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
    >
      <div className={activeTab ? "overflow-visible" : "overflow-hidden"}>
        {grouped && (
          <FilterProvider filters={allFilters} changeFilters={changeFilters}>
            <div className="pt-2 pb-1 border-b">
              {activeTab === "main" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 py-2">
                  {grouped.primary_filters.map((entry) => (
                    <FilterElement key={entry.name} filter_data={entry} />
                  ))}
                </div>
              )}
              {activeTab === "filters" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 py-2">
                  {grouped.string_filters.map((entry) => (
                    <FilterElement key={entry.name} filter_data={entry} />
                  ))}
                  {grouped.options_filters.map((entry) => (
                    <FilterElement key={entry.name} filter_data={entry} />
                  ))}
                </div>
              )}
                {activeTab === "numerical" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 py-2">
                    {grouped.numeric_filters.map((entry) => (
                      <FilterElement key={entry.name} filter_data={entry} />
                    ))}
                  </div>
                )}
                {activeTab === "time" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 py-2">
                    {grouped.time_filters.map((entry) => (
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
