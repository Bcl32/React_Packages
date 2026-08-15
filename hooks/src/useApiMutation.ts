import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { buildRequestBody } from "./_buildRequestBody";
import { ApiError } from "./ApiError";
import { apiFetch } from "./apiFetch";

interface UseApiMutationOptions<TResponse = unknown, TData = unknown> {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  invalidateKeys?: string[];
  /** Hook-level error handler. Its presence also opts this mutation out of an
   * app-wide `MutationCache.onError` default toast — global handlers check
   * `mutation.options.onError` (mutate-time callbacks are invisible to them,
   * so error handling belongs here, not at the `mutate()` call). */
  onError?: (error: ApiError, variables: TData, context: unknown) => void;
  /** Runs after `invalidateKeys` invalidation (when configured). */
  onSuccess?: (data: TResponse, variables: TData, context: unknown) => void;
  /** Forwarded to TanStack `meta` — e.g. `{ silenceErrorToast: true }` for an
   * app-wide default-toast opt-out without an onError handler. */
  meta?: Record<string, unknown>;
}

const apiMutate = async <TData, TResponse>(
  url: string,
  data: TData,
  method?: string,
): Promise<TResponse> => {
  // buildRequestBody picks JSON by default; switches to multipart/form-data
  // (and drops Content-Type so the browser sets the boundary) when `data`
  // contains any File/Blob. Enables file uploads through the same hook.
  const { body, headers } = buildRequestBody(data);
  const res = await apiFetch(url, { method: method || "POST", headers, body });
  return res.json() as Promise<TResponse>;
};

export const useApiMutation = <TData = unknown, TResponse = unknown>(
  url: string,
  options?: UseApiMutationOptions<TResponse, TData>,
): UseMutationResult<TResponse, ApiError, TData> => {
  const queryClient = useQueryClient();
  return useMutation<TResponse, ApiError, TData>({
    mutationFn: (data: TData) => apiMutate<TData, TResponse>(url, data, options?.method),
    meta: options?.meta,
    onError: options?.onError,
    onSuccess: (data, variables, context) => {
      if (options?.invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: options.invalidateKeys });
      }
      options?.onSuccess?.(data, variables, context);
    },
  });
};
