/**
 * Temporary type declarations for @bcl32/utils
 * Remove this file once @bcl32/utils is migrated to TypeScript
 */

// Button
declare module "@bcl32/utils/Button" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
    variant?: "default" | "outline" | "ghost" | "grey" | "red" | "blue" | "danger" | "ringHover" | "shine" | "gooeyRight" | "gooeyLeft" | "linkHover1" | "linkHover2";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
  }
  export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
}

// Card
declare module "@bcl32/utils/Card" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface CardProps extends ComponentPropsWithoutRef<"div"> {}
  export interface CardHeaderProps extends ComponentPropsWithoutRef<"div"> {}
  export interface CardTitleProps extends ComponentPropsWithoutRef<"h3"> {}
  export interface CardDescriptionProps extends ComponentPropsWithoutRef<"p"> {}
  export interface CardContentProps extends ComponentPropsWithoutRef<"div"> {}
  export interface CardFooterProps extends ComponentPropsWithoutRef<"div"> {}

  export const Card: ForwardRefExoticComponent<CardProps & RefAttributes<HTMLDivElement>>;
  export const CardHeader: ForwardRefExoticComponent<CardHeaderProps & RefAttributes<HTMLDivElement>>;
  export const CardTitle: ForwardRefExoticComponent<CardTitleProps & RefAttributes<HTMLHeadingElement>>;
  export const CardDescription: ForwardRefExoticComponent<CardDescriptionProps & RefAttributes<HTMLParagraphElement>>;
  export const CardContent: ForwardRefExoticComponent<CardContentProps & RefAttributes<HTMLDivElement>>;
  export const CardFooter: ForwardRefExoticComponent<CardFooterProps & RefAttributes<HTMLDivElement>>;
}

// Input
declare module "@bcl32/utils/Input" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface InputProps extends ComponentPropsWithoutRef<"input"> {}
  export const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;
}

// Label
declare module "@bcl32/utils/Label" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface LabelProps extends ComponentPropsWithoutRef<"label"> {}
  export const Label: ForwardRefExoticComponent<LabelProps & RefAttributes<HTMLLabelElement>>;
}

// Slider
declare module "@bcl32/utils/Slider" {
  import type { ForwardRefExoticComponent, RefAttributes, CSSProperties } from "react";

  export interface SliderProps {
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    className?: string;
    style?: CSSProperties;
  }
  export const Slider: ForwardRefExoticComponent<SliderProps & RefAttributes<HTMLSpanElement>>;
}

// cn utility
declare module "@bcl32/utils/cn" {
  export function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]): string;
}

// DialogButton
declare module "@bcl32/utils/DialogButton" {
  import type { ReactNode } from "react";

  export interface DialogButtonProps {
    children?: ReactNode;
    className?: string;
    trigger?: ReactNode;
    button?: ReactNode;
    title?: string;
    description?: string;
    isModal?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
  export const DialogButton: React.FC<DialogButtonProps>;
  export const Dialog: React.FC<DialogButtonProps>;
}

// AnimatedTabs
declare module "@bcl32/utils/AnimatedTabs" {
  import type { ReactNode } from "react";

  export interface AnimatedTabsProps {
    tabs?: Array<{ id: string; label: string }>;
    tab_titles?: string[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    className?: string;
    children?: ReactNode;
  }
  export interface TabContentProps {
    id?: string;
    activeTab?: string;
    children?: ReactNode;
    className?: string;
  }
  export const AnimatedTabs: React.FC<AnimatedTabsProps>;
  export const TabContent: React.FC<TabContentProps>;
}

// ShowHeirarchy (note: typo preserved from original)
declare module "@bcl32/utils/ShowHeirarchy" {
  export interface ShowHeirarchyProps {
    data?: unknown;
    json_data?: unknown;
    className?: string;
  }
  export const ShowHeirarchy: React.FC<ShowHeirarchyProps>;
}

// ToggleGroup
declare module "@bcl32/utils/ToggleGroup" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes, ReactNode } from "react";

  export interface ToggleGroupProps {
    type?: "single" | "multiple";
    variant?: "default" | "outline";
    value?: string | string[];
    onValueChange?: (value: string | string[]) => void;
    className?: string;
    children?: ReactNode;
  }
  export interface ToggleGroupItemProps extends ComponentPropsWithoutRef<"button"> {
    value: string;
  }
  export const ToggleGroup: React.FC<ToggleGroupProps>;
  export const ToggleGroupItem: ForwardRefExoticComponent<ToggleGroupItemProps & RefAttributes<HTMLButtonElement>>;
}

// Dropdown
declare module "@bcl32/utils/Dropdown" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes, ReactNode } from "react";

  export interface DropdownMenuProps {
    children?: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
  export interface DropdownMenuTriggerProps {
    children?: ReactNode;
    asChild?: boolean;
    className?: string;
  }
  export interface DropdownMenuContentProps {
    children?: ReactNode;
    className?: string;
    align?: "start" | "center" | "end";
    sideOffset?: number;
  }
  export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<"div"> {
    inset?: boolean;
  }
  export interface DropdownMenuLabelProps extends ComponentPropsWithoutRef<"div"> {
    inset?: boolean;
  }
  export interface DropdownMenuSeparatorProps {
    className?: string;
  }

  export const DropdownMenu: React.FC<DropdownMenuProps>;
  export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps>;
  export const DropdownMenuContent: ForwardRefExoticComponent<DropdownMenuContentProps & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuItem: ForwardRefExoticComponent<DropdownMenuItemProps & RefAttributes<HTMLDivElement>>;
  export const DropdownMenuLabel: React.FC<DropdownMenuLabelProps>;
  export const DropdownMenuSeparator: React.FC<DropdownMenuSeparatorProps>;
}
