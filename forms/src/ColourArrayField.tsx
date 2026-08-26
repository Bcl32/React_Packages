import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Label } from "@bcl32/utils/Label";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import type { ModelAttribute } from "@bcl32/data-utils";
import { fieldLabel } from "./fieldLabel";
import type { FormData } from "./FormElement";
import { ColourPickerPopover } from "@bcl32/utils/ColourPickerPopover";
import { useGroupedSwatches } from "./useGroupedSwatches";

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
  const label = fieldLabel(entry_data);
  const idsKey = name.replace(/_colours?$/, "_ids");
  const helpText = entry_data.help_text || entry_data.description || null;
  const [open, setOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const editingRef = React.useRef<HTMLDivElement>(null);

  const groupedSwatches = useGroupedSwatches(entry_data);

  const colours = (formData[name] as string[]) || [];
  // Padded to the colour count: an older row can carry a shorter ids array,
  // and indexing it raw would offset every swatch past the gap.
  const ids = colours.map(
    (_, i) => ((formData[idsKey] as (string | null)[]) || [])[i] ?? null,
  );

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

  /**
   * The colour array and its `_ids` companion are ONE list, paired by index.
   * The ids can arrive shorter than the colours on an older row, and appending
   * to an unpadded array silently re-points earlier entries at the wrong id.
   * Pad to the colour count before touching either.
   */
  const aligned = (prev: Record<string, unknown>) => {
    const colours = (prev[name] as string[]) || [];
    const ids = (prev[idsKey] as (string | null)[]) || [];
    const padded = colours.map((_, i) => ids[i] ?? null);
    return { colours, ids: padded };
  };

  const addColour = (colour: string, presetId?: string) => {
    setFormData((prev) => {
      const { colours, ids } = aligned(prev);
      // Dedupe on the id, not the hex: a list can legitimately hold two
      // different entries that share a colour, and rejecting the second by
      // colour made the pick a silent no-op.
      const duplicate = presetId
        ? ids.includes(presetId)
        : colours.some((c, i) => c === colour && ids[i] == null);
      if (duplicate) return prev;
      return {
        ...prev,
        [name]: [...colours, colour],
        [idsKey]: [...ids, presetId || null],
      };
    });
  };

  const removeColour = (index: number) => {
    setFormData((prev) => {
      const { colours, ids } = aligned(prev);
      return {
        ...prev,
        [name]: colours.filter((_, i) => i !== index),
        [idsKey]: ids.filter((_, i) => i !== index),
      };
    });
  };

  const replaceColour = (index: number, colour: string, presetId?: string) => {
    setFormData((prev) => {
      const { colours, ids } = aligned(prev);
      const nextColours = [...colours];
      const nextIds = [...ids];
      nextColours[index] = colour;
      nextIds[index] = presetId || null;
      return { ...prev, [name]: nextColours, [idsKey]: nextIds };
    });
  };

  return (
    <div className="flex">
      <div>
        <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
          {label}:
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
                  currentId={ids[index] ?? undefined}
                  defaultCustomColour={colour}
                  onSelect={(hex, presetId) => {
                    replaceColour(index, hex, presetId);
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
                selectedIds={ids.filter((i): i is string => !!i)}
                selectedColours={colours}
                onSelect={(hex, presetId) => {
                  addColour(hex, presetId);
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
