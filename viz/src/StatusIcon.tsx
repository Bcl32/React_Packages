// The icon half of every status cue. A status colour never carries meaning on
// its own: wherever a tone is drawn, its icon and a text label are drawn
// beside it, so the state survives colour-blindness, grayscale print and
// forced-colors. Inline SVG (lucide geometry) so the package needs no icon
// dependency of its own.

import type { ReactNode, SVGProps } from "react";

import { statusColor, type StatusTone } from "./palette";

export const STATUS_LABEL: Record<StatusTone, string> = {
  good: "Good",
  warning: "Warning",
  serious: "Serious",
  critical: "Critical",
};

const PATHS: Record<StatusTone, JSX.Element> = {
  // circle-check
  good: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  // triangle-alert
  warning: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  // circle-alert
  serious: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
  // octagon-x
  critical: (
    <>
      <path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </>
  ),
};

export interface StatusIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  tone: StatusTone;
  size?: number;
  /** Paint the stroke in the tone's colour (default) or inherit `currentColor`. */
  colored?: boolean;
}

/** The tone's icon. Decorative (`aria-hidden`): the label beside it is the text. */
export function StatusIcon({ tone, size = 14, colored = true, style, ...rest }: StatusIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-tone={tone}
      style={{ flexShrink: 0, ...(colored ? { color: statusColor(tone) } : null), ...style }}
      {...rest}
    >
      {PATHS[tone]}
    </svg>
  );
}

/** Icon + label, the only way a status tone is ever shown. */
export function StatusLabel({ tone, children, className }: { tone: StatusTone; children?: ReactNode; className?: string }) {
  return (
    <span className={["inline-flex items-center gap-1", className].filter(Boolean).join(" ")}>
      <StatusIcon tone={tone} />
      <span>{children ?? STATUS_LABEL[tone]}</span>
    </span>
  );
}
