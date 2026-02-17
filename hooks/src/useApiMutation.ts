import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";

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
  const response = await fetch(url, {
    method: method || "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const status = response.status;
  const result = await response.json();

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
