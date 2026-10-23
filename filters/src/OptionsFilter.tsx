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
  FilterOptionIcon,
  FilterOptionSize,
  FilterSelection,
  FilterCellShape,
  ColourPresetsConfig,
} from "./types";
import { capitalize, humanizeFieldName, prettyOptionLabel } from "./utils";

interface OptionsFilterProps {
  name: string;
  title?: string;
  options: FilterOption[];
  display?: FilterDisplay;
  /** Toggle-buttons only: the ToggleGroup cva size the options draw at. */
  optionSize?: FilterOptionSize;
  /** Toggle-buttons and chip-toggle: a mark drawn in front of an option's label. */
  optionIcon?: FilterOptionIcon;
  selection?: FilterSelection;
  cell_shape?: FilterCellShape;
  colour_presets?: ColourPresetsConfig;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
}

export function OptionsFilter({
  name,
  title,
  options,
  display = "combobox",
  optionSize = "xs",
  optionIcon,
  selection = "multi",
  cell_shape = "scalar-array",
  colour_presets,
  onRemove,
}: OptionsFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;
  const filterData = context?.filters?.[name];

  if (!filterData || !context) {
    return null;
  }

  const currentValue = Array.isArray(filterData["value"]) ? (filterData["value"] as string[]) : [];
  const ruleEligible = cell_shape !== "scalar" && selection === "multi";

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
        <ChipToggleView options={options} selected={currentValue} icon={optionIcon} onToggle={toggleValue} />
      )}

      {display === "toggle-buttons" && (
        <ToggleButtonsView
          options={options}
          selected={currentValue}
          multiple={selection === "multi"}
          size={optionSize}
          icon={optionIcon}
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
  // Pairs straight through: the combobox shows the pretty label and reports
  // the option's VALUE. It used to be handed labels alone and map the pick
  // back through a label→value table, which kept only one of two options that
  // share a label — two rooms called "Hall" filtered as one.
  const pairs = React.useMemo(
    () => options.map((o) => ({ value: String(o.value), label: prettyOptionLabel(o.label) })),
    [options],
  );

  return (
    <Combobox
      multiple={multiple}
      freeSolo
      size="sm"
      options={pairs}
      value={value}
      onChange={(next: string | string[]) => {
        onChange(Array.isArray(next) ? next : next ? [next] : []);
      }}
      placeholder={placeholder}
    />
  );
}

/**
 * An option's text with its mark, if any, in front of it: the option's own
 * `icon` first, else the page's. The mark is wrapped so the gap is on the mark
 * alone and an unmarked option stays plain text; no icon means no extra node
 * at all. An option carrying a `count` shows it after the text.
 */
function OptionLabel({
  option,
  text,
  icon,
  stacked = false,
}: {
  option: FilterOption;
  text: string;
  icon?: FilterOptionIcon;
  /** Tile layout: the mark above the text, drawn larger than the inline size. */
  stacked?: boolean;
}): JSX.Element {
  const mark = option.icon ?? icon?.(option);
  const count =
    option.count == null ? null : (
      <span className="ml-1 tabular-nums text-muted-foreground">{option.count}</span>
    );
  if (!mark) return <>{text}{count}</>;
  if (stacked) {
    return (
      <>
        <span className="inline-flex shrink-0 items-center [&>svg]:h-7 [&>svg]:w-7">{mark}</span>
        <span>{text}{count}</span>
      </>
    );
  }
  return (
    <>
      <span className="inline-flex shrink-0 items-center mr-1">{mark}</span>
      {text}
      {count}
    </>
  );
}

interface ChipToggleViewProps {
  options: FilterOption[];
  selected: string[];
  icon?: FilterOptionIcon;
  onToggle: (value: string) => void;
}

function ChipToggleView({ options, selected, icon, onToggle }: ChipToggleViewProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-0.5">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`inline-flex items-center px-1.5 rounded-full text-[11px] leading-5 transition-colors ${
              on
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <OptionLabel option={o} text={o.label} icon={icon} />
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
  size: FilterOptionSize;
  icon?: FilterOptionIcon;
  onChange: (next: string[]) => void;
}

function ToggleButtonsView({ options, selected, multiple, size, icon, onChange }: ToggleButtonsViewProps): JSX.Element {
  const groupClassName = `flex flex-wrap justify-start ${size === "xs" ? "gap-0.5" : size === "tile" ? "gap-1.5" : "gap-1"}`;
  const stacked = size === "tile";
  // `xs` by default: inside the filter grid these are captions, and a
  // full-height button row is what made an options filter twice as tall as a
  // text one. A page opts a field up a size through `optionSizes`.
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
        size={size}
        value={selected}
        onValueChange={(value: string[]) => onChange(value)}
        className={groupClassName}
      >
        {options.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} disabled={o.disabled}>
            <OptionLabel option={o} text={capitalize(o.label)} icon={icon} stacked={stacked} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size={size}
      value={selected[0] ?? ""}
      onValueChange={(value: string) => onChange(value ? [value] : [])}
      className={groupClassName}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value} disabled={o.disabled}>
          <OptionLabel option={o} text={capitalize(o.label)} icon={icon} stacked={stacked} />
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

  const { groupedSwatches, byToken } = React.useMemo(() => {
    const groups = new Map<string, Map<string, ColourSwatch[]>>();
    // A selection is stored as the option's id (see `match_field`), so the
    // chips need the preset back to render its swatch colour and a label.
    const byToken = new Map<string, { hex: string; label: string }>();
    if (!data?.items) return { groupedSwatches: groups, byToken };
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
      if (swatch.id) {
        // Built from the CONFIGURED grouping keys, not from any particular
        // field name — several presets can share a hex, so the chip needs the
        // same words the popover groups them under to be unambiguous.
        const label =
          [groupKey ? groupLabel : "", subLabel, swatch.colour_name]
            .filter(Boolean)
            .join(" ") || hex;
        byToken.set(swatch.id, { hex, label });
      }
      let subGroups = groups.get(groupLabel);
      if (!subGroups) {
        subGroups = new Map<string, ColourSwatch[]>();
        groups.set(groupLabel, subGroups);
      }
      const swatches = subGroups.get(subLabel) || [];
      swatches.push(swatch);
      subGroups.set(subLabel, swatches);
    }
    return { groupedSwatches: groups, byToken };
  }, [data, groupKey, subgroupKey]);

  // A token is either an option id or, for the custom colour input, a raw hex.
  const describe = (token: string) =>
    byToken.get(token) ?? { hex: token, label: token };

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
        {selected.map((token) => {
          const { hex, label } = describe(token);
          return (
            <button
              key={token}
              type="button"
              onClick={() => onToggle(token)}
              className="w-6 h-6 rounded-full border-2 border-primary ring-1 ring-primary cursor-pointer hover:scale-110 transition-transform"
              style={{ backgroundColor: hex }}
              title={`Remove ${label}`}
            />
          );
        })}
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
          selectedIds={selected}
          selectedColours={selected}
          size="lg"
          onSelect={(hex, presetId) => {
            // The id identifies the option; the hex is only the fallback for
            // the custom colour input, which has no preset behind it.
            onToggle(presetId ?? hex);
          }}
        />
      )}
    </div>
  );
}
