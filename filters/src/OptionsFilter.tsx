import * as React from "react";
import { FilterContext } from "./FilterContext";
import { FilterHeader } from "./FilterHeader";

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
import { capitalize, humanizeFieldName, prettyOptionLabel } from "./utils";

interface OptionsFilterProps {
  name: string;
  title?: string;
  options: FilterOption[];
  display?: FilterDisplay;
  selection?: FilterSelection;
  source_kind?: FilterSourceKind;
  colour_presets?: ColourPresetsConfig;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
}

export function OptionsFilter({
  name,
  title,
  options,
  display = "combobox",
  selection = "multi",
  source_kind = "scalar-array",
  colour_presets,
  onRemove,
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

  const label = title ?? humanizeFieldName(name);

  return (
    <div className="space-y-1">
      <FilterHeader
        label={label}
        rule={
          ruleEligible
            ? {
                text: filterData["rule"] === "all" ? "All" : "Any",
                onToggle: toggleRule,
                title:
                  filterData["rule"] === "all"
                    ? "Matching rows must have every selected value"
                    : "Matching rows need any one of the selected values",
              }
            : undefined
        }
        onRemove={onRemove}
      />

      {/* Both spellings are the same autocomplete; `label`, not `name`, or a
          dynamic instance advertises itself as "Filter weight_g#2...". */}
      {display === "combobox" && (
        <ComboboxView
          options={options}
          value={currentValue}
          multiple={selection === "multi"}
          placeholder={`Add ${label.toLowerCase()}...`}
          onChange={setValue}
        />
      )}

      {display === "dropdown" && (
        <ComboboxView
          options={options}
          value={currentValue}
          multiple={selection === "multi"}
          placeholder={`Filter ${label.toLowerCase()}...`}
          onChange={setValue}
        />
      )}

      {display === "chip-toggle" && (
        <ChipToggleView options={options} selected={currentValue} onToggle={toggleValue} />
      )}

      {display === "toggle-buttons" && (
        <ToggleButtonsView
          options={options}
          selected={currentValue}
          multiple={selection === "multi"}
          onChange={setValue}
        />
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
  // The combobox is a list of strings, so the displayed text is the key we get
  // back on select — both maps are built from the *pretty* label, never the raw
  // one, or an enum-backed option round-trips to a value nothing matches.
  const labels = React.useMemo(() => options.map((o) => prettyOptionLabel(o.label)), [options]);
  const labelToValue = React.useMemo(() => {
    const m = new Map<string, string>();
    options.forEach((o) => m.set(prettyOptionLabel(o.label), o.value));
    return m;
  }, [options]);
  const valueToLabel = React.useMemo(() => {
    const m = new Map<string, string>();
    options.forEach((o) => m.set(o.value, prettyOptionLabel(o.label)));
    return m;
  }, [options]);

  const currentLabels = value.map((v) => valueToLabel.get(v) ?? v);

  return (
    <Combobox
      multiple={multiple}
      freeSolo
      size="sm"
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
    <div className="flex flex-wrap gap-0.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`px-1.5 rounded-full text-[11px] leading-5 transition-colors ${
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
  multiple: boolean;
  onChange: (next: string[]) => void;
}

function ToggleButtonsView({ options, selected, multiple, onChange }: ToggleButtonsViewProps): JSX.Element {
  const itemClassName = "h-6 rounded px-1.5 text-[11px]";
  const groupClassName = "flex flex-wrap justify-start gap-0.5";
  // Overrides the `sm` variant's h-9 on each item: inside the filter grid
  // these are captions, and a full-height button row is what made an options
  // filter twice as tall as a text one.
  //
  // Two ToggleGroups rather than one with a computed `type`: Radix types the
  // value/onValueChange pair by that prop (string[] vs string), and a union
  // there makes both callbacks `any`. Single-select still clears — clicking
  // the pressed button reports "" — so the filter state stays [] / [value],
  // the same options-filter shape the predicate and the chip already read.
  if (multiple) {
    return (
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        value={selected}
        onValueChange={(value: string[]) => onChange(value)}
        className={groupClassName}
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className={itemClassName}>
            {capitalize(o.label)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={selected[0] ?? ""}
      onValueChange={(value: string) => onChange(value ? [value] : [])}
      className={groupClassName}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} className={itemClassName}>
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
  const subgroupKey = colour_presets?.subgroup_by;

  const groupedSwatches = React.useMemo(() => {
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
      <div className="flex items-center gap-1 flex-wrap">
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
          className="w-6 h-6 rounded-full border-2 border-dashed border-border cursor-pointer hover:border-primary hover:scale-110 transition-all flex items-center justify-center text-muted-foreground text-sm leading-none"
          title="Add colour filter"
        >
          +
        </button>
      </div>
      {open && (
        <ColourPickerPopover
          swatchGroups={groupedSwatches}
          selectedColours={selected}
          size="lg"
          onSelect={(hex) => {
            onToggle(hex);
          }}
        />
      )}
    </div>
  );
}
