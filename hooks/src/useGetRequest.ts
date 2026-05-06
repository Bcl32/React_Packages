import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "./ApiError";
import { apiFetch } from "./apiFetch";

interface UseGetRequestOptions {
  queryKey?: string[];
  enabled?: boolean;
  staleTime?: number;
  responseType?: "json" | "text";
}

const getRequest = async <T>(
  url: string,
  responseType?: "json" | "text",
): Promise<T> => {
  const res = await apiFetch(url);
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
    queryFn: () => getRequest<T>(url, options?.responseType),
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
};
