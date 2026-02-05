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

const post_api = async <TData, TResponse>(url: string, formData: TData): Promise<TResponse> => {
  console.log(formData);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  const status = response.status;
  const result = await response.json();

  if (status === 422) {
    const errorResult = result as ValidationErrorResponse;
    console.log(errorResult);
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

// key_to_invalidate must be sent in as an array
export const useDatabaseMutation = <TData = unknown, TResponse = unknown>(
  url: string,
  formData: TData,
  key_to_invalidate: string[]
): UseMutationResult<TResponse, Error, void> => {
  const queryClient = useQueryClient();
  return useMutation<TResponse, Error, void>({
    mutationFn: () => post_api<TData, TResponse>(url, formData),
    onSuccess: () => {
      console.log("success callback");
      // refetch the data
      queryClient.invalidateQueries({
        queryKey: key_to_invalidate,
      });
    },
  });
};
