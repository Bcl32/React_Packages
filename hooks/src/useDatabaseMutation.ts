import { useRef } from "react";
import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { buildRequestBody } from "./_buildRequestBody";
import { ApiError } from "./ApiError";
import { apiFetch } from "./apiFetch";

const post_api = async <TData, TResponse>(
  url: string,
  formData: TData,
  method: string = "POST",
): Promise<TResponse> => {
  // buildRequestBody keeps the JSON default and auto-switches to multipart
  // when formData carries any File/Blob — so AddModelForm can transparently
  // submit file-carrying DTOs too.
  const { body, headers } = buildRequestBody(formData);
  // apiFetch throws ApiError on non-OK responses with status / code / details
  // already parsed off the envelope. Any consumer can branch on
  // `mutation.error.status` or `mutation.error.code` directly.
  const res = await apiFetch(url, { method, headers, body });
  return res.json() as Promise<TResponse>;
};

// key_to_invalidate must be sent in as an array
export const useDatabaseMutation = <TData = unknown, TResponse = unknown>(
  url: string,
  formData: TData,
  key_to_invalidate: string[],
  method: "POST" | "PATCH" = "POST",
): UseMutationResult<TResponse, ApiError, void> => {
  const queryClient = useQueryClient();
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  return useMutation<TResponse, ApiError, void>({
    mutationFn: () => post_api<TData, TResponse>(url, formDataRef.current, method),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key_to_invalidate });
    },
  });
};
