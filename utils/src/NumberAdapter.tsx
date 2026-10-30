import * as React from "react";
// Type only: erased from the JS, so utils still installs no @bcl32 package.
// Every reader (forms, filters) depends on data-utils itself.
import type { UnitAdapter } from "@bcl32/data-utils/numbers";

/**
 * Which unit adapter a field's numbers go through, or null for none.
 *
 * A resolver rather than one adapter, so the app decides per field: a length
 * may show in inches while a count, a weight or a price never converts. Return
 * shared adapter constants from it, never a new object per call — readers
 * memoise on what it returns.
 */
export type AdapterResolver = (attr: { name: string; unit?: string }) => UnitAdapter | null;

/**
 * The resolver with no provider: every field is shown as stored. A module
 * constant, so a reader without a provider never re-renders because of it.
 */
export const NO_ADAPTER: AdapterResolver = () => null;

const NumberAdapterContext = React.createContext<AdapterResolver>(NO_ADAPTER);

export interface NumberAdapterProviderProps {
  /**
   * Build it with `useMemo` keyed on the app's unit setting, so its identity
   * changes exactly once per switch and every reader redraws in the new unit.
   */
  adapterFor: AdapterResolver;
  children: React.ReactNode;
}

/**
 * Mounted once by an app that converts units. Nothing between it and the
 * number inputs, filters and chips that read it needs to pass anything on.
 */
export function NumberAdapterProvider({ adapterFor, children }: NumberAdapterProviderProps) {
  return <NumberAdapterContext.Provider value={adapterFor}>{children}</NumberAdapterContext.Provider>;
}

/**
 * The app's resolver, or {@link NO_ADAPTER} without a provider. Never null and
 * never throws: an app that never mounts the provider renders exactly as before.
 *
 * A real hook — call it from a component body. Pure code (formatNumber,
 * parseNumber, chip text, search) takes the result as an argument instead.
 */
export function useNumberAdapter(): AdapterResolver {
  return React.useContext(NumberAdapterContext);
}
