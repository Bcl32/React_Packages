import type { DateFilterValue, DatePreset } from "./types";

/**
 * Calendar-day arithmetic for `date` fields — a day with no time and no zone,
 * carried on the wire as `YYYY-MM-DD`.
 *
 * The one rule: a day is compared as a day. `new Date("2026-06-15")` reads a
 * bare date as UTC midnight, which is June 14 in the evening anywhere west of
 * Greenwich, so a date-only value never goes through it. Zero-padded ISO days
 * sort as strings in date order, which is all a range test needs; "today" is
 * the viewer's LOCAL day, asked when the rows are tested rather than when the
 * filter was built, so a page left open overnight moves with the clock.
 *
 * Internal to the package: not re-exported from the barrel.
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date's LOCAL calendar day as `YYYY-MM-DD`. */
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `day` plus `days`, as a calendar day. Built at local noon so DST never moves it. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + days, 12));
}

/** True for a well-formed `YYYY-MM-DD`. */
export function isDay(value: unknown): value is string {
  return typeof value === "string" && ISO_DAY.test(value);
}

/**
 * A cell as a calendar day, or null when it is empty or unreadable. A bare
 * day is taken as written; anything longer is an instant, and its day is the
 * local day it happened on — the same reading a person looking at the row
 * would give it.
 */
export function cellDay(cell: unknown): string | null {
  if (cell == null || cell === "") return null;
  if (isDay(cell)) return cell;
  if (typeof cell !== "string" && !(cell instanceof Date)) return null;
  const t = new Date(cell as string);
  return Number.isNaN(t.getTime()) ? null : localDay(t);
}

/**
 * The relative presets, in the order the control offers them. "Before today"
 * is deliberately not called "Overdue": the package cannot know what "done"
 * means for a row, so it says only what it tests. A page that has a done
 * column ANDs its own filter on top, which is how "overdue" is spelled.
 */
export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "past", label: "Before today" },
  { value: "today", label: "Today" },
  { value: "next7", label: "Next 7 days" },
  { value: "has", label: "Has a date" },
  { value: "none", label: "No date" },
];

export const DATE_PRESET_LABEL: Record<DatePreset, string> = Object.fromEntries(
  DATE_PRESETS.map((p) => [p.value, p.label]),
) as Record<DatePreset, string>;

export function isDatePreset(value: unknown): value is DatePreset {
  return typeof value === "string" && value in DATE_PRESET_LABEL;
}

/**
 * The test a date filter's value describes, given today's day. Null when the
 * value narrows nothing. A preset wins over a range; the control never sets
 * both, so that only decides what a hand-written value means.
 */
export function dayTest(
  value: DateFilterValue,
  today: string,
): ((day: string | null) => boolean) | null {
  switch (value.preset) {
    case "past":
      return (day) => day !== null && day < today;
    case "today":
      return (day) => day === today;
    case "next7": {
      const end = addDays(today, 7);
      return (day) => day !== null && day >= today && day <= end;
    }
    case "has":
      return (day) => day !== null;
    case "none":
      return (day) => day === null;
  }
  const from = isDay(value.from) ? value.from : "";
  const to = isDay(value.to) ? value.to : "";
  if (!from && !to) return null;
  // Both ends inclusive: "from June 15" keeps June 15.
  return (day) => day !== null && (!from || day >= from) && (!to || day <= to);
}
