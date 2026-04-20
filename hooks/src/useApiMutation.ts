import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { buildRequestBody } from "./_buildRequestBody";

interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

interface ValidationErrorResponse {
  detail: ValidationErrorDetail[];
}

interface ErrorResponse {
  detail: string;
}

interface UseApiMutationOptions {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  invalidateKeys?: string[];
}

const apiMutate = async <TData, TResponse>(
  url: string,
  data: TData,
  method?: string
): Promise<TResponse> => {
  // buildRequestBody picks JSON by default; switches to multipart/form-data
  // (and drops Content-Type so the browser sets the boundary) when `data`
  // contains any File/Blob. Enables file uploads through the same hook.
  const { body, headers } = buildRequestBody(data);
  const response = await fetch(url, { method: method || "POST", headers, body });

  const status = response.status;
  let result: any;
  try {
    result = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Error(${status}): ${response.statusText}`);
    }
    throw new Error(`Failed to parse response as JSON (status ${status})`);
  }

  if (status === 422) {
    const errorResult = result as ValidationErrorResponse;
    throw new Error(
      "Status Code 422 - Attribute: " +
        errorResult.detail[0]["loc"][1] +
        " Message: " +
        errorResult.detail[0]["msg"]
    );
  }

  if (status === 400) {
    const errorResult = result as ErrorResponse;
    throw new Error("Error(400): " + errorResult.detail);
  }

  if (status === 404) {
    const errorResult = result as ErrorResponse;
    throw new Error("Status Code 404 -- Message: " + errorResult.detail);
  }

  if (status === 500) {
    const detail = result?.detail;
    const message = typeof detail === "string"
      ? detail
      : typeof detail === "object"
        ? JSON.stringify(detail)
        : "Internal Server Error";
    throw new Error(`Server Error(500): ${message}`);
  }

  if (!response.ok) {
    const detail = result?.detail;
    const message = typeof detail === "string"
      ? detail
      : typeof detail === "object"
        ? JSON.stringify(detail)
        : response.statusText;
    throw new Error(`Error(${status}): ${message}`);
  }

  return result as TResponse;
};

export const useApiMutation = <TData = unknown, TResponse = unknown>(
  url: string,
  options?: UseApiMutationOptions
): UseMutationResult<TResponse, Error, TData> => {
  const queryClient = useQueryClient();
  return useMutation<TResponse, Error, TData>({
    mutationFn: (data: TData) => apiMutate<TData, TResponse>(url, data, options?.method),
    onSuccess: options?.invalidateKeys
      ? () => queryClient.invalidateQueries({ queryKey: options.invalidateKeys })
      : undefined,
  });
};
