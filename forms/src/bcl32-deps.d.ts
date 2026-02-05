declare module "@bcl32/hooks/useDatabaseMutation" {
  import type { UseMutationResult } from "@tanstack/react-query";

  export function useDatabaseMutation<TData = unknown, TVariables = unknown>(
    url: string,
    data: TVariables,
    queryInvalidation?: string[]
  ): UseMutationResult<TData, Error, void, unknown>;
}

declare module "@bcl32/utils/Button" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
    variant?: "default" | "outline" | "ghost" | "grey" | "red" | "blue" | "danger" | "ringHover" | "shine" | "gooeyRight" | "gooeyLeft" | "linkHover1" | "linkHover2";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
  }

  export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
}

declare module "@bcl32/utils/Input" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface InputProps extends ComponentPropsWithoutRef<"input"> {
    variant?: "default" | "background";
    size?: "default" | "sm" | "lg";
  }

  export const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;
}

declare module "@bcl32/utils/Label" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface LabelProps extends ComponentPropsWithoutRef<"label"> {}

  export const Label: ForwardRefExoticComponent<LabelProps & RefAttributes<HTMLLabelElement>>;
}

declare module "@bcl32/utils/Checkbox" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<"button">, "checked" | "onCheckedChange"> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean | "indeterminate") => void;
  }

  export const Checkbox: ForwardRefExoticComponent<CheckboxProps & RefAttributes<HTMLButtonElement>>;
}

declare module "@bcl32/utils/Select" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface SelectProps extends ComponentPropsWithoutRef<"select"> {}

  export const Select: ForwardRefExoticComponent<SelectProps & RefAttributes<HTMLSelectElement>>;
}

declare module "@bcl32/utils/Tooltip" {
  import type { ReactNode } from "react";

  export interface CustomTooltipProps {
    content: ReactNode;
    children: ReactNode;
    delayDuration?: number;
  }

  export function CustomTooltip(props: CustomTooltipProps): JSX.Element;
}
