import { isApiError } from "./ApiError";

/**
 * Shared retry policy for TanStack Query.
 *
 * Without this, every app inherits TanStack's default `retry: 3` with
 * exponential backoff — which retries deterministic 4xx answers (a 404 is
 * re-asked three times over ~7s before `isError` settles). The policy here:
 *
 *   - 4xx        → never retried. The backend gave a definitive answer;
 *                  asking again cannot change it.
 *   - request_timeout → never retried. The request already waited its full
 *                  timeout window; stacking another attempt doubles the wait
 *                  behind an unchanging spinner. Surface it and let the UI
 *                  offer a manual retry.
 *   - 5xx / network_error (status 0) → up to 2 retries with capped backoff;
 *                  these are the genuinely transient classes.
 *   - non-ApiError → one cautious retry (shouldn't happen once all fetches
 *                  go through apiFetch, but stays safe if one escapes).
 */
export const defaultShouldRetry = (
  failureCount: number,
  error: unknown,
): boolean => {
  if (failureCount >= 2) return false;
  if (isApiError(error)) {
    if (error.code === "request_timeout") return false;
    return error.status >= 500 || error.status === 0;
  }
  return failureCount < 1;
};

/** 1s, 2s, 4s… capped at 5s — errors should settle fast enough that an
 * error page appears while the user is still looking at the skeleton. */
export const defaultRetryDelay = (attempt: number): number =>
  Math.min(1000 * 2 ** attempt, 5000);

/**
 * Spread into a QueryClient's query defaults:
 *
 *   new QueryClient({
 *     defaultOptions: { queries: { staleTime, ...sharedQueryRetry } },
 *   })
 *
 * If the app later calls `queryClient.setDefaultOptions`, remember it
 * REPLACES the defaults object — spread `getDefaultOptions().queries` first.
 */
export const sharedQueryRetry = {
  retry: defaultShouldRetry,
  retryDelay: defaultRetryDelay,
} as const;
