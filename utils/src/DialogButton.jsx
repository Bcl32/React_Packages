import * as DialogPrimitive from "@radix-ui/react-dialog";

import { X } from "lucide-react";

import { cva } from "class-variance-authority";
import { cn } from "./cn";

export function Dialog({
  children,
  isModal = false,
  open,
  onOpenChange,
  className,
  trigger,
  title,
  variant = "default",
  size,
}) {
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

// export function DialogButton({
//   children,
//   isModal = false,
//   open,
//   onOpenChange,
//   className,
// }) {
//   return (
//     <div className={className}>
//       <DialogPrimitive.Root
//         open={open}
//         onOpenChange={onOpenChange}
//         modal={isModal}
//       >
//         {children}
//       </DialogPrimitive.Root>
//     </div>
//   );
// }

// export function NewDialogButton({
//   children,
//   button,
//   title,
//   variant = "default",
//   isModal = false,
//   open,
//   onOpenChange,
//   className,
// }) {
//   return (
//     <div className={className}>
//       <DialogPrimitive.Root
//         open={open}
//         onOpenChange={onOpenChange}
//         modal={isModal}
//       >
//         <DialogPrimitive.Trigger asChild>{button}</DialogPrimitive.Trigger>

//         <ModalContent title={title} variant={variant}>
//           {children}
//         </ModalContent>
//       </DialogPrimitive.Root>
//     </div>
//   );
// }

export function DialogButton({ button, ...props }) {
  var Trigger = function () {
    return <DialogPrimitive.Trigger asChild>{button}</DialogPrimitive.Trigger>;
  };

  return <Dialog {...props} trigger={<Trigger />}></Dialog>;
}

function ModalContent({
  title,
  children,
  description,
  className,
  variant,
  size,
  ...props
}) {
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
