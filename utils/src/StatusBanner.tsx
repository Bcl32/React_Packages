import * as React from "react";
import { cn } from "./cn";

export interface StatusBannerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  show?: boolean;
  color?: string;
  dismissible?: boolean;
  storageKey?: string;
}

const StatusBanner = React.forwardRef<HTMLDivElement, StatusBannerProps>(
  (
    {
      text = "DEVELOPMENT",
      show,
      color = "bg-amber-600",
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
        className={cn(
          "fixed top-0 left-0 w-full z-[9999] flex items-center justify-center text-white text-xs font-bold py-1",
          color,
          className
        )}
        {...props}
      >
        {text}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:text-white text-sm leading-none"
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

export { StatusBanner };
