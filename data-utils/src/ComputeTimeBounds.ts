import dayjs from "dayjs";

type DataEntry = Record<string, unknown>;

export function ComputeTimeBounds(data: DataEntry[], feature_name: string): [string, string] {
  // Filter out entries where the datetime value is null or undefined
  const validData = data.filter(entry => entry && entry[feature_name] != null);

  if (validData.length === 0) {
    return [
      dayjs().format("MMM, D YYYY - h:mma"),
      dayjs().format("MMM, D YYYY - h:mma"),
    ];
  }

  const earliest_datetime = validData.reduce(
    (min, p) => (dayjs(p[feature_name] as string).isBefore(dayjs(min)) ? p[feature_name] as string : min),
    validData[0][feature_name] as string
  );

  const latest_datetime = validData.reduce(
    (max, p) => (dayjs(p[feature_name] as string).isAfter(dayjs(max)) ? p[feature_name] as string : max),
    validData[0][feature_name] as string
  );

  return [earliest_datetime, latest_datetime];
}
