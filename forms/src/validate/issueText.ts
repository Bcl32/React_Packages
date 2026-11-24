import type { ModelAttribute } from "@bcl32/data-utils";
import { formatNumber, type UnitAdapter } from "@bcl32/data-utils/numbers";

import type { FieldIssue, FieldIssueCode, RuleSource } from "./types";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Between 1 and 5", "At least 0", "More than $0.00", "Less than 100"… */
function rangeText(attr: RuleSource | undefined, adapter: UnitAdapter | null | undefined): string | undefined {
  // formatNumber reads only the number keys (unit, format, decimals), which RuleSource shares.
  const show = (v: number) => formatNumber(v, attr as ModelAttribute | undefined, { adapter });
  const hasMin = typeof attr?.min === "number";
  const hasMax = typeof attr?.max === "number";
  if (hasMin && hasMax && !attr.min_exclusive && !attr.max_exclusive) {
    return `Between ${show(attr.min!)} and ${show(attr.max!)}`;
  }
  const parts: string[] = [];
  if (hasMin) parts.push(`${attr.min_exclusive ? "more than" : "at least"} ${show(attr.min!)}`);
  if (hasMax) parts.push(`${attr.max_exclusive ? "less than" : "at most"} ${show(attr.max!)}`);
  if (parts.length === 0) return undefined;
  const text = parts.join(" and ");
  return text[0].toUpperCase() + text.slice(1);
}

/**
 * The inline message for an issue. Number bounds are printed the way the
 * field shows its numbers (its unit adapter, money as currency), so the
 * message names what the person can type. A superset of `fieldErrorText`,
 * with the same words for the number reasons.
 *
 * It uses `Intl` (through `formatNumber`), so on a prerendered page show
 * messages only after interaction, never in the server's first render.
 */
export function issueText(
  label: string,
  issue: FieldIssue | FieldIssueCode,
  attr?: RuleSource,
  adapter?: UnitAdapter | null,
): string {
  const found = (typeof issue === "string" ? { code: issue } : issue) as FieldIssue;
  switch (found.code) {
    case "required":
      return `${label} is required`;
    case "fraction":
      return "Whole numbers only";
    case "decimals": {
      const d = typeof attr?.decimals === "number" ? attr.decimals : attr?.format === "money" ? 2 : 0;
      return d === 0 ? "Whole numbers only" : `${d} decimal place${d === 1 ? "" : "s"} at most`;
    }
    case "range":
      return rangeText(attr, adapter) ?? "Out of range";
    case "invalid":
      return "Not a number";
    case "too_short": {
      const min = "min" in found ? found.min : (attr?.min_length ?? 1);
      return `At least ${plural(min, "character")}`;
    }
    case "too_long": {
      const max = "max" in found ? found.max : (attr?.max_length ?? 0);
      return `At most ${plural(max, "character")}`;
    }
    case "pattern":
      return "Not in the expected format";
    case "charset": {
      const chars = "chars" in found ? found.chars : [];
      if (chars.length === 0) return "Contains characters that can't be used";
      return `${chars.length === 1 ? "This character" : "These characters"} can't be used: ${chars.join(" ")}`;
    }
    case "not_an_option":
      return "Choose one of the options";
    default: {
      const message = (found as { message?: unknown }).message;
      return typeof message === "string" && message ? message : "Not valid";
    }
  }
}
