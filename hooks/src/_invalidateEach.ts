import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate each url in `keys` as its own query key.
 *
 * Every `query_invalidation` / `invalidateKeys` list in the packages is a LIST
 * of read urls, and `useGetRequest` caches each read under `[url]`. Handing the
 * whole array to `invalidateQueries` as ONE key turned `[a, b]` into a prefix
 * that matches no query at all, so any caller naming two lists refreshed
 * neither (Home-Helper's Money table, Print-Tracker's Power page).
 *
 * An empty list keeps its old meaning: `queryKey: []` matches every query.
 * Callers that pass nothing (the toolbar defaults to `[]`) rely on that.
 */
export function invalidateEach(queryClient: QueryClient, keys: readonly string[]): void {
  if (keys.length === 0) {
    queryClient.invalidateQueries({ queryKey: [] });
    return;
  }
  for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] });
}
