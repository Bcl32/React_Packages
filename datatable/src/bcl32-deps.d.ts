declare module "@bcl32/utils/cn" {
  import type { ClassValue } from "clsx";
  export function cn(...inputs: ClassValue[]): string;
}

declare module "@bcl32/utils/Dropdown" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes, ReactNode } from "react";

  export const DropdownMenu: ForwardRefExoticComponent<{
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
  } & RefAttributes<HTMLDivElement>>;

  export const DropdownMenuTrigger: ForwardRefExoticComponent<
    ComponentPropsWithoutRef<"button"> & { asChild?: boolean } & RefAttributes<HTMLButtonElement>
  >;

  export const DropdownMenuContent: ForwardRefExoticComponent<
    ComponentPropsWithoutRef<"div"> & {
      align?: "start" | "center" | "end";
      hidden?: boolean;
      onCloseAutoFocus?: (event: Event) => void;
    } & RefAttributes<HTMLDivElement>
  >;

  export const DropdownMenuItem: ForwardRefExoticComponent<
    ComponentPropsWithoutRef<"div"> & { onSelect?: (event: Event) => void } & RefAttributes<HTMLDivElement>
  >;

  export const DropdownMenuLabel: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div"> & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuSeparator: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div"> & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuGroup: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div"> & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuCheckboxItem: ForwardRefExoticComponent<
    ComponentPropsWithoutRef<"div"> & {
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
    } & RefAttributes<HTMLDivElement>
  >;
  export const DropdownMenuRadioGroup: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div"> & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuRadioItem: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div"> & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuShortcut: ForwardRefExoticComponent<ComponentPropsWithoutRef<"span"> & RefAttributes<HTMLSpanElement>>;
  export const DropdownMenuSub: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div"> & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuSubContent: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div"> & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuSubTrigger: ForwardRefExoticComponent<ComponentPropsWithoutRef<"div"> & RefAttributes<HTMLDivElement>>;
}

declare module "@bcl32/utils/Button" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
    variant?: "default" | "outline" | "ghost" | "grey" | "red" | "blue" | "danger" | "ringHover" | "shine" | null;
    size?: "default" | "sm" | "lg" | "icon" | null;
    asChild?: boolean;
  }
  export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
}

declare module "@bcl32/utils/Input" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface InputProps extends ComponentPropsWithoutRef<"input"> {
    variant?: "default" | "background" | null;
    inputSize?: "default" | "sm" | "lg" | null;
  }
  export const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;
}

declare module "@bcl32/utils/Checkbox" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<"button">, "checked" | "onCheckedChange"> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean | "indeterminate") => void;
  }
  export const Checkbox: ForwardRefExoticComponent<CheckboxProps & RefAttributes<HTMLButtonElement>>;
}

declare module "@bcl32/utils/DialogButton" {
  import type { ReactNode } from "react";

  export interface DialogButtonProps {
    button: ReactNode;
    children: ReactNode;
    size?: "default" | "big";
    title?: string;
    variant?: string;
    className?: string;
    isModal?: boolean;
    onSelect?: () => void;
    onOpenChange?: (open: boolean) => void;
  }
  export function DialogButton(props: DialogButtonProps): JSX.Element;
}

declare module "@bcl32/utils/StringFunctions" {
  export function Capitalize(str: string): string;
  export function Truncate(str: string, length: number): string;
}

declare module "@bcl32/utils/dayjs_sorter" {
  import type { Row } from "@tanstack/react-table";
  export function dayjs_sorter<T>(rowA: Row<T>, rowB: Row<T>, columnId: string): number;
}

declare module "@bcl32/hooks/useDatabaseMutation" {
  import type { UseMutationResult } from "@tanstack/react-query";

  export interface MutationPayload {
    url: string;
    data?: unknown;
  }

  export function useDatabaseMutation(): UseMutationResult<unknown, Error, MutationPayload>;
}

declare module "@bcl32/forms/AddModelForm" {
  export interface ModelData {
    model_name: string;
    model_attributes: unknown[];
    add_api_url?: string;
    delete_api_url?: string;
    [key: string]: unknown;
  }

  export interface AddModelFormProps {
    add_api_url: string;
    ModelData: ModelData;
    query_invalidation: string[];
  }
  export function AddModelForm(props: AddModelFormProps): JSX.Element;
}

declare module "@bcl32/forms/EditModelForm" {
  import type { ModelData } from "@bcl32/forms/AddModelForm";

  export interface EditModelFormProps {
    add_api_url: string;
    ModelData: ModelData;
    query_invalidation: string[];
    obj_data: Record<string, unknown>;
    create_enabled?: boolean;
  }
  export function EditModelForm(props: EditModelFormProps): JSX.Element;
}

declare module "@bcl32/forms/DeleteModelForm" {
  export interface DeleteModelFormProps {
    delete_api_url: string;
    query_invalidation: string[];
    rowSelection: Record<string, boolean>;
    setRowSelection: (selection: Record<string, boolean>) => void;
  }
  export function DeleteModelForm(props: DeleteModelFormProps): JSX.Element;
}

declare module "@bcl32/datatable/RowActions" {
  import type { Row } from "@tanstack/react-table";
  import type { ModelData } from "@bcl32/forms/AddModelForm";

  export interface RowActionsProps<T> {
    row: Row<T>;
    ModelData: ModelData;
    query_invalidation: string[];
  }
  export function RowActions<T>(props: RowActionsProps<T>): JSX.Element;
}
