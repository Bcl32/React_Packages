import { useQuery } from "@tanstack/react-query";

const fetch_data = async (url, file_url) => {
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

export const useDataLoader = (url, file_url) => {
  return useQuery({
    queryKey: ["useBokehChart", url, file_url],
    queryFn: () => fetch_data(url, file_url),
  });
};
