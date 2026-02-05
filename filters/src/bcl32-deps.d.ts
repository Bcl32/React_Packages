declare module "@bcl32/utils/AnimatedTabs" {
  import type { ReactNode, ComponentPropsWithoutRef } from "react";

  export interface AnimatedTabsProps {
    tab_titles: string[];
    children: ReactNode;
  }
  export function AnimatedTabs(props: AnimatedTabsProps): JSX.Element;

  export interface TabContentProps extends ComponentPropsWithoutRef<"div"> {
    unmount?: boolean;
    children?: ReactNode;
  }
  export function TabContent(props: TabContentProps): JSX.Element;
}

declare module "@bcl32/utils/Button" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
    variant?: "default" | "outline" | "ghost" | "grey" | "red" | "blue" | "danger" | "ringHover" | "shine" | "gooeyRight" | "gooeyLeft" | "linkHover1" | "linkHover2" | null;
    size?: "default" | "sm" | "lg" | "icon" | null;
    asChild?: boolean;
  }
  export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
}

declare module "@bcl32/utils/DialogButton" {
  import type { ReactNode } from "react";

  export interface DialogButtonProps {
    button: ReactNode;
    children: ReactNode;
    size?: "default" | "big";
    title?: string;
    variant?: string;
  }
  export function DialogButton(props: DialogButtonProps): JSX.Element;
}

declare module "@bcl32/utils/RadioButton" {
  export interface RadioButtonProps {
    filter: string;
    interval_name: string;
    value: string;
    handleRadioChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    timeChange: string;
  }
  export function RadioButton(props: RadioButtonProps): JSX.Element;
}

declare module "@bcl32/utils/Input" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface InputProps extends ComponentPropsWithoutRef<"input"> {
    variant?: "default" | "background" | null;
    inputSize?: "default" | "sm" | "lg" | null;
  }
  export const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;
}

declare module "@bcl32/utils/Label" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface LabelProps extends ComponentPropsWithoutRef<"label"> {}
  export const Label: ForwardRefExoticComponent<LabelProps & RefAttributes<HTMLLabelElement>>;
}

declare module "@bcl32/utils/ToggleGroup" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface ToggleGroupProps extends ComponentPropsWithoutRef<"div"> {
    type?: "single" | "multiple";
    variant?: "default" | "outline" | null;
    value?: string;
    onValueChange?: (value: string) => void;
  }
  export const ToggleGroup: ForwardRefExoticComponent<ToggleGroupProps & RefAttributes<HTMLDivElement>>;

  export interface ToggleGroupItemProps extends ComponentPropsWithoutRef<"button"> {
    value: string;
  }
  export const ToggleGroupItem: ForwardRefExoticComponent<ToggleGroupItemProps & RefAttributes<HTMLButtonElement>>;
}

declare module "@bcl32/utils/Slider" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface SliderProps extends ComponentPropsWithoutRef<"span"> {
    value?: number[];
    onValueChange?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
  }
  export const Slider: ForwardRefExoticComponent<SliderProps & RefAttributes<HTMLSpanElement>>;
}

declare module "@bcl32/utils/CalculateFeatureStats" {
  export interface ModelAttribute {
    name: string;
    type: string;
    [key: string]: unknown;
  }
  export interface StatValue {
    name: string;
    value: unknown;
  }
  export function CalculateFeatureStats(
    model_attributes: ModelAttribute[],
    data: Record<string, unknown>[]
  ): Record<string, StatValue[]>;
}

declare module "@bcl32/charts/Charts" {
  import type { ReactElement, ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";
  import type { TooltipProps, LegendProps } from "recharts";

  export interface ChartConfigItem {
    label?: string;
    icon?: React.ComponentType;
    color?: string;
    theme?: Partial<Record<"light" | "dark", string>>;
  }
  export interface ChartConfig {
    [key: string]: ChartConfigItem;
  }

  export interface ChartContainerProps extends ComponentPropsWithoutRef<"div"> {
    config: ChartConfig;
    children: ReactElement;
  }
  export const ChartContainer: ForwardRefExoticComponent<ChartContainerProps & RefAttributes<HTMLDivElement>>;

  export const ChartTooltip: typeof import("recharts").Tooltip;

  export interface ChartTooltipContentProps extends ComponentPropsWithoutRef<"div"> {
    active?: boolean;
    payload?: unknown[];
    indicator?: "dot" | "line" | "dashed";
    hideLabel?: boolean;
    hideIndicator?: boolean;
    label?: string;
    labelFormatter?: (value: string | undefined, payload: unknown[]) => React.ReactNode;
    labelClassName?: string;
    formatter?: (value: number, name: string, item: unknown, index: number, payload: Record<string, unknown>) => React.ReactNode;
    color?: string;
    nameKey?: string;
    labelKey?: string;
  }
  export const ChartTooltipContent: ForwardRefExoticComponent<ChartTooltipContentProps & RefAttributes<HTMLDivElement>>;

  export const ChartLegend: typeof import("recharts").Legend;

  export interface ChartLegendContentProps extends ComponentPropsWithoutRef<"div"> {
    hideIcon?: boolean;
    payload?: unknown[];
    verticalAlign?: "top" | "bottom";
    nameKey?: string;
  }
  export const ChartLegendContent: ForwardRefExoticComponent<ChartLegendContentProps & RefAttributes<HTMLDivElement>>;

  export function ChartStyle(props: { id: string; config: ChartConfig }): JSX.Element | null;
}

declare module "@bcl32/filters/FilterElement" {
  export interface FilterData {
    name: string;
    type: string;
    options?: string[];
    [key: string]: unknown;
  }
  export function FilterElement(props: { filter_data: FilterData }): JSX.Element;
}

declare module "@bcl32/filters/FilterContext" {
  import type { Context } from "react";
  export interface FilterValue {
    type: string;
    value: unknown;
    rule?: string;
    filter_empty: unknown;
    options?: string[];
  }
  export interface Filters {
    [key: string]: FilterValue;
  }
  export interface FilterContextValue {
    filters: Filters;
    change_filters: (name: string, key: string, value: unknown) => void;
  }
  export const FilterContext: Context<FilterContextValue | null>;
}
