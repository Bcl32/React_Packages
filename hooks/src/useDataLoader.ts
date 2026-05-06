import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "./ApiError";
import { apiFetch } from "./apiFetch";

const fetch_data = async <T>(url: string, file_url: string): Promise<T> => {
  const res = await apiFetch(
    url + "?" + new URLSearchParams({ file_url }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  return res.json() as Promise<T>;
};

export const useDataLoader = <T = unknown>(
  url: string,
  file_url: string,
): UseQueryResult<T, ApiError> => {
  return useQuery<T, ApiError>({
    queryKey: ["useBokehChart", url, file_url],
    queryFn: () => fetch_data<T>(url, file_url),
  });
};
