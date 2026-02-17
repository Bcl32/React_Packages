import { useQuery, UseQueryResult } from "@tanstack/react-query";

interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

interface ValidationErrorResponse {
  detail: ValidationErrorDetail[];
}

interface UseGetRequestOptions {
  queryKey?: string[];
  enabled?: boolean;
  staleTime?: number;
  responseType?: "json" | "text";
}

const getRequest = async <T>(url: string, responseType?: "json" | "text"): Promise<T> => {
  const response = await fetch(url);

  if (response.status === 422) {
    const errorResult = (await response.json()) as ValidationErrorResponse;
    throw new Error(
      "Status Code 422 - Attribute: " +
        errorResult.detail[0]["loc"][1] +
        " Message: " +
        errorResult.detail[0]["msg"]
    );
  }

  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }

  if (responseType === "text") {
    return (await response.text()) as T;
  }
  return (await response.json()) as T;
};

export const useGetRequest = <T = unknown>(
  url: string,
  options?: UseGetRequestOptions
): UseQueryResult<T, Error> => {
  return useQuery<T, Error>({
    queryKey: options?.queryKey ?? [url],
    queryFn: () => getRequest<T>(url, options?.responseType),
    enabled: options?.enabled,
    staleTime: options?.staleTime,
  });
};
