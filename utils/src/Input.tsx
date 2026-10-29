import * as React from "react";
import { cn } from "./cn";
import { cva, type VariantProps } from "class-variance-authority";

const inputVariants = cva(
  "flex w-full rounded-md border border-input text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-[invalid=true]:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        background: "bg-background",
      },
      size: {
        default: "h-10 px-3 py-2",
        sm: "h-8 px-2 py-1",
        lg: "h-12 px-3 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// The box an affixed input draws instead of its own border: the same variant
// and size keys as `inputVariants`, so `size="sm"` is the same height either
// way. It reads focus, disabled and invalid off the inner input with `has-[]`
// (Tailwind 3.4). Disabled is scoped to the INPUT, so a disabled clear button
// in a suffix does not dim the whole box.
const boxVariants = cva(
  "flex w-full items-center rounded-md border border-input text-base ring-offset-background md:text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50 has-[[aria-invalid=true]]:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        background: "bg-background",
      },
      size: {
        default: "h-10 px-3 gap-2",
        sm: "h-8 px-2 gap-1.5",
        lg: "h-12 px-3 gap-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// The input inside the box: no border, padding, background or ring of its own
// (`border-0 focus:ring-0` also cancels @tailwindcss/forms' blue focus ring).
const innerInputClass =
  "min-w-0 flex-1 border-0 p-0 bg-transparent shadow-none text-base md:text-sm focus:ring-0 focus:outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed";

// What a mouse-down may land on without focus moving to the input.
const INTERACTIVE = "button, select, a, input, textarea, [role=button]";

export interface InputProps
  // React declares `prefix?: string` on every element (an RDFa attribute), so
  // it is omitted here to be redeclared as a slot.
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "prefix">,
    VariantProps<typeof inputVariants> {
  /**
   * Drawn inside the border, before the text. A string or number is muted
   * text whose id joins `aria-describedby` ("$", "cm"); an element renders as
   * given (an icon should carry `aria-hidden`, a button its own `aria-label`).
   */
  prefix?: React.ReactNode;
  /** Drawn inside the border, after the text. Same rules as `prefix`. */
  suffix?: React.ReactNode;
  /**
   * Classes for the `<input>` itself. With an affix, `className` styles the
   * box (width, margin) and this the text inside it; with none, it is merged
   * after `className` onto the one element.
   */
  inputClassName?: string;
}

function present(node: React.ReactNode): boolean {
  return node !== null && node !== undefined && node !== false && node !== "";
}

function isText(node: React.ReactNode): node is string | number {
  return typeof node === "string" || typeof node === "number";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, inputClassName, type, variant, size, prefix, suffix, ...props },
    ref
  ) => {
    const prefixId = React.useId();
    const suffixId = React.useId();
    const inner = React.useRef<HTMLInputElement | null>(null);
    const setRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    if (!present(prefix) && !present(suffix)) {
      return (
        <input
          type={type}
          className={cn(inputVariants({ variant, size }), className, inputClassName)}
          ref={ref}
          {...props}
        />
      );
    }

    const affix = (node: React.ReactNode, id: string) => {
      if (!present(node)) return null;
      if (!isText(node)) return node;
      return (
        <span id={id} className="shrink-0 text-muted-foreground select-none">
          {node}
        </span>
      );
    };

    const describedBy =
      [
        props["aria-describedby"],
        isText(prefix) && present(prefix) ? prefixId : null,
        isText(suffix) && present(suffix) ? suffixId : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined;

    // A click on the box or a text/icon affix puts the caret in the input,
    // as a click inside a bare input would. A control in a slot keeps its
    // own click, and focus is only redirected (never just swallowed).
    const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
      const input = inner.current;
      const target = event.target as Element;
      if (!input || input.disabled || target === input) return;
      const control = target.closest(INTERACTIVE);
      if (control && event.currentTarget.contains(control)) return;
      event.preventDefault();
      input.focus();
    };

    return (
      <div className={cn(boxVariants({ variant, size }), className)} onMouseDown={onMouseDown}>
        {affix(prefix, prefixId)}
        <input
          type={type}
          className={cn(innerInputClass, inputClassName)}
          ref={setRef}
          {...props}
          aria-describedby={describedBy}
        />
        {affix(suffix, suffixId)}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
