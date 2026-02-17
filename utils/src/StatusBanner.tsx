import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const statusBannerVariants = cva(
  "fixed top-0 left-0 w-full z-[9999] flex items-center justify-center text-xs font-bold py-1",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        alert: "bg-red-600 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface StatusBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBannerVariants> {
  text?: string;
  show?: boolean;
  dismissible?: boolean;
  storageKey?: string;
}

const StatusBanner = React.forwardRef<HTMLDivElement, StatusBannerProps>(
  (
    {
      text = "DEVELOPMENT",
      show,
      variant,
      dismissible = true,
      storageKey = "status-banner-dismissed",
      className,
      ...props
    },
    ref
  ) => {
    const visible = show ?? import.meta.env.DEV;

    const [dismissed, setDismissed] = React.useState(() => {
      try {
        return sessionStorage.getItem(storageKey) === "true";
      } catch {
        return false;
      }
    });

    if (!visible || dismissed) return null;

    const handleDismiss = () => {
      try {
        sessionStorage.setItem(storageKey, "true");
      } catch {}
      setDismissed(true);
    };

    return (
      <div
        ref={ref}
        className={cn(statusBannerVariants({ variant }), className)}
        {...props}
      >
        {text}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 text-sm leading-none"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        )}
      </div>
    );
  }
);
StatusBanner.displayName = "StatusBanner";

export { StatusBanner, statusBannerVariants };
