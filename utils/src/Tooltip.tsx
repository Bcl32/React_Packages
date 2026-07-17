import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "./cn";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

// Portalled to <body> so overflow-hidden / transformed ancestors can't clip
// the panel. Theme tokens survive the portal because ThemeProvider sets
// data-theme on <html>, not on a nested wrapper. collisionPadding keeps the
// panel off the viewport edge (Radix flips/shifts automatically).
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, collisionPadding = 8, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      className={cn(
        "max-w-2xl text-balance z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface CustomTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
}

function CustomTooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration,
  ...props
}: CustomTooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root
        open={open}
        delayDuration={delayDuration}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      >
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipContent side="top" align="center" {...props}>
          {content}
          <TooltipPrimitive.Arrow width={11} height={5} />
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export interface ExplainerTooltipProps {
  children: React.ReactNode;
  /** Short bold heading naming the concept being explained. */
  title?: React.ReactNode;
  /** Prose explanation — what this thing means and why it matters. */
  content: React.ReactNode;
  /** Mono live-data lines (values, ids, server notes) rendered under the prose. */
  footer?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  /** Extra classes for the panel — e.g. a width override (default w-72). */
  className?: string;
}

// Explainer card on hover: layered documentation-plus-live-data popover
// (title / prose / mono footer). Same Radix behavior as CustomTooltip —
// self-contained Provider, focusable trigger, collision-aware, portalled.
function ExplainerTooltip({
  children,
  title,
  content,
  footer,
  side = "top",
  align = "center",
  delayDuration,
  className,
}: ExplainerTooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={delayDuration}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn("w-72 p-3 text-left whitespace-normal", className)}
        >
          {title && (
            <div className="mb-1 text-sm font-semibold text-popover-foreground">{title}</div>
          )}
          <div className="text-xs leading-relaxed text-muted-foreground">{content}</div>
          {footer && (
            <div className="mt-2 space-y-0.5 border-t border-border pt-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {footer}
            </div>
          )}
          <TooltipPrimitive.Arrow width={11} height={5} />
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  CustomTooltip,
  ExplainerTooltip,
};
