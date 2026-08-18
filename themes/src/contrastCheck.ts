import Themes from "./themes.json";
import { contrastRatio, type HSLColor } from "./colorUtils";

/**
 * How many card backdrops (`surface-1 … surface-N`) every theme carries.
 *
 * **Derived from themes.json, never declared** — the same choice `LIGHT_THEMES`
 * and the preset's `darkThemes` make, and for the same reason: a hand-written
 * count is a second source of truth that drifts the moment the palette grows.
 * `scripts/seed-surface-palette.mjs` decides the number; everything else, here
 * and downstream, reads it back off the data.
 *
 * It is the count every theme has (the MINIMUM), not the union, so an index
 * below it resolves in all nine and switching theme can never land on an
 * undefined token. The consequence is deliberate: adding a theme without
 * re-running the seeder drops the count to 0 and turns backdrops off
 * everywhere, rather than breaking on that one theme only.
 */
export const SURFACE_COUNT: number = Math.min(
  ...Object.values(Themes as Record<string, Record<string, string>>).map(
    (palette) => Object.keys(palette).filter((token) => /^surface-\d+$/.test(token)).length
  )
);

/**
 * Foreground/background token pairs that render text on a surface — the
 * pairs that must stay readable when a theme is customized.
 */
export const CONTRAST_PAIRS: [bg: string, fg: string][] = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["warning", "warning-foreground"],
  ["success", "success-foreground"],
  ["muted", "muted-foreground"],
  ["sidebar-background", "sidebar-foreground"],
  ["sidebar-primary", "sidebar-primary-foreground"],
  ["sidebar-accent", "sidebar-accent-foreground"],
  // The card backdrops share ONE foreground, and that is the whole point of
  // seeding the family at a single lightness: `card-foreground` has to stay
  // readable on every member, so there is no `surface-N-foreground` to keep in
  // step. A hand-tune that drifts too dark (or too light) surfaces here rather
  // than on the page.
  ...Array.from(
    { length: SURFACE_COUNT },
    (_, i) => [`surface-${i + 1}`, "card-foreground"] as [bg: string, fg: string]
  ),
];

/** WCAG AA threshold for normal-size text. */
export const AA_NORMAL_TEXT = 4.5;

export interface ContrastIssue {
  bg: string;
  fg: string;
  ratio: number;
}

export function findContrastIssues(
  colours: Record<string, HSLColor>,
  threshold: number = AA_NORMAL_TEXT
): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  for (const [bg, fg] of CONTRAST_PAIRS) {
    const b = colours[bg];
    const f = colours[fg];
    if (!b || !f) continue;
    const ratio = contrastRatio(b, f);
    if (ratio < threshold) {
      issues.push({ bg, fg, ratio: Math.round(ratio * 10) / 10 });
    }
  }
  return issues;
}

/** Index issues by token name (both sides of each failing pair). */
export function issuesByToken(issues: ContrastIssue[]): Record<string, ContrastIssue> {
  const map: Record<string, ContrastIssue> = {};
  for (const issue of issues) {
    map[issue.bg] = issue;
    map[issue.fg] = issue;
  }
  return map;
}
