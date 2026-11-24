import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Label } from "@bcl32/utils/Label";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import {
  ColourPickerPopover,
  type ColourSwatch,
  type SwatchGroups,
} from "@bcl32/utils/ColourPickerPopover";
import type { ModelAttribute } from "@bcl32/data-utils";
import { fieldLabel } from "./fieldLabel";

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

export interface ColourFieldViewProps {
  attr: ModelAttribute;
  /** The current hex ("" for none). */
  value: string;
  /** A pick: the hex, and the swatch's id when it was a listed swatch. The popover closes after it. */
  onSelect: (hex: string, id?: string) => void;
  /** The swatches, flat or grouped: fetched by the host, or static. */
  swatchGroups: SwatchGroups;
  /** The picked swatch's id, so a pick shared by two same-hex swatches highlights the right one. */
  currentId?: string;
  /** Show the popover's Custom colour input (default true). */
  allowCustom?: boolean;
  /** Draws each swatch's dot (finish-aware swatches, say). */
  renderSwatchIcon?: (s: ColourSwatch) => React.ReactNode;
  /** The trigger's id, which the label names. Default "input_" + name. */
  id?: string;
}

/**
 * The colour field without the fetch: label, a round trigger in the current
 * colour, and the swatch popover. Swatches come in as a prop, so this module
 * never touches react-query; `ColourField` is this plus `useGroupedSwatches`.
 *
 * The popover closes on a pick, on a mouse-down outside it, and on Escape,
 * which returns focus to the trigger and does not also close a dialog behind.
 */
export function ColourFieldView({
  attr,
  value,
  onSelect,
  swatchGroups,
  currentId,
  allowCustom,
  renderSwatchIcon,
  id,
}: ColourFieldViewProps) {
  const name = attr.name;
  const controlId = id ?? "input_" + name;
  const label = fieldLabel(attr);
  const helpText = attr.help_text || attr.description || null;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex">
      <div>
        <LabelWithHelp htmlFor={controlId} helpText={helpText}>
          {label}:
        </LabelWithHelp>
        <div className="relative inline-block" ref={ref}>
          <button
            type="button"
            id={controlId}
            onClick={() => setOpen((o) => !o)}
            className="w-8 h-8 rounded-full border-2 border-border cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: value || "#94a3b8" }}
            title={value || "No colour — click to set"}
          />
          {open && (
            <ColourPickerPopover
              swatchGroups={swatchGroups}
              currentColour={value}
              currentId={currentId}
              onSelect={(hex, presetId) => {
                onSelect(hex, presetId);
                setOpen(false);
              }}
              allowCustom={allowCustom}
              renderSwatchIcon={renderSwatchIcon}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
