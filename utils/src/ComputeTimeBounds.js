import dayjs from "dayjs";

export function ComputeTimeBounds(data, feature_name) {
  if (data.length == 0) {
    return [
      dayjs().format("MMM, D YYYY - h:mma"),
      dayjs().format("MMM, D YYYY - h:mma"),
    ];
  }

  var earliest_datetime = data.reduce(
    (min, p) => (dayjs(p[feature_name]) < dayjs(min) ? p[feature_name] : min),
    data[0][feature_name]
  );

  var latest_datetime = data.reduce(
    (max, p) => (dayjs(p[feature_name]) > dayjs(max) ? p[feature_name] : max),
    data[0][feature_name]
  );

  return [earliest_datetime, latest_datetime];
}
