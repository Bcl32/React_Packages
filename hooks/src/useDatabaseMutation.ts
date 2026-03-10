import { useRef } from "react";
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

const post_api = async <TData, TResponse>(url: string, formData: TData, method: string = "POST"): Promise<TResponse> => {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

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

  if (status === 405) {
    const errorResult = result as ErrorResponse;
    throw new Error("Error(405): " + errorResult.detail);
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

// key_to_invalidate must be sent in as an array
export const useDatabaseMutation = <TData = unknown, TResponse = unknown>(
  url: string,
  formData: TData,
  key_to_invalidate: string[],
  method: "POST" | "PATCH" = "POST"
): UseMutationResult<TResponse, Error, void> => {
  const queryClient = useQueryClient();
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  return useMutation<TResponse, Error, void>({
    mutationFn: () => post_api<TData, TResponse>(url, formDataRef.current, method),
    onSuccess: () => {
      // refetch the data
      queryClient.invalidateQueries({
        queryKey: key_to_invalidate,
      });
    },
  });
};
