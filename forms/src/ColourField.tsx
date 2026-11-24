import * as React from "react";
import type { ModelAttribute } from "@bcl32/data-utils";
import type { ColourSwatch } from "@bcl32/utils/ColourPickerPopover";
import type { FormData } from "./FormElement";
import { ColourFieldView } from "./ColourFieldView";
import { useGroupedSwatches } from "./useGroupedSwatches";

export { ColourFieldView } from "./ColourFieldView";
export type { ColourFieldViewProps } from "./ColourFieldView";

/**
 * FormElement's `colour` field: fetches the attribute's `colour_presets`
 * swatches and writes the pick into formData, with the swatch's id in the
 * sibling `*_ids` key (`body_colours` → `body_ids`). The drawing is
 * `ColourFieldView`; use that directly to pass swatches without a fetch.
 */
export function ColourField({
  entry_data,
  formData,
  setFormData,
  allowCustom,
  renderSwatchIcon,
}: {
  entry_data: ModelAttribute;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  /** Show the Custom colour input (default true). */
  allowCustom?: boolean;
  /** Draws each swatch's dot; passed through to the popover. */
  renderSwatchIcon?: (s: ColourSwatch) => React.ReactNode;
}) {
  const name = entry_data.name;
  const groupedSwatches = useGroupedSwatches(entry_data);
  const currentColour = (formData[name] as string) || "";

  const handleSelect = (colour: string, presetId?: string) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: colour };
      const idsKey = name.replace(/_colours?$/, "_ids");
      if (idsKey !== name) {
        next[idsKey] = presetId ? [presetId] : [null];
      }
      return next;
    });
  };

  return (
    <ColourFieldView
      attr={entry_data}
      value={currentColour}
      onSelect={handleSelect}
      swatchGroups={groupedSwatches}
      allowCustom={allowCustom}
      renderSwatchIcon={renderSwatchIcon}
    />
  );
}
