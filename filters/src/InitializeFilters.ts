import { CreateFilter } from "./CreateFilter";
import { isDynamicFilterAttribute, type DynamicFilterKind } from "./BuildFilterCatalog";
import type { Filters, ModelAttribute, DatasetStats } from "./types";

export interface InitializeFiltersOptions {
  /**
   * Which filter kinds are created on demand instead of at mount.
   *
   * When enabled, filters of that kind that aren't flagged primaryFilter are
   * NOT instantiated up front — the user adds them from the "+ Add filter"
   * picker. That's the clutter fix: Part declares 16 numeric + 16 text + 3 date
   * filters and rendered all of them at once.
   *
   * `true` covers every supported kind; an array narrows it
   * (e.g. `["number", "datetime"]` keeps text filters eager).
   *
   * **Options filters are in the pool too.** They were the one kind that
   * ignored `primaryFilter` entirely — always mounted, never offered in the
   * picker — so a page could not choose its own defaults for them. Including
   * them makes `primaryFilter` mean the same thing for every kind: pinned ones
   * keep their slot, the rest move to "+ Add filter". Narrow the array to opt a
   * page back out.
   *
   * Defaults to **off**: a consumer that hasn't wired addFilter/removeFilter/
   * filterCatalog into its filter UI would otherwise end up with filters it can
   * neither see nor create.
   */
  dynamicFilters?: boolean | DynamicFilterKind[];
}

const ALL_DYNAMIC_KINDS: DynamicFilterKind[] = [
  "number",
  "datetime",
  "string",
  "boolean",
  "options",
];

export function resolveDynamicKinds(
  option: boolean | DynamicFilterKind[] | undefined,
): DynamicFilterKind[] {
  if (option === true) return ALL_DYNAMIC_KINDS;
  if (Array.isArray(option)) return option;
  return [];
}

export function InitializeFilters(
  model_data: ModelAttribute[],
  datasetStats: DatasetStats,
  options: InitializeFiltersOptions = {},
): Filters {
  // Early return if datasetStats is not ready (race condition during initial load)
  if (!datasetStats || Object.keys(datasetStats).length === 0) {
    return {};
  }

  const dynamicKinds = resolveDynamicKinds(options.dynamicFilters);
  const filter_start: Filters = {};

  model_data.forEach(function (item) {
    if (!item["filter"]) return;
    if (dynamicKinds.length > 0 && isDynamicFilterAttribute(item, dynamicKinds)) return;

    const filter = CreateFilter(item, datasetStats);
    if (filter) {
      filter_start[item["name"]] = filter;
    }
  });

  return filter_start;
}
