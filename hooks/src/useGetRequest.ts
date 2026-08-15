import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "./ApiError";
import { apiFetch } from "./apiFetch";

interface UseGetRequestOptions {
  queryKey?: string[];
  enabled?: boolean;
  staleTime?: number;
  responseType?: "json" | "text";
  /** Per-request timeout in ms; `null` disables. Defaults to 30s — a GET
   * that outlives that is treated as hung and surfaces as
   * `ApiError{status: 0, code: "request_timeout"}` instead of an eternal
   * pending state. Raise it for known-slow reads (large meshes, exports). */
  timeoutMs?: number | null;
}

const DEFAULT_GET_TIMEOUT_MS = 30_000;

const getRequest = async <T>(
  url: string,
  responseType?: "json" | "text",
  timeoutMs?: number | null,
): Promise<T> => {
  const res = await apiFetch(url, {
    timeoutMs: timeoutMs === undefined ? DEFAULT_GET_TIMEOUT_MS : timeoutMs,
  });
  if (responseType === "text") {
    return (await res.text()) as T;
  }
  return (await res.json()) as T;
};

export const useGetRequest = <T = unknown>(
  url: string,
  options?: UseGetRequestOptions,
): UseQueryResult<T, ApiError> => {
  return useQuery<T, ApiError>({
    queryKey: options?.queryKey ?? [url],
    queryFn: () => getRequest<T>(url, options?.responseType, options?.timeoutMs),
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
};
