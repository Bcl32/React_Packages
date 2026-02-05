import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const contentVariants = cva(
  "-translate-x-1/2 -translate-y-1/2 z-50 rounded-md p-8 text-gray-900 shadow data-[state=closed]:animate-[dialog-content-hide_200ms] data-[state=open]:animate-[dialog-content-show_200ms]",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        grey: "bg-gray-200 text-gray-800",
        red: "bg-red-200 text-red-800",
        danger: "bg-red-700 text-white",
      },
      size: {
        default: "fixed left-1/2 top-1/2 w-full max-w-md",
        big: "fixed left-1/2 top-1/2 w-full max-w-screen-2xl h-full max-h-[1000px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ModalContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title">,
    VariantProps<typeof contentVariants> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

function ModalContent({
  title,
  children,
  description,
  className,
  variant,
  size,
  ...props
}: ModalContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-[dialog-overlay-hide_200ms] data-[state=open]:animate-[dialog-overlay-show_200ms]" />
      <DialogPrimitive.Content
        className={cn(contentVariants({ variant, size }), className)}
        {...props}
      >
        <DialogPrimitive.DialogDescription>
          {description}
        </DialogPrimitive.DialogDescription>
        <div className="flex items-center justify-between mb-6">
          <DialogPrimitive.Title className="text-xl">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close className="text-foreground hover:text-accent">
            <X />
          </DialogPrimitive.Close>
        </div>

        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

interface SimpleDialogProps extends VariantProps<typeof contentVariants> {
  children?: React.ReactNode;
  isModal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
}

function SimpleDialog({
  children,
  isModal = false,
  open,
  onOpenChange,
  className,
  trigger,
  title,
  variant = "default",
  size,
}: SimpleDialogProps) {
  return (
    <div className={className}>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        modal={isModal}
      >
        {trigger}

        <ModalContent title={title} variant={variant} size={size}>
          {children}
        </ModalContent>
      </DialogPrimitive.Root>
    </div>
  );
}

interface DialogButtonProps extends Omit<SimpleDialogProps, "trigger"> {
  button: React.ReactNode;
}

export { SimpleDialog };

export function DialogButton({ button, ...props }: DialogButtonProps) {
  const Trigger = function () {
    return <DialogPrimitive.Trigger asChild>{button}</DialogPrimitive.Trigger>;
  };

  return <SimpleDialog {...props} trigger={<Trigger />} />;
}
