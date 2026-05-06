import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { buildRequestBody } from "./_buildRequestBody";
import { ApiError } from "./ApiError";
import { apiFetch } from "./apiFetch";

interface UseApiMutationOptions {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  invalidateKeys?: string[];
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
  options?: UseApiMutationOptions,
): UseMutationResult<TResponse, ApiError, TData> => {
  const queryClient = useQueryClient();
  return useMutation<TResponse, ApiError, TData>({
    mutationFn: (data: TData) => apiMutate<TData, TResponse>(url, data, options?.method),
    onSuccess: options?.invalidateKeys
      ? () => queryClient.invalidateQueries({ queryKey: options.invalidateKeys })
      : undefined,
  });
};
