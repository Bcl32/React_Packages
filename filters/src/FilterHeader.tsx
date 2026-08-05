import * as React from "react";
import { X } from "lucide-react";

interface FilterHeaderProps {
  /** Already-resolved label — schema `title`, or a humanized field name. */
  label: string;
  /**
   * The filter's comparison mode, rendered as a small pill next to the label
   * (Equals/Contains, Any/All). Omitted for filters that have only one mode.
   */
  rule?: {
    text: string;
    onToggle: () => void;
    title?: string;
  };
  /** Right-aligned controls (Reset, Shortcuts …), placed before the ✕. */
  actions?: React.ReactNode;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
}

/**
 * One row of chrome shared by every filter card.
 *
 * Each filter used to style its own label and buttons, which drifted: three
 * different label sizes and two different ✕ paddings across four components,
 * and a full 24px line of text above every control. Sizing it once here keeps
 * the grid's rows even and buys back most of the panel's height — the label is
 * a caption, not body copy, so it reads at `text-[11px]` uppercase and the
 * whole row fits in 16px.
 */
export function FilterHeader({ label, rule, actions, onRemove }: FilterHeaderProps): JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-1">
      <span
        className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
        title={label}
      >
        {label}
      </span>

      {rule && (
        <button
          type="button"
          onClick={rule.onToggle}
          title={rule.title}
          className="shrink-0 rounded border border-primary/40 px-1 text-[10px] leading-4 text-primary transition-colors hover:border-primary"
        >
          {rule.text}
        </button>
      )}

      {(actions || onRemove) && (
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {actions}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              title={`Remove ${label} filter`}
              aria-label={`Remove ${label} filter`}
            >
              <X size={12} />
            </button>
          )}
        </span>
      )}
    </div>
  );
}
