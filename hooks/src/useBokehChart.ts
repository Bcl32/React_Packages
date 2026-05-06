import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "./ApiError";
import { apiFetch } from "./apiFetch";

export interface BokehChartData {
  [key: string]: unknown;
}

export interface GraphOptions {
  [key: string]: unknown;
}

const fetch_bokeh_chart = async <T = BokehChartData>(
  url: string,
  file_url: string,
  graphOptions: GraphOptions,
): Promise<T> => {
  const res = await apiFetch(
    url + "?" + new URLSearchParams({ file_url }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphOptions),
    },
  );
  return res.json() as Promise<T>;
};

export const useBokehChart = <T = BokehChartData>(
  url: string,
  file_url: string,
  graphOptions: GraphOptions,
  lazy_load_enabled = false,
  lazy_load_value: unknown = "",
): UseQueryResult<T, ApiError> => {
  let enabled_value: boolean;
  if (lazy_load_enabled === false) {
    enabled_value = true;
  } else {
    enabled_value = !!lazy_load_value;
  }

  return useQuery<T, ApiError>({
    queryKey: ["useBokehChart", url, file_url, graphOptions],
    queryFn: () => fetch_bokeh_chart<T>(url, file_url, graphOptions),
    enabled: enabled_value,
  });
};
