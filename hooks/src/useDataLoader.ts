import { useQuery, UseQueryResult } from "@tanstack/react-query";

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

const fetch_data = async <T>(url: string, file_url: string): Promise<T> => {
  const response = await fetch(
    url +
      "?" +
      new URLSearchParams({
        file_url: file_url,
      }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );

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

  if (status === 404) {
    const errorResult = result as ErrorResponse;
    throw new Error("Status Code 404 -- Message: " + errorResult.detail);
  }

  console.log(result);
  return result as T;
};

export const useDataLoader = <T = unknown>(
  url: string,
  file_url: string
): UseQueryResult<T, Error> => {
  return useQuery<T, Error>({
    queryKey: ["useBokehChart", url, file_url],
    queryFn: () => fetch_data<T>(url, file_url),
  });
};
