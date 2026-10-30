import type { UnitAdapter } from "@bcl32/data-utils/numbers";
import type { AdapterResolver } from "@bcl32/utils/NumberAdapter";

/**
 * A field's unit adapter: what the app's resolver says for this attribute, or
 * null with no resolver or no attribute (a filter built before R4 carried one).
 *
 * Internal to the package: not re-exported from the barrel.
 */
export function adapterOf(
  adapterFor: AdapterResolver | undefined,
  attr: { name: string; unit?: string } | undefined,
): UnitAdapter | null {
  return adapterFor && attr ? adapterFor(attr) : null;
}
