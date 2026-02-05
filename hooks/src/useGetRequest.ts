import { useQuery, UseQueryResult } from "@tanstack/react-query";

interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

interface ValidationErrorResponse {
  detail: ValidationErrorDetail[];
}

const getRequest = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

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

  return result as T;
};

export const useGetRequest = <T = unknown>(url: string): UseQueryResult<T, Error> => {
  return useQuery<T, Error>({
    queryKey: [url],
    queryFn: () => getRequest<T>(url),
  });
};
