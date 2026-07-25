import { contrastRatio, type HSLColor } from "./colorUtils";

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
