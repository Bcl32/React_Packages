declare module "@bcl32/utils/Breadcrumb" {
  import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes } from "react";

  export interface BreadcrumbProps extends ComponentPropsWithoutRef<"nav"> {}
  export const Breadcrumb: ForwardRefExoticComponent<BreadcrumbProps & RefAttributes<HTMLElement>>;

  export interface BreadcrumbListProps extends ComponentPropsWithoutRef<"ol"> {}
  export const BreadcrumbList: ForwardRefExoticComponent<BreadcrumbListProps & RefAttributes<HTMLOListElement>>;

  export interface BreadcrumbItemProps extends ComponentPropsWithoutRef<"li"> {}
  export const BreadcrumbItem: ForwardRefExoticComponent<BreadcrumbItemProps & RefAttributes<HTMLLIElement>>;

  export interface BreadcrumbLinkProps extends ComponentPropsWithoutRef<"a"> {
    asChild?: boolean;
  }
  export const BreadcrumbLink: ForwardRefExoticComponent<BreadcrumbLinkProps & RefAttributes<HTMLAnchorElement>>;

  export interface BreadcrumbPageProps extends ComponentPropsWithoutRef<"span"> {}
  export const BreadcrumbPage: ForwardRefExoticComponent<BreadcrumbPageProps & RefAttributes<HTMLSpanElement>>;

  export interface BreadcrumbSeparatorProps extends ComponentPropsWithoutRef<"li"> {}
  export const BreadcrumbSeparator: (props: BreadcrumbSeparatorProps) => JSX.Element;

  export interface BreadcrumbEllipsisProps extends ComponentPropsWithoutRef<"span"> {}
  export const BreadcrumbEllipsis: (props: BreadcrumbEllipsisProps) => JSX.Element;
}
