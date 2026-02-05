declare module "@bcl32/utils/cn" {
  import type { ClassValue } from "clsx";
  export function cn(...inputs: ClassValue[]): string;
}

declare module "@bcl32/utils/Label" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface LabelProps extends ComponentPropsWithoutRef<"label"> {}
  export const Label: ForwardRefExoticComponent<LabelProps & RefAttributes<HTMLLabelElement>>;
}

declare module "@bcl32/utils/Select" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface SelectProps extends ComponentPropsWithoutRef<"select"> {}
  export const Select: ForwardRefExoticComponent<SelectProps & RefAttributes<HTMLSelectElement>>;
}

declare module "@bcl32/utils/Checkbox" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<"button">, "checked" | "onCheckedChange"> {
    checked?: boolean;
    onCheckedChange?: (checked: boolean | "indeterminate") => void;
  }
  export const Checkbox: ForwardRefExoticComponent<CheckboxProps & RefAttributes<HTMLButtonElement>>;
}

declare module "@bcl32/hooks/useBokehChart" {
  import type { UseQueryResult } from "@tanstack/react-query";

  export interface BokehChartData {
    bokeh_graph: string;
  }

  export function useBokehChart(
    url: string,
    metadataUrl: string,
    graphOptions: Record<string, unknown>,
    lazyLoadEnabled?: boolean,
    lazyLoadValue?: unknown
  ): UseQueryResult<BokehChartData, Error>;
}

declare module "@bokeh/bokehjs" {
  export const embed: {
    embed_item: (item: unknown, targetId?: string) => void;
  };
}
