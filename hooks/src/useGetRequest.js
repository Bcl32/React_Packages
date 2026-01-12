import { useQuery } from "@tanstack/react-query";

const getRequest = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const status = response.status;
  const result = await response.json();

  if (status == 422) {
    console.log(result);
    throw new Error(
      "Status Code 422 - Attribute: " +
        result.detail[0]["loc"][1] +
        " Message: " +
        result.detail[0]["msg"]
    );
  }

  return result;
};

export const useGetRequest = (url) => {
  return useQuery({
    queryKey: [url],
    queryFn: () => getRequest(url),
  });
};
