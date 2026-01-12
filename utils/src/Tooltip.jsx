import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

//my custom functions
import { cn } from "./cn";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "max-w-2xl text-balance z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  )
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/*custom tootip structure different than default Tooltip that is exported for compatiblity with other components */
function CustomTooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration,
  ...props
}) {
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

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  CustomTooltip,
};
