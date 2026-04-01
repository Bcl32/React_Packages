import * as React from "react";
import { FilterContext } from "./FilterContext";
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import { ColourPickerPopover, type ColourSwatch } from "@bcl32/utils/ColourPickerPopover";
import type { FilterContextValue, ColourPresetsConfig } from "./types";

interface ColourFilterProps {
  name: string;
  colour_presets?: ColourPresetsConfig;
}

export function ColourFilter({ name, colour_presets }: ColourFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;
  const filterData = context?.filters?.[name];
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const { data } = useGetRequest<{ items: Record<string, unknown>[] }>(
    colour_presets?.get_api_url ?? "",
    {
      enabled: !!colour_presets?.get_api_url,
      staleTime: 5 * 60 * 1000,
    }
  );

  const groupKey = colour_presets?.group_by;

  const groupedSwatches = React.useMemo(() => {
    if (!data?.items) return new Map<string, ColourSwatch[]>();
    const groups = new Map<string, ColourSwatch[]>();
    for (const item of data.items) {
      const hex = item.colour_hex as string | undefined;
      if (!hex) continue;
      const label = groupKey ? ((item[groupKey] as string) || "Other") : "Presets";
      const swatch: ColourSwatch = {
        id: item.id as string | undefined,
        colour_hex: hex,
        colour_name: item.colour_name as string | undefined,
      };
      const group = groups.get(label) || [];
      group.push(swatch);
      groups.set(label, group);
    }
    return groups;
  }, [data, groupKey]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!filterData || !context) return null;

  const selected = Array.isArray(filterData["value"]) ? (filterData["value"] as string[]) : [];

  function toggleColour(hex: string) {
    const updated = selected.includes(hex)
      ? selected.filter((c) => c !== hex)
      : [...selected, hex];
    context?.change_filters(name, "value", updated);
  }

  return (
    <div>
      <span className="font-semibold capitalize">
        {name.replace(/_/g, " ")}:
      </span>
      <div className="relative inline-block" ref={ref}>
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {selected.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => toggleColour(hex)}
              className="w-6 h-6 rounded-full border-2 border-primary ring-1 ring-primary cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: hex }}
              title={`Remove ${hex}`}
            />
          ))}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="w-6 h-6 rounded-full border-2 border-dashed border-border cursor-pointer hover:border-primary hover:scale-110 transition-all flex items-center justify-center text-muted-foreground text-sm"
            title="Add colour filter"
          >
            +
          </button>
        </div>
        {open && (
          <ColourPickerPopover
            swatchGroups={groupedSwatches}
            selectedColours={selected}
            onSelect={(hex) => {
              toggleColour(hex);
            }}
          />
        )}
      </div>
    </div>
  );
}
