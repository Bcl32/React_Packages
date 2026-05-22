import * as React from "react";
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import type { ModelAttribute } from "@bcl32/data-utils";
import type { ColourSwatch } from "@bcl32/utils/ColourPickerPopover";

interface ColourPresetsInfo {
  get_api_url: string;
  group_by?: string;
  subgroup_by?: string;
}

/**
 * Fetches the colour-preset swatches for a form field and groups them into a
 * two-level map: the outer key is the `group_by` field value (e.g. material),
 * the inner key is the `subgroup_by` field value (e.g. sub_type).
 *
 * When `subgroup_by` is not configured the inner level collapses to a single
 * `""` sentinel key, which the popover renders without a sub-header — so a
 * single-level preset list looks exactly as it did before.
 */
export function useGroupedSwatches(
  entry_data: ModelAttribute
): Map<string, Map<string, ColourSwatch[]>> {
  const colourPresets = entry_data.colour_presets as
    | ColourPresetsInfo
    | undefined;

  const { data } = useGetRequest<{ items: Record<string, unknown>[] }>(
    colourPresets?.get_api_url ?? "",
    {
      enabled: !!colourPresets?.get_api_url,
      staleTime: 5 * 60 * 1000,
    }
  );

  const groupKey = colourPresets?.group_by;
  const subgroupKey = colourPresets?.subgroup_by;

  return React.useMemo(() => {
    const groups = new Map<string, Map<string, ColourSwatch[]>>();
    if (!data?.items) return groups;
    for (const item of data.items) {
      const hex = item.colour_hex as string | undefined;
      if (!hex) continue;
      const groupLabel = groupKey
        ? ((item[groupKey] as string) || "Other")
        : "Presets";
      const subLabel = subgroupKey
        ? ((item[subgroupKey] as string) || "Other")
        : "";
      const swatch: ColourSwatch = {
        id: item.id as string | undefined,
        colour_hex: hex,
        colour_name: item.colour_name as string | undefined,
      };
      let subGroups = groups.get(groupLabel);
      if (!subGroups) {
        subGroups = new Map<string, ColourSwatch[]>();
        groups.set(groupLabel, subGroups);
      }
      const swatches = subGroups.get(subLabel) || [];
      swatches.push(swatch);
      subGroups.set(subLabel, swatches);
    }
    return groups;
  }, [data, groupKey, subgroupKey]);
}
