import type { ModelAttribute } from "@bcl32/data-utils";

/**
 * The label shown above a form input.
 *
 * Prefers the schema-provided `title`, which the API humanizes properly
 * ("Volume (mm³)", "Source 3MF filename", "Object ID"). The fallback only
 * applies to hand-built attributes with no title, and mirrors what the filter
 * components do for the same case.
 *
 * This used to be inlined as `name[0].toUpperCase() + name.slice(1)` at a dozen
 * call sites — half of them without the underscore replacement, which is how
 * "Sub_type:" and "Vendor id:" ended up in the same dialog.
 */
export function fieldLabel(attr: ModelAttribute): string {
  const title = (attr as { title?: string }).title;
  if (title) return title;

  const name = attr.name ?? "";
  if (!name) return "";
  const spaced = name.replace(/_/g, " ");
  return spaced[0].toUpperCase() + spaced.slice(1);
}
