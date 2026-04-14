import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Combobox } from "@bcl32/utils/Combobox";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import { ColourPickerPopover, type ColourSwatch } from "@bcl32/utils/ColourPickerPopover";
import type {
  FilterContextValue,
  FilterDisplay,
  FilterOption,
  FilterSelection,
  FilterSourceKind,
  ColourPresetsConfig,
} from "./types";
import { capitalize } from "./utils";

interface OptionsFilterProps {
  name: string;
  options: FilterOption[];
  display?: FilterDisplay;
  selection?: FilterSelection;
  source_kind?: FilterSourceKind;
  colour_presets?: ColourPresetsConfig;
}

export function OptionsFilter({
  name,
  options,
  display = "combobox",
  selection = "multi",
  source_kind = "scalar-array",
  colour_presets,
}: OptionsFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;
  const filterData = context?.filters?.[name];

  if (!filterData || !context) {
    return null;
  }

  const currentValue = Array.isArray(filterData["value"]) ? (filterData["value"] as string[]) : [];
  const ruleEligible = source_kind !== "scalar" && selection === "multi";

  function setValue(next: string[]) {
    context!.change_filters(name, "value", next);
  }

  function toggleValue(v: string) {
    setValue(currentValue.includes(v) ? currentValue.filter((x) => x !== v) : [...currentValue, v]);
  }

  function toggleRule() {
    const next = filterData?.["rule"] === "all" ? "any" : "all";
    context!.change_filters(name, "rule", next);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold">{capitalize(name)}</span>
        {ruleEligible && (
          <button
            type="button"
            onClick={toggleRule}
            className="text-xs px-1.5 py-0.5 rounded border border-primary/40 text-primary hover:border-primary transition-colors"
          >
            {filterData["rule"] === "all" ? "All" : "Any"}
          </button>
        )}
      </div>

      {display === "combobox" && (
        <ComboboxView
          options={options}
          value={currentValue}
          multiple={selection === "multi"}
          placeholder={`Add ${name}...`}
          onChange={setValue}
        />
      )}

      {display === "dropdown" && (
        <ComboboxView
          options={options}
          value={currentValue}
          multiple={selection === "multi"}
          placeholder={`Filter ${name}...`}
          onChange={setValue}
        />
      )}

      {display === "chip-toggle" && (
        <ChipToggleView options={options} selected={currentValue} onToggle={toggleValue} />
      )}

      {display === "toggle-buttons" && (
        <ToggleButtonsView options={options} selected={currentValue} onChange={setValue} />
      )}

      {display === "swatch-grid" && (
        <SwatchGridView
          colour_presets={colour_presets}
          selected={currentValue}
          onToggle={toggleValue}
        />
      )}
    </div>
  );
}

interface ComboboxViewProps {
  options: FilterOption[];
  value: string[];
  multiple: boolean;
  placeholder: string;
  onChange: (next: string[]) => void;
}

function ComboboxView({ options, value, multiple, placeholder, onChange }: ComboboxViewProps): JSX.Element {
  const labels = options.map((o) => o.label);
  const labelToValue = React.useMemo(() => {
    const m = new Map<string, string>();
    options.forEach((o) => m.set(o.label, o.value));
    return m;
  }, [options]);
  const valueToLabel = React.useMemo(() => {
    const m = new Map<string, string>();
    options.forEach((o) => m.set(o.value, o.label));
    return m;
  }, [options]);

  const currentLabels = value.map((v) => valueToLabel.get(v) ?? v);

  return (
    <Combobox
      multiple={multiple}
      freeSolo
      options={labels}
      value={currentLabels}
      onChange={(next: string | string[]) => {
        const arr = Array.isArray(next) ? next : next ? [next] : [];
        onChange(arr.map((lbl) => labelToValue.get(lbl) ?? lbl));
      }}
      placeholder={placeholder}
    />
  );
}

interface ChipToggleViewProps {
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

function ChipToggleView({ options, selected, onToggle }: ChipToggleViewProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
              on
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface ToggleButtonsViewProps {
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

function ToggleButtonsView({ options, selected, onChange }: ToggleButtonsViewProps): JSX.Element {
  return (
    <ToggleGroup
      type="multiple"
      variant="outline"
      size="sm"
      value={selected}
      onValueChange={(value: string[]) => onChange(value)}
      className="flex flex-wrap gap-1 mt-1"
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value}>
          {capitalize(o.label)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

interface SwatchGridViewProps {
  colour_presets?: ColourPresetsConfig;
  selected: string[];
  onToggle: (hex: string) => void;
}

function SwatchGridView({ colour_presets, selected, onToggle }: SwatchGridViewProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const { data } = useGetRequest<{ items: Record<string, unknown>[] }>(
    colour_presets?.get_api_url ?? "",
    {
      enabled: !!colour_presets?.get_api_url,
      staleTime: 5 * 60 * 1000,
    },
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

  return (
    <div className="relative inline-block" ref={ref}>
      <div className="flex items-center gap-1.5 flex-wrap mt-1">
        {selected.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onToggle(hex)}
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
            onToggle(hex);
          }}
        />
      )}
    </div>
  );
}
