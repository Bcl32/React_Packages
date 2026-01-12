import { useQuery } from "@tanstack/react-query";

const fetch_bokeh_chart = async (url, file_url, graphOptions) => {
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
  if (status == 422) {
    throw new Error(
      "Status Code 422 - Attribute: " +
        result.detail[0]["loc"][1] +
        " Message: " +
        result.detail[0]["msg"]
    );
  }

  if (status == 404) {
    throw new Error("Status Code 404 -- Message: " + result.detail);
  }

  console.log(result);
  return result;
};

export const useBokehChart = (
  url,
  file_url,
  graphOptions,
  lazy_load_enabled = false,
  lazy_load_value = ""
) => {
  var enabled_value = "";
  if (lazy_load_enabled == false) {
    enabled_value = true;
  } else {
    enabled_value = !!lazy_load_value;
  }
  // console.log(
  //   url,
  //   query_data,
  //   graphOptions,
  //   lazy_load_enabled,
  //   lazy_load_value,
  //   enabled_value
  // );
  return useQuery({
    queryKey: ["useBokehChart", url, file_url, graphOptions],
    queryFn: () => fetch_bokeh_chart(url, file_url, graphOptions),
    enabled: enabled_value,
  });
};
