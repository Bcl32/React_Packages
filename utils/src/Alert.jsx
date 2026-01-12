import * as React from "react";

const Alert = React.forwardRef(({ className = "", children, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={`relative w-full rounded-lg border p-4 ${className}`}
    {...props}
  >
    {children}
  </div>
));
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef(({ className = "", children, ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
    {...props}
  >
    {children}
  </div>
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };
