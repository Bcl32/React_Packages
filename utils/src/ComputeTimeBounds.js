import dayjs from "dayjs";

export function ComputeTimeBounds(data, feature_name) {
  // Filter out entries where the datetime value is null or undefined
  const validData = data.filter(entry => entry && entry[feature_name] != null);

  if (validData.length == 0) {
    return [
      dayjs().format("MMM, D YYYY - h:mma"),
      dayjs().format("MMM, D YYYY - h:mma"),
    ];
  }

  var earliest_datetime = validData.reduce(
    (min, p) => (dayjs(p[feature_name]) < dayjs(min) ? p[feature_name] : min),
    validData[0][feature_name]
  );

  var latest_datetime = validData.reduce(
    (max, p) => (dayjs(p[feature_name]) > dayjs(max) ? p[feature_name] : max),
    validData[0][feature_name]
  );

  return [earliest_datetime, latest_datetime];
}
