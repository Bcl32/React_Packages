import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Label } from "@bcl32/utils/Label";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import type { ModelAttribute } from "@bcl32/data-utils";
import type { FormData } from "./FormElement";
import { ColourPickerPopover, type ColourSwatch } from "@bcl32/utils/ColourPickerPopover";

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

export function ColourField({
  entry_data,
  formData,
  setFormData,
}: {
  entry_data: ModelAttribute;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const name = entry_data.name;
  const helpText = entry_data.help_text || entry_data.description || null;
  const colourPresets = entry_data.colour_presets as ColourPresetsInfo | undefined;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

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

  const currentColour = (formData[name] as string) || "";

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (colour: string, filamentId?: string) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: colour };
      const idsKey = name.replace(/_colours?$/, "_ids");
      if (idsKey !== name) {
        next[idsKey] = filamentId ? [filamentId] : [null];
      }
      return next;
    });
    setOpen(false);
  };

  return (
    <div className="flex">
      <div>
        <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
          {name[0].toUpperCase() + name.slice(1).replace(/_/g, " ")}:
        </LabelWithHelp>
        <div className="relative inline-block" ref={ref}>
          <button
            type="button"
            id={"input_" + name}
            onClick={() => setOpen((o) => !o)}
            className="w-8 h-8 rounded-full border-2 border-border cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: currentColour || "#94a3b8" }}
            title={currentColour || "No colour — click to set"}
          />
          {open && (
            <ColourPickerPopover
              swatchGroups={groupedSwatches}
              currentColour={currentColour}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
