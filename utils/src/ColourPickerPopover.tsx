import * as React from "react";
import type { ReactNode } from "react";

export interface ColourSwatch {
  id?: string;
  colour_hex: string;
  colour_name?: string;
  /**
   * Consumers may hang extra fields on a swatch for their own
   * `renderSwatchIcon` to read. The popover passes the object through
   * untouched and never looks at them, so what they are called is the
   * consumer's business, not this package's.
   */
  [key: string]: unknown;
}

/**
 * Preset swatches for the popover. Either flat (`Map<group, swatches>`) or
 * nested (`Map<group, Map<subgroup, swatches>>`). Flat input is normalised to
 * a single ""-keyed subgroup, so legacy callers keep working unchanged.
 */
export type SwatchGroups =
  | Map<string, ColourSwatch[]>
  | Map<string, Map<string, ColourSwatch[]>>;

export interface ColourPickerPopoverProps {
  swatchGroups: SwatchGroups;
  currentColour?: string;
  currentId?: string;
  selectedColours?: string[];
  /**
   * Multi-select by swatch id. Prefer this over `selectedColours` wherever
   * several swatches can share a hex: a colour-based check then lights up all
   * of them at once, and "re-pick the highlighted one" can land on a different
   * swatch than the one that was chosen.
   */
  selectedIds?: string[];
  defaultCustomColour?: string;
  onSelect: (hex: string, presetId?: string) => void;
  /** Custom dot renderer (e.g. finish-aware swatches); default is a flat circle. */
  renderSwatchIcon?: (s: ColourSwatch) => ReactNode;
  /**
   * Panel scale. "lg" widens the popover and grows the dots — worth it where
   * the colour *is* the thing being picked (a colour filter) rather than one
   * field among many in a form.
   */
  size?: "md" | "lg";
  /**
   * Show the "Custom" colour input under the swatches. Default true (today's
   * panel). False where only a listed swatch is a valid pick, e.g. a field
   * that stores a preset's id.
   */
  allowCustom?: boolean;
  /**
   * Called on Escape. When given, Escape is handled here first: it does not
   * also reach a dialog behind the popover (one press closes one layer), and
   * focus returns to the element that had it when the popover opened (its
   * trigger). Without it, Escape does nothing here, as before.
   */
  onClose?: () => void;
}

/** Per-size Tailwind classes: panel width, dot box, and label type scale. */
const SIZES = {
  md: { panel: "w-[32rem]", dot: "w-6 h-6", label: "text-xs" },
  lg: { panel: "w-[44rem]", dot: "w-9 h-9", label: "text-sm" },
} as const;

export function ColourPickerPopover({
  swatchGroups,
  currentColour,
  currentId,
  selectedColours,
  selectedIds,
  defaultCustomColour = "#6b9bd2",
  onSelect,
  renderSwatchIcon,
  size = "md",
  allowCustom = true,
  onClose,
}: ColourPickerPopoverProps) {
  const scale = SIZES[size] ?? SIZES.md;
  useEscapeToClose(onClose);
  // Normalise either shape to nested Map<group, Map<subgroup, swatches>>.
  // A flat group's swatch array becomes a single ""-keyed subgroup (no header).
  const groups = new Map<string, Map<string, ColourSwatch[]>>();
  for (const [label, value] of swatchGroups) {
    groups.set(label, value instanceof Map ? value : new Map([["", value]]));
  }

  const allSwatches = Array.from(groups.values()).flatMap((subGroups) =>
    Array.from(subGroups.values()).flat()
  );
  const hasMatchingId =
    currentId != null && allSwatches.some((s) => s.id === currentId);

  const isSelected = (s: ColourSwatch) => {
    // Identity first, both for the single pick and the multi-select set;
    // colour is only consulted when the caller has no id to offer.
    if (hasMatchingId) return s.id === currentId;
    if (selectedIds?.length) return !!s.id && selectedIds.includes(s.id);
    return (
      currentColour === s.colour_hex ||
      (selectedColours?.includes(s.colour_hex) ?? false)
    );
  };

  const renderSwatch = (s: ColourSwatch) => (
    <button
      key={s.id || s.colour_hex}
      type="button"
      onClick={() => onSelect(s.colour_hex, s.id)}
      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md transition-colors hover:bg-accent ${
        isSelected(s) ? "bg-accent" : ""
      }`}
    >
      <span
        className={`${scale.dot} rounded-full border-2 shrink-0 overflow-hidden ${
          isSelected(s)
            ? "border-primary ring-1 ring-primary"
            : "border-border"
        }`}
        style={renderSwatchIcon ? undefined : { backgroundColor: s.colour_hex }}
      >
        {renderSwatchIcon?.(s)}
      </span>
      <span className={`${scale.label} text-foreground truncate`}>
        {s.colour_name || s.colour_hex}
      </span>
    </button>
  );

  return (
    <div
      className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-popover border rounded-lg shadow-lg p-3 ${scale.panel} max-w-[92vw] max-h-[80vh] overflow-y-auto`}
    >
      {groups.size > 0 &&
        Array.from(groups.entries()).map(([groupLabel, subGroups]) => (
          <div key={groupLabel} className="mb-4">
            <p className="text-sm font-bold text-foreground uppercase tracking-wider border-b border-border pb-1 mb-2">
              {groupLabel}
            </p>
            {Array.from(subGroups.entries()).map(([subLabel, swatches]) => (
              <div
                key={`${groupLabel}/${subLabel}`}
                className={subLabel ? "mb-2 ml-1 pl-2 border-l-2 border-border" : ""}
              >
                {subLabel && (
                  <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">
                    {subLabel}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-1">
                  {swatches.map(renderSwatch)}
                </div>
              </div>
            ))}
          </div>
        ))}
      {allowCustom && (
        <>
          <p className="text-sm font-bold text-foreground uppercase tracking-wider border-t border-border pt-2 mt-1 mb-2">
            Custom
          </p>
          <input
            type="color"
            defaultValue={(currentColour || defaultCustomColour).slice(0, 7)}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full h-8 rounded border cursor-pointer"
          />
        </>
      )}
    </div>
  );
}

/**
 * Escape closes the popover, when the host gave it a way to. The listener is
 * on window in the capture phase, so it runs before a Radix dialog's own
 * Escape handling (on document, capture) and can stop the event there: one
 * Escape closes the popover, the next the dialog. Focus goes back to whatever
 * had it when the popover mounted, which is its trigger.
 */
function useEscapeToClose(onClose: (() => void) | undefined) {
  const latest = React.useRef(onClose);
  latest.current = onClose;
  const enabled = !!onClose;
  React.useEffect(() => {
    if (!enabled) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !latest.current) return;
      e.preventDefault();
      e.stopPropagation();
      latest.current();
      if (opener && opener !== document.body && opener.isConnected) opener.focus();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled]);
}
