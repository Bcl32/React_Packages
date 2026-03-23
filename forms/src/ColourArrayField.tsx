import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Label } from "@bcl32/utils/Label";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import type { ModelAttribute } from "@bcl32/data-utils";
import type { FormData } from "./FormElement";
import { ColourPickerPopover, type ColourSwatch } from "./ColourPickerPopover";

interface ColourPresetsInfo {
  get_api_url: string;
  group_by?: string;
}

function LabelWithHelp({
  htmlFor,
  children,
  helpText,
}: {
  htmlFor: string;
  children: React.ReactNode;
  helpText?: string | null;
}) {
  return (
    <div className="flex items-center gap-1 mb-2">
      <Label htmlFor={htmlFor}>{children}</Label>
      {helpText && (
        <CustomTooltip content={helpText} delayDuration={200}>
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </CustomTooltip>
      )}
    </div>
  );
}

export function ColourArrayField({
  entry_data,
  formData,
  setFormData,
}: {
  entry_data: ModelAttribute;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const name = entry_data.name;
  const idsKey = name.replace(/_colours?$/, "_ids");
  const helpText = entry_data.help_text || entry_data.description || null;
  const colourPresets = entry_data.colour_presets as ColourPresetsInfo | undefined;
  const [open, setOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const editingRef = React.useRef<HTMLDivElement>(null);

  const { data } = useGetRequest<{ items: Record<string, unknown>[] }>(
    colourPresets?.get_api_url ?? "",
    {
      enabled: !!colourPresets?.get_api_url,
      staleTime: 5 * 60 * 1000,
    }
  );

  const groupKey = colourPresets?.group_by;

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

  const colours = (formData[name] as string[]) || [];
  const filamentIds = (formData[idsKey] as (string | null)[]) || [];

  React.useEffect(() => {
    if (!open && editingIndex === null) return;
    const handler = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (editingIndex !== null && editingRef.current && !editingRef.current.contains(e.target as Node)) {
        setEditingIndex(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, editingIndex]);

  const addColour = (colour: string, filamentId?: string) => {
    setFormData((prev) => {
      const currentColours = (prev[name] as string[]) || [];
      const currentIds = (prev[idsKey] as (string | null)[]) || [];
      if (currentColours.includes(colour)) return prev;
      return {
        ...prev,
        [name]: [...currentColours, colour],
        [idsKey]: [...currentIds, filamentId || null],
      };
    });
  };

  const removeColour = (index: number) => {
    setFormData((prev) => {
      const currentColours = (prev[name] as string[]) || [];
      const currentIds = (prev[idsKey] as (string | null)[]) || [];
      return {
        ...prev,
        [name]: currentColours.filter((_, i) => i !== index),
        [idsKey]: currentIds.filter((_, i) => i !== index),
      };
    });
  };

  const replaceColour = (index: number, colour: string, filamentId?: string) => {
    setFormData((prev) => {
      const currentColours = [...((prev[name] as string[]) || [])];
      const currentIds = [...((prev[idsKey] as (string | null)[]) || [])];
      currentColours[index] = colour;
      currentIds[index] = filamentId || null;
      return { ...prev, [name]: currentColours, [idsKey]: currentIds };
    });
  };

  return (
    <div className="flex">
      <div>
        <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
          {name[0].toUpperCase() + name.slice(1).replace(/_/g, " ")}:
        </LabelWithHelp>
        <div className="flex items-center gap-1.5 flex-wrap">
          {colours.map((colour, index) => (
            <div
              key={`${colour}-${index}`}
              className="relative group"
              ref={editingIndex === index ? editingRef : undefined}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEditingIndex(editingIndex === index ? null : index);
                }}
                className="w-8 h-8 rounded-full border-2 border-border cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: colour }}
                title={colour}
              />
              <button
                type="button"
                onClick={() => removeColour(index)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove"
              >
                x
              </button>
              {editingIndex === index && (
                <ColourPickerPopover
                  swatchGroups={groupedSwatches}
                  currentColour={colour}
                  defaultCustomColour={colour}
                  onSelect={(hex, filamentId) => {
                    replaceColour(index, hex, filamentId);
                    setEditingIndex(null);
                  }}
                />
              )}
            </div>
          ))}
          <div className="relative inline-block" ref={ref}>
            <button
              type="button"
              id={"input_" + name}
              onClick={() => {
                setEditingIndex(null);
                setOpen((o) => !o);
              }}
              className="w-8 h-8 rounded-full border-2 border-dashed border-border cursor-pointer hover:border-primary hover:scale-110 transition-all flex items-center justify-center text-muted-foreground text-lg"
              title="Add colour"
            >
              +
            </button>
            {open && (
              <ColourPickerPopover
                swatchGroups={groupedSwatches}
                selectedColours={colours}
                onSelect={(hex, filamentId) => {
                  addColour(hex, filamentId);
                  setOpen(false);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
