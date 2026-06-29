# `@bcl32/utils`

> Reference doc for the `@bcl32/utils` package.
> Back to the package index: [../00-OVERVIEW.md](../00-OVERVIEW.md)

| | |
| --- | --- |
| **Name** | `@bcl32/utils` |
| **Version** | `2.4.4` |
| **Tier** | `foundational` |
| **Internal `@bcl32` deps** | _none_ |

## Purpose

A Radix UI + Headless UI + Tailwind CSS component library providing styled
primitives, layout components, and a few data-display utilities. It has **no
`@bcl32` peer dependencies**, which makes it a foundational building block that
other packages and apps can consume freely without pulling in the rest of the
monorepo.

This package is UI-only. Domain/data utilities that used to live here have been
moved out to `@bcl32/data-utils`.

## Installation & Import

The package is published to the GitHub Packages registry and consumed via the
pnpm workspace protocol inside the monorepo:

```jsonc
// app package.json
{
  "dependencies": {
    "@bcl32/utils": "workspace:^2.0.0"
  }
}
```

Everything is re-exported from the package root, and most components also have a
dedicated subpath export (e.g. `@bcl32/utils/Button`) for finer-grained imports:

```ts
// barrel import (everything is re-exported from the root)
import { Button, Card, cn } from "@bcl32/utils";

// subpath import (one component file)
import { Button, buttonVariants } from "@bcl32/utils/Button";
```

> **Note on the Dropdown subpath:** the dropdown menu components are exported
> from the file `Dropdown.tsx`, so the subpath is `@bcl32/utils/Dropdown`
> (not `/DropdownMenu`). The exported component **names** are still
> `DropdownMenu`, `DropdownMenuTrigger`, etc.

### Available subpaths

`Alert`, `AnimatedTabs`, `AnimatedFileSystem`, `ShowHierarchy`, `ToggleGroup`,
`Dialog`, `DialogButton`, `Sidebar`, `Select`, `Button`, `Input`, `Label`,
`Card`, `Separator`, `Skeleton`, `Sheet`, `Checkbox`, `Dropdown`, `Tooltip`,
`RadioButton`, `Slider`, `Breadcrumb`, `Stepper`, `useIsMobile`, `FileSystem`,
`StatusBanner`, `ColourPickerPopover`, `Combobox`, `cn`.

## Dependencies

### Internal `@bcl32` dependencies

None. This package depends on no other `@bcl32` package.

### Peer dependencies

These must be provided by the consuming app:

| Peer | Version |
| --- | --- |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `@radix-ui/react-checkbox` | `^1.1.2` |
| `@radix-ui/react-dialog` | `^1.1.1` |
| `@radix-ui/react-dropdown-menu` | `^2.1.2` |
| `@radix-ui/react-focus-scope` | `^1.1.0` |
| `@radix-ui/react-label` | `^2.1.0` |
| `@radix-ui/react-select` | `^2.1.2` |
| `@radix-ui/react-separator` | `^1.1.0` |
| `@radix-ui/react-slider` | `^1.2.1` |
| `@radix-ui/react-slot` | `^1.1.0` |
| `@radix-ui/react-toggle-group` | `^1.1.0` |
| `@radix-ui/react-tooltip` | `^1.1.3` |

### Bundled (external) dependencies

| Dependency | Version |
| --- | --- |
| `framer-motion` | `^11.0.0` |
| `@headlessui/react` | `^2.1.1` |
| `@heroicons/react` | `^2.1.0` |
| `clsx` | `^2.1.0` |
| `lucide-react` | `^0.447.0` |
| `tailwind-merge` | `^2.5.2` |
| `class-variance-authority` | `^0.2.2` |

### UI libraries used

- **Radix UI** — checkbox, dialog, dropdown-menu, focus-scope, label, select,
  separator, slider, slot, toggle-group, tooltip
- **Headless UI** — Tab, TabGroup, TabList, TabPanel, TabPanels
- **Tailwind CSS** — all styling
- **framer-motion** — `AnimatedTabs`, `AnimatedFileSystem`
- **lucide-react** — icons throughout
- **@heroicons/react** — `FileSystem.tsx` only

## Public Exports

### Feedback / display

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `Alert` | component | `forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>` | Styled div with `role=alert`; accepts standard `HTMLDivElement` attrs. |
| `AlertDescription` | component | `forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>` | Small-text description block to nest inside `Alert`. |
| `Card` | component | div | Rounded bordered card container. |
| `CardHeader` | component | div | Flex column, `space-y-1.5`, `p-6`. |
| `CardTitle` | component | div | `2xl` semibold heading inside `Card`. |
| `CardDescription` | component | div | Small muted text inside `Card`. |
| `CardContent` | component | div | Card body, `p-6 pt-0`. |
| `CardFooter` | component | div | Flex row footer, `p-6 pt-0`. |
| `Separator` | component | Radix Separator | Horizontal/vertical orientation; `decorative=true` by default. |
| `Skeleton` | component | div | Pulse placeholder (`animate-pulse`, `bg-muted`). |
| `StatusBanner` | component | `forwardRef<HTMLDivElement, { text?, show?, variant?, dismissible?, storageKey?, ...divProps }>` | Fixed top banner (`z-9999`), defaults to visible in Vite DEV mode; dismissible via `sessionStorage`. Variants: `default`/`info`/`alert`. |
| `StatusBannerProps` | type | — | Props interface for `StatusBanner`. |
| `statusBannerVariants` | other | CVA config | Exported for consumers to extend. |

### Form controls

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `Button` | component | `forwardRef<HTMLButtonElement, ButtonProps>` | Polymorphic button with rich CVA variants (`default`/`outline`/`ghost`/`grey`/`red`/`blue`/`danger`/`ringHover`/`shine`/`gooeyRight`/`gooeyLeft`/`linkHover1`/`linkHover2`) and sizes (`default`/`sm`/`lg`/`icon`). Supports `asChild` via Radix Slot. |
| `ButtonProps` | type | — | Public props interface (`asChild` + CVA variants). |
| `buttonVariants` | other | CVA config | Exported for composing custom elements. |
| `Input` | component | `forwardRef<HTMLInputElement, InputProps>` | Styled input with CVA variants (`variant`: `default`/`background`; `size`: `default`/`sm`/`lg`). Omits native `size` to avoid collision. |
| `InputProps` | type | — | Public props interface for `Input`. |
| `inputVariants` | other | CVA config | Exported for consumers. |
| `Label` | component | Radix Label.Root | Standard peer-disabled styling. |
| `Select` | component | `forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>` | Thin styled wrapper around a **native** `<select>` (NOT Radix Select). |
| `Checkbox` | component | Radix Checkbox | `Check` icon indicator; `data-[state=checked]` fills primary colour. |
| `RadioButton` | component | `({ interval_name: string, value: unknown, timeChange: unknown, handleRadioChange: (e) => void }) => JSX` | Hidden-input peer-CSS radio button with label styling. Bespoke prop API. |
| `RadioButtonProps` | type | — | Props interface for `RadioButton`. |
| `Slider` | component | Radix Slider.Root | Styled Track, Range and Thumb. |
| `ToggleGroup` | component | `forwardRef<…, ToggleGroupProps>` | Radix `ToggleGroup.Root` wrapper with CVA variants (`default`/`outline`, `default`/`sm`/`lg`); propagates `variant`/`size` to children via context. |
| `ToggleGroupItem` | component | `forwardRef<…, ToggleGroupItemProps>` | Radix `ToggleGroup.Item`; inherits `variant`/`size` from `ToggleGroup` context. |
| `toggleVariants` | other | CVA config | Exported for consumers to extend. |
| `Combobox` | component | `({ options?, value: string[], onChange, placeholder?, freeSolo?, multiple?, showBadges?, className? }) => JSX` | Keyboard-navigable combobox with optional multi-select, `freeSolo`, and badge-chip display. Built on the local `Input` primitive; dropdown closes on outside `pointerdown`. |
| `ComboboxProps` | type | — | Props interface for `Combobox`. |

### Dialog (modal)

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `Dialog` | component | re-export | Radix `DialogPrimitive.Root`. |
| `DialogTrigger` | component | re-export | Radix `DialogPrimitive.Trigger`. |
| `DialogPortal` | component | re-export | Radix `DialogPrimitive.Portal`. |
| `DialogClose` | component | re-export | Radix `DialogPrimitive.Close`. |
| `DialogOverlay` | component | styled | Fade-in/out overlay (`black/80`). |
| `DialogContent` | component | styled | Centered content with built-in close X button, zoom/slide animations. |
| `DialogHeader` | component | div | Flex column for title/description area. |
| `DialogFooter` | component | div | Flex row, column-reversed on mobile, for action buttons. |
| `DialogTitle` | component | styled | Radix `DialogPrimitive.Title` (semibold, tracked). |
| `DialogDescription` | component | styled | Radix `DialogPrimitive.Description` (small, muted). |
| `SimpleDialog` | component | `({ children, isModal?, open?, onOpenChange?, className?, trigger?, title?, variant?, size? }) => JSX` | Convenience wrapper: Radix `Root` + modal content; `trigger` as `ReactNode`; optional `open`/`onOpenChange` for controlled use. |
| `DialogButton` | component | `({ button: ReactNode, ...SimpleDialogProps /* except trigger */ }) => JSX` | Convenience wrapper around `SimpleDialog`; wraps the `button` in `DialogPrimitive.Trigger asChild`. |

### Sheet (slide-in drawer)

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `Sheet` | component | re-export | Radix `Dialog.Root` used as a drawer. |
| `SheetTrigger` | component | re-export | Radix `Dialog.Trigger`. |
| `SheetClose` | component | re-export | Radix `Dialog.Close`. |
| `SheetPortal` | component | re-export | Radix `Dialog.Portal`. |
| `SheetOverlay` | component | styled | `black/80` overlay with fade animations (same impl as `DialogOverlay`). |
| `SheetContent` | component | `forwardRef<…, SheetContentProps>` | Slide-in panel; `side?`: `top`/`bottom`/`left`/`right` (default `right`). Built-in X close button. |
| `SheetHeader` | component | div | Flex column for title/description. |
| `SheetFooter` | component | div | Flex row (reversed on mobile) for actions. |
| `SheetTitle` | component | styled | Radix `Dialog.Title` for Sheet context. |
| `SheetDescription` | component | styled | Radix `Dialog.Description` for Sheet context. |

### Dropdown menu (subpath: `@bcl32/utils/Dropdown`)

| Name | Kind | Description |
| --- | --- | --- |
| `DropdownMenu` | component | Re-export of Radix `DropdownMenu.Root`. |
| `DropdownMenuTrigger` | component | Re-export of Radix `DropdownMenu.Trigger`. |
| `DropdownMenuGroup` | component | Re-export of Radix `DropdownMenu.Group`. |
| `DropdownMenuPortal` | component | Re-export of Radix `DropdownMenu.Portal`. |
| `DropdownMenuSub` | component | Re-export of Radix `DropdownMenu.Sub`. |
| `DropdownMenuRadioGroup` | component | Re-export of Radix `DropdownMenu.RadioGroup`. |
| `DropdownMenuSubTrigger` | component | Styled sub-menu trigger with `ChevronRight` icon and optional `inset` prop. |
| `DropdownMenuSubContent` | component | Styled sub-menu popover panel. |
| `DropdownMenuContent` | component | Styled dropdown panel rendered via Portal, default `sideOffset=4`. |
| `DropdownMenuItem` | component | Styled menu item with optional `inset` prop. |
| `DropdownMenuCheckboxItem` | component | Checkbox-style menu item with `Check` indicator. |
| `DropdownMenuRadioItem` | component | Radio-style menu item with `Circle` indicator. |
| `DropdownMenuLabel` | component | Non-interactive label; optional `inset`. |
| `DropdownMenuSeparator` | component | Thin horizontal rule separating sections. |
| `DropdownMenuShortcut` | component | Right-aligned muted keyboard-shortcut hint span. |

### Tooltip

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `Tooltip` | component | re-export | Radix `Tooltip.Root` (uncontrolled; requires `TooltipProvider` ancestor). |
| `TooltipTrigger` | component | re-export | Radix `Tooltip.Trigger`. |
| `TooltipContent` | component | styled | Radix `Tooltip.Content` (`max-w-2xl`, popover colours, `animate-in`); default `sideOffset=4`. |
| `TooltipProvider` | component | re-export | Radix `Tooltip.Provider`; required ancestor for tooltip components. |
| `CustomTooltip` | component | `({ children, content, open?, defaultOpen?, onOpenChange?, delayDuration? }) => JSX` | Self-contained tooltip that **includes its own `TooltipProvider`**; accepts `children` + `content` `ReactNode`. |
| `CustomTooltipProps` | type | — | Props interface for `CustomTooltip`. |

### Navigation — Breadcrumb

| Name | Kind | Description |
| --- | --- | --- |
| `Breadcrumb` | component | `nav` element with `aria-label=breadcrumb`. |
| `BreadcrumbList` | component | Wrapping `ol` with responsive gap. |
| `BreadcrumbItem` | component | Inline-flex `li` with gap. |
| `BreadcrumbLink` | component | Anchor with hover-foreground transition; supports `asChild`. |
| `BreadcrumbPage` | component | Current-page span: `aria-current=page`, `aria-disabled=true`. |
| `BreadcrumbSeparator` | component | Decorative `li` with `ChevronRight` default; accepts custom children. |
| `BreadcrumbEllipsis` | component | Decorative `MoreHorizontal` icon span for collapsed segments. |

### Sidebar system

> All `Sidebar*` components and `useSidebar` must be inside a `SidebarProvider`.

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `Sidebar` | component | `forwardRef<HTMLDivElement, SidebarProps>` (`side?='left'`, `variant?='sidebar'`/`'floating'`/`'inset'`, `collapsible?='offcanvas'`/`'icon'`/`'none'`) | Full-featured responsive sidebar; switches to `Sheet` on mobile. Requires `SidebarProvider` ancestor. |
| `SidebarProvider` | component | `forwardRef<HTMLDivElement, { defaultOpen?, open?, onOpenChange?, ...divProps }>` | Context provider + layout root: expand/collapse state, `Ctrl`/`Cmd`+`B` shortcut, cookie persistence, and wraps children in `TooltipProvider`. |
| `useSidebar` | hook | `() => { state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }` | Access `SidebarContext`. Must be inside `SidebarProvider`. |
| `SidebarTrigger` | component | — | Ghost icon `Button` (`PanelLeft`) that calls `toggleSidebar`. |
| `SidebarRail` | component | — | Narrow drag-rail for keyboard/mouse toggling; hidden on mobile. |
| `SidebarInset` | component | — | Main content area sibling to `Sidebar`; handles `inset` variant padding/rounded corners. |
| `SidebarInput` | component | — | Input styled for sidebar search (`bg-background`, `sidebar-ring` focus). |
| `SidebarHeader` | component | — | Top section; flex column, `gap-2`, `p-2`. |
| `SidebarFooter` | component | — | Bottom section; flex column, `gap-2`, `p-2`. |
| `SidebarSeparator` | component | — | Horizontal `Separator` with `sidebar-border` colour, auto width. |
| `SidebarContent` | component | — | Scrollable `flex-1` content area; overflow hidden when `collapsible=icon`. |
| `SidebarGroup` | component | — | Padded section container within `SidebarContent`. |
| `SidebarGroupLabel` | component | — | Small caps section label; collapses in icon mode. Supports `asChild`. |
| `SidebarGroupAction` | component | — | Absolute-positioned action button in group header; hidden in icon mode. Supports `asChild`. |
| `SidebarGroupContent` | component | — | Content area for a `SidebarGroup`. |
| `SidebarMenu` | component | — | `ul` container for menu items. |
| `SidebarMenuItem` | component | — | `li` item with group/menu-item class for peer selectors. |
| `SidebarMenuButton` | component | `forwardRef<HTMLButtonElement, SidebarMenuButtonProps>` (`asChild?`, `isActive?`, `variant?`, `size?`, `tooltip?: string \| TooltipContentProps`) | Primary nav button; shows tooltip on the right when collapsed. |
| `SidebarMenuAction` | component | — | Secondary action overlaid on a menu item; `showOnHover?` hides until hover/focus. Supports `asChild`. |
| `SidebarMenuBadge` | component | — | Numeric badge overlay on a menu item; hidden in icon mode. |
| `SidebarMenuSkeleton` | component | — | Loading skeleton for a menu item with optional icon placeholder; randomises width per mount. |
| `SidebarMenuSub` | component | — | Nested `ul` with left-border indent; hidden in icon mode. |
| `SidebarMenuSubItem` | component | — | `li` wrapper for sub-menu items. |
| `SidebarMenuSubButton` | component | (`size?`: `sm`/`md`, `isActive?`) | Anchor/custom element for sub-menu navigation. Supports `asChild`. |

### Tabs (Headless UI)

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `AnimatedTabs` | component | `({ tab_titles: string[], children, theme_type?: 'dark' \| 'light', size?: 'sm' \| 'lg' }) => JSX` | framer-motion spring-animated pill tabs built on Headless UI `TabGroup`; expects sibling `TabContent` panels as children. |
| `TabContent` | component | `typeof TabPanel` | Re-export of Headless UI `TabPanel`; use as direct children of `AnimatedTabs`. |

### Stepper (controlled wizard)

> All `StepperContent`/`StepperNext`/`StepperPrevious`/`useStepper` must be inside a `Stepper`.

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `Stepper` | component | `forwardRef<HTMLDivElement, { value: string, onValueChange: (next: string) => void, steps: StepperStep[], ...divProps }>` | Controlled multi-step container. Renders `StepperHeader` automatically above children. Parent owns `value` + `steps`. |
| `StepperHeader` | component | — | Horizontal `ol` of step indicators (number/check/lock); clickable for non-locked, non-active steps. Auto-rendered by `Stepper` but exported for custom placement. |
| `StepperContent` | component | `forwardRef<HTMLDivElement, { value: string, keepMounted?: boolean, ...divProps }>` | Panel tied to a step `value`; renders `null` when inactive unless `keepMounted=true` (then hidden via CSS). |
| `StepperNext` | component | — | Button that calls `next()` from `useStepper`; disabled when no enabled forward step exists. Supports `asChild`. |
| `StepperPrevious` | component | — | Button that calls `previous()`; disabled on first step. Supports `asChild`. |
| `useStepper` | hook | `() => { value, setValue, steps, activeIndex, isFirst, isLast, next, previous, canAdvance }` | Must be inside `Stepper`. |
| `StepperStep` | type | `{ value: string; label: ReactNode; disabled?: boolean }` | Step descriptor. |
| `StepperProps` | type | — | Props for `Stepper`. |
| `StepperContentProps` | type | — | Props for `StepperContent`. |
| `StepperNavButtonProps` | type | — | Props for `StepperNext`/`StepperPrevious`. |

### File trees

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `AnimatedFileSystem` | component | `({ node: AnimatedFileNode }) => JSX` | Recursive **animated** tree node (framer-motion height animation, lucide icons). |
| `AnimatedFileNode` | type | `{ name: string; value?: string \| number; nodes?: AnimatedFileNode[] }` | Node interface for `AnimatedFileSystem`. |
| `ShowHierarchy` | component | `({ json_data: Record<string, unknown> }) => JSX` | Converts a plain JSON object to an `AnimatedFileSystem` tree; renders all top-level keys as expandable nodes. |
| `FilesystemItem` | component | `({ node: FileSystemNode }) => JSX` | **Non-animated** recursive file-tree node using heroicons; no framer-motion dependency. |
| `FileSystemNode` | type | `{ name: string; nodes?: FileSystemNode[] }` | Node interface for `FilesystemItem`. |

### Colour picker

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `ColourPickerPopover` | component | `({ swatchGroups: SwatchGroups, currentColour?, currentId?, selectedColours?, defaultCustomColour?, onSelect: (hex, id?) => void }) => JSX` | Fixed-position swatch grid + native color input. Accepts flat or nested `SwatchGroups` `Map`; normalises internally. **No portal** — renders inline at `z-50`. |
| `ColourPickerPopoverProps` | type | — | Props interface for `ColourPickerPopover`. |
| `ColourSwatch` | type | `{ id?: string; colour_hex: string; colour_name?: string }` | A single swatch. |
| `SwatchGroups` | type | `Map<string, ColourSwatch[]> \| Map<string, Map<string, ColourSwatch[]>>` | Flat or nested grouping of swatches. |

### Hooks & utilities

| Name | Kind | Signature | Description |
| --- | --- | --- | --- |
| `useIsMobile` | hook | `() => boolean` | `true` when `window.innerWidth < 768px`. Subscribes to `matchMedia` change events. |
| `cn` | util | `(...inputs: ClassValue[]) => string` | `clsx` + `tailwind-merge`: merges Tailwind class strings, deduplicating conflicting utilities. |

## Conventions & patterns

- **Tailwind design tokens are required.** All styled components use design-token
  CSS variables (`bg-primary`, `text-primary-foreground`, `bg-muted`, etc.). The
  consuming app **must** define these variables (typically via `tw-colors` or a
  CSS-variable theme setup) or components will render unstyled.
- **`SidebarProvider` wraps the Sidebar system** and provides a `TooltipProvider`
  internally, so when using the Sidebar you do **not** need to add a separate
  `TooltipProvider`.
- **`TooltipProvider` is required** around `Tooltip`/`TooltipTrigger`/`TooltipContent`
  when used outside of `SidebarProvider`. `CustomTooltip` is self-contained and
  does not require it.
- **`Stepper` is controlled.** It must wrap all `StepperContent`/`StepperNext`/
  `StepperPrevious`/`useStepper`; the parent owns `value` + `steps`.
- **`AnimatedTabs` children must be `TabContent`** (re-exported `TabPanel`)
  elements. Non-`TabPanel` children cause Headless UI runtime errors.
- **`ColourPickerPopover` uses `fixed` positioning and no Portal** — the caller
  must ensure no ancestor has `overflow:hidden` or a stacking context that clips it.
- **`asChild` (Radix Slot) polymorphism** is supported on: `Button`,
  `SidebarMenuButton`, `BreadcrumbLink`, `SidebarGroupLabel`, `SidebarGroupAction`,
  `SidebarMenuAction`, `SidebarMenuSubButton`, `StepperNext`, `StepperPrevious`.
- **`Combobox` is always array-valued** (`value: string[]`) even in single-select
  mode — read `value[0]` for a single selection.

## Known smells & caveats

- **`@radix-ui/react-select` peer dep is unused.** It is listed in `package.json`
  peers but no source file imports it — the package only ships a raw `<select>`
  wrapper (`Select.tsx`). The peer dep is misleading.
- **`StatusBanner` is Vite-bound.** It reads `import.meta.env.DEV` directly, so it
  will throw at runtime in non-Vite bundlers (webpack, standalone esbuild, etc.).
- **Duplicate file-tree implementations.** `FileSystem.tsx` (heroicons, no
  animation) and `AnimatedFileSystem.tsx` (lucide, framer-motion) serve the same
  purpose with different icon sets and no shared abstraction. `ShowHierarchy`
  wraps `AnimatedFileSystem` only.
- **`RadioButton` has an idiosyncratic API** (`interval_name`, `value: unknown`,
  `timeChange: unknown`) inconsistent with the library's `forwardRef` +
  `HTMLAttributes` conventions; `timeChange` is typed `unknown` and undocumented.
- **`SheetOverlay` and `DialogOverlay` are identical** copy-paste implementations
  (`fixed inset-0 z-50 bg-black/80`, same animation classes) with no shared base.
- **`SidebarMenuSkeleton` randomises width per component instance.** It memoizes a
  random width on mount, so list re-renders that remount items produce different
  skeleton widths — surprising if you expect consistent skeletons.
- **Typos in source:** `BreadcrumbEllipsis.displayName` is set to
  `"BreadcrumbElipssis"` (double-s); `AnimatedTabs.tsx` uses a debug-named
  variable `test` as the framer-motion `layoutId`.

## Minimal usage example

```tsx
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  cn,
} from "@bcl32/utils";

export function AppShell() {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive tooltip="Dashboard">
                Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <Card className={cn("m-4", "max-w-md")}>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="blue" size="lg">
              Get started
            </Button>
          </CardContent>
        </Card>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

See also: [package index / overview](../00-OVERVIEW.md).
