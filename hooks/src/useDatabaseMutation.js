import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const post_api = async (url, formData) => {
  console.log(formData);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

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

  if (status == 400) {
    throw new Error("Error(400): " + result.detail);
  }

  if (status == 404) {
    throw new Error("Status Code 404 -- Message: " + result.detail);
  }

  return result;
};

//key_to_invalidate must be sent in as an array
export const useDatabaseMutation = (url, formData, key_to_invalidate) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => post_api(url, formData),
    onSuccess: () => {
      console.log("success callback");
      // refetch the habit logs data
      queryClient.invalidateQueries({
        queryKey: key_to_invalidate,
      });
    },
  });
};
