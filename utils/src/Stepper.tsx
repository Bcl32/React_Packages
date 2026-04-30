import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Check, Lock } from "lucide-react";
import { cn } from "./cn";

export interface StepperStep {
  value: string;
  label: React.ReactNode;
  /**
   * When true, the step is locked — not clickable, rendered with a
   * lock icon. Parent sets this from its own prerequisite checks
   * (e.g. `disabled: !file` before the user has uploaded anything).
   */
  disabled?: boolean;
}

interface StepperContextValue {
  value: string;
  setValue: (next: string) => void;
  steps: StepperStep[];
  activeIndex: number;
}

const StepperContext = React.createContext<StepperContextValue | null>(null);

function useStepperContext(hook: string): StepperContextValue {
  const ctx = React.useContext(StepperContext);
  if (!ctx) {
    throw new Error(`${hook} must be used inside <Stepper>`);
  }
  return ctx;
}

/**
 * Hook exposing stepper state + navigation helpers. Use it from the
 * parent to wire up "Continue"/"Back" buttons without threading state
 * through props.
 */
export function useStepper() {
  const ctx = useStepperContext("useStepper");
  const { value, setValue, steps, activeIndex } = ctx;

  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= steps.length - 1;

  const next = React.useCallback(() => {
    // Skip over locked steps; land on the nearest enabled one.
    for (let i = activeIndex + 1; i < steps.length; i += 1) {
      if (!steps[i]?.disabled) {
        setValue(steps[i].value);
        return;
      }
    }
  }, [activeIndex, steps, setValue]);

  const previous = React.useCallback(() => {
    for (let i = activeIndex - 1; i >= 0; i -= 1) {
      if (!steps[i]?.disabled) {
        setValue(steps[i].value);
        return;
      }
    }
  }, [activeIndex, steps, setValue]);

  const canAdvance = React.useMemo(() => {
    for (let i = activeIndex + 1; i < steps.length; i += 1) {
      if (!steps[i]?.disabled) return true;
    }
    return false;
  }, [activeIndex, steps]);

  return {
    value,
    setValue,
    steps,
    activeIndex,
    isFirst,
    isLast,
    next,
    previous,
    canAdvance,
  };
}

export interface StepperProps extends React.ComponentPropsWithoutRef<"div"> {
  value: string;
  onValueChange: (next: string) => void;
  steps: StepperStep[];
}

/**
 * Controlled multi-step container. Parent owns `value` and `steps`;
 * the component renders a horizontal progress header followed by the
 * content panels (pass `<StepperContent value="…">` children).
 *
 * This is intentionally a stepper, not a tablist — the marker pattern
 * is "completed / active / upcoming / locked" and the header is an
 * `<ol>` with `aria-current="step"`, matching the ARIA APG wizard
 * pattern rather than the tabs pattern.
 */
export const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ value, onValueChange, steps, className, children, ...props }, ref) => {
    const activeIndex = steps.findIndex((s) => s.value === value);
    const ctx = React.useMemo<StepperContextValue>(
      () => ({ value, setValue: onValueChange, steps, activeIndex }),
      [value, onValueChange, steps, activeIndex],
    );

    return (
      <StepperContext.Provider value={ctx}>
        <div ref={ref} className={cn("space-y-4", className)} {...props}>
          <StepperHeader />
          {children}
        </div>
      </StepperContext.Provider>
    );
  },
);
Stepper.displayName = "Stepper";

/**
 * The horizontal progress header. Rendered automatically by
 * <Stepper>; exported so consumers can override placement (e.g. stick
 * it in a sidebar instead of above the content).
 */
export const StepperHeader = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<"ol">
>(({ className, ...props }, ref) => {
  const { steps, value, setValue, activeIndex } = useStepperContext("StepperHeader");

  return (
    <ol
      ref={ref}
      className={cn("flex items-center gap-0", className)}
      {...props}
    >
      {steps.map((step, i) => {
        const isActive = step.value === value;
        const isComplete = i < activeIndex;
        const isLocked = !!step.disabled;
        const isLast = i === steps.length - 1;
        const isClickable = !isLocked && !isActive;

        // Indicator content: check for complete, lock for disabled,
        // otherwise the 1-based step number.
        let indicator: React.ReactNode;
        if (isComplete) {
          indicator = <Check className="h-4 w-4" strokeWidth={3} />;
        } else if (isLocked) {
          indicator = <Lock className="h-3.5 w-3.5" />;
        } else {
          indicator = <span>{i + 1}</span>;
        }

        return (
          <li
            key={step.value}
            aria-current={isActive ? "step" : undefined}
            aria-disabled={isLocked || undefined}
            className={cn(
              "flex items-center",
              !isLast && "flex-1",
            )}
          >
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && setValue(step.value)}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-1 text-sm",
                "transition-colors",
                isClickable && "hover:bg-accent cursor-pointer",
                !isClickable && "cursor-default",
                isLocked && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isActive &&
                    "border-primary bg-primary text-primary-foreground ring-2 ring-primary/30",
                  isComplete && "border-primary bg-primary/15 text-primary",
                  !isActive && !isComplete && !isLocked &&
                    "border-border bg-background text-muted-foreground",
                  isLocked && "border-border bg-muted text-muted-foreground",
                )}
              >
                {indicator}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap",
                  isActive && "font-semibold text-foreground",
                  !isActive && !isLocked && "text-muted-foreground group-hover:text-foreground",
                  isLocked && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-2 h-px flex-1 transition-colors",
                  i < activeIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
});
StepperHeader.displayName = "StepperHeader";

export interface StepperContentProps extends React.ComponentPropsWithoutRef<"div"> {
  value: string;
  /**
   * Keep the content mounted when inactive (hidden via CSS). Useful
   * when panels own expensive state (e.g. a file picker) that
   * shouldn't be torn down on every step. Defaults to false — inactive
   * panels don't render at all.
   */
  keepMounted?: boolean;
}

export const StepperContent = React.forwardRef<HTMLDivElement, StepperContentProps>(
  ({ value, keepMounted = false, className, hidden, ...props }, ref) => {
    const ctx = useStepperContext("StepperContent");
    const isActive = ctx.value === value;

    if (!isActive && !keepMounted) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        hidden={!isActive || hidden}
        className={cn(!isActive && "hidden", className)}
        {...props}
      />
    );
  },
);
StepperContent.displayName = "StepperContent";

// -----------------------------------------------------------------------
// Convenience button components — thin wrappers around useStepper() so
// callers don't have to re-derive the same next/previous logic at every
// use site.
// -----------------------------------------------------------------------

export interface StepperNavButtonProps
  extends React.ComponentPropsWithoutRef<"button"> {
  /**
   * Render-as-child via Radix Slot — hand off the click/disabled props
   * to any custom element (e.g. a themed Button from @bcl32/utils).
   */
  asChild?: boolean;
}

export const StepperNext = React.forwardRef<HTMLButtonElement, StepperNavButtonProps>(
  ({ asChild, onClick, disabled, children, ...props }, ref) => {
    const { next, canAdvance } = useStepper();
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        disabled={disabled || !canAdvance}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(e);
          if (!e.defaultPrevented) next();
        }}
        {...props}
      >
        {children ?? "Continue"}
      </Comp>
    );
  },
);
StepperNext.displayName = "StepperNext";

export const StepperPrevious = React.forwardRef<HTMLButtonElement, StepperNavButtonProps>(
  ({ asChild, onClick, disabled, children, ...props }, ref) => {
    const { previous, isFirst } = useStepper();
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        disabled={disabled || isFirst}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(e);
          if (!e.defaultPrevented) previous();
        }}
        {...props}
      >
        {children ?? "Back"}
      </Comp>
    );
  },
);
StepperPrevious.displayName = "StepperPrevious";
