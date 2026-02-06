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

export interface BokehChartData {
  [key: string]: unknown;
}

export interface GraphOptions {
  [key: string]: unknown;
}

const fetch_bokeh_chart = async <T = BokehChartData>(
  url: string,
  file_url: string,
  graphOptions: GraphOptions
): Promise<T> => {
  const response = await fetch(
    url +
      "?" +
      new URLSearchParams({
        file_url: file_url,
      }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphOptions),
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

  return result as T;
};

export const useBokehChart = <T = BokehChartData>(
  url: string,
  file_url: string,
  graphOptions: GraphOptions,
  lazy_load_enabled = false,
  lazy_load_value: unknown = ""
): UseQueryResult<T, Error> => {
  let enabled_value: boolean;
  if (lazy_load_enabled === false) {
    enabled_value = true;
  } else {
    enabled_value = !!lazy_load_value;
  }

  return useQuery<T, Error>({
    queryKey: ["useBokehChart", url, file_url, graphOptions],
    queryFn: () => fetch_bokeh_chart<T>(url, file_url, graphOptions),
    enabled: enabled_value,
  });
};
