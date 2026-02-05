# TypeScript Migration Guide for @bcl32 Packages

This document outlines the process for migrating React component packages from JavaScript to TypeScript with strict mode enabled.

---

## Table of Contents

1. [Create tsconfig.json](#1-create-tsconfigjson)
2. [Rename Files](#2-rename-files-from-jsjsx-to-tstsx)
3. [Add Type Annotations](#3-add-type-annotations)
4. [Create Interfaces for Props](#4-create-interfaces-for-component-props)
5. [Type forwardRef Components](#5-type-react-forwardref-components)
6. [Handle CVA Variants](#6-handle-cva-class-variance-authority-variants)
7. [Fix Null vs Undefined Issues](#7-fix-null-vs-undefined-issues)
8. [Remove Unused Imports](#8-remove-unused-imports)
9. [Fix Export Name Conflicts](#9-fix-export-name-conflicts)
10. [Update tsup.config.ts](#10-update-tsupconfigts)
11. [Update package.json Exports](#11-update-packagejson-exports-with-types)
12. [Version Bump](#12-version-bump-to-200)

---

## 1. Create tsconfig.json

**What:** Add a TypeScript configuration file with strict mode settings.

**Why:** TypeScript needs this file to know how to compile your code.

**Example tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Key settings explained:**

| Setting | Purpose |
|---------|---------|
| `strict: true` | Enables all strict type checking (catches more bugs) |
| `noUnusedLocals` | Errors on unused variables |
| `noUnusedParameters` | Errors on unused function parameters |
| `moduleResolution: "node"` | How TypeScript finds imports |
| `lib: ["ESNext", "DOM"]` | What built-in types are available |
| `declaration: true` | Generate .d.ts files |
| `jsx: "react-jsx"` | Use modern JSX transform (no React import needed) |

---

## 2. Rename Files from .js/.jsx to .ts/.tsx

**What:** Change file extensions.

| Before | After |
|--------|-------|
| `Button.jsx` | `Button.tsx` |
| `cn.js` | `cn.ts` |
| `utils.js` | `utils.ts` |

**Why:** TypeScript only processes `.ts` and `.tsx` files. Use `.tsx` for files containing JSX (React components), and `.ts` for pure logic files.

**Command to rename all files:**

```bash
# Rename .jsx to .tsx
for f in src/*.jsx; do mv "$f" "${f%.jsx}.tsx"; done

# Rename .js to .ts
for f in src/*.js; do mv "$f" "${f%.js}.ts"; done
```

---

## 3. Add Type Annotations

**What:** Add types to function parameters, return values, and variables.

**Before (JavaScript):**

```jsx
export function Capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

export function Truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + "..." : str;
}
```

**After (TypeScript):**

```tsx
export function Capitalize(s: string | null | undefined): string {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

export function Truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "..." : str;
}
```

**Why types matter:**

- IDE autocomplete and inline documentation
- Compile-time error checking (catch bugs before runtime)
- Self-documenting code
- Refactoring safety

---

## 4. Create Interfaces for Component Props

**What:** Define explicit prop types using interfaces.

**Before (JavaScript):**

```jsx
export function AnimatedTabs({ tab_titles, children, theme_type = "dark" }) {
  // component body
}
```

**After (TypeScript):**

```tsx
interface AnimatedTabsProps {
  tab_titles: string[];
  children: React.ReactNode;
  theme_type?: "dark" | "light";  // ? means optional
}

export function AnimatedTabs({
  tab_titles,
  children,
  theme_type = "dark"
}: AnimatedTabsProps) {
  // component body
}
```

**Common React prop types:**

| Type | Use for |
|------|---------|
| `React.ReactNode` | Children, any renderable content |
| `React.ReactElement` | Specifically a React element |
| `React.CSSProperties` | Inline style objects |
| `React.MouseEvent<HTMLButtonElement>` | Event handlers |
| `React.ComponentPropsWithoutRef<"div">` | All props a div accepts |
| `React.ComponentPropsWithRef<"input">` | All props including ref |

---

## 5. Type React forwardRef Components

### What is forwardRef?

`forwardRef` lets a parent component pass a `ref` through to a child's DOM element. This is common in UI libraries where you want users to access the underlying button, input, etc.

```tsx
// Parent can now do: <Button ref={myRef} />
// And myRef.current will be the actual <button> element
```

### The Problem

In JavaScript, forwardRef just works:

```jsx
const Button = React.forwardRef((props, ref) => (
  <button ref={ref} {...props} />
));
```

But TypeScript needs to know:
1. What type is `ref`? (What element are we forwarding to?)
2. What type is `props`? (What props does this component accept?)

### The Solution

`forwardRef` is a generic function that takes two type parameters:

```tsx
React.forwardRef<RefType, PropsType>((props, ref) => ...)
```

**Full example from Button.tsx:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
```

**Breaking it down:**

- `HTMLButtonElement` - The ref will point to a native button element
- `ButtonProps` - The component accepts these props
- TypeScript now knows `ref` is `React.Ref<HTMLButtonElement>`
- TypeScript now knows `props` contains `className`, `variant`, `size`, etc.

### Common Element Types for Refs

| Element | Type |
|---------|------|
| `<button>` | `HTMLButtonElement` |
| `<input>` | `HTMLInputElement` |
| `<div>` | `HTMLDivElement` |
| `<a>` | `HTMLAnchorElement` |
| `<form>` | `HTMLFormElement` |
| `<textarea>` | `HTMLTextAreaElement` |

### Why This Matters

Without proper typing:

```tsx
<Button ref={inputRef} />  // No error, but inputRef expects an <input>!
```

With proper typing:

```tsx
<Button ref={inputRef} />  // Error: Type 'RefObject<HTMLInputElement>' is not assignable
```

---

## 6. Handle CVA (class-variance-authority) Variants

### What is CVA?

CVA is a utility for creating component variants with Tailwind CSS. Instead of writing conditional classes manually, you define variants declaratively:

```tsx
const buttonVariants = cva(
  // Base classes (always applied)
  "inline-flex items-center justify-center rounded-md font-medium",
  {
    variants: {
      // Each variant is a prop with predefined options
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border border-input bg-transparent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Usage: buttonVariants({ variant: "outline", size: "lg" })
// Returns: "inline-flex items-center... border border-input... h-11 px-8"
```

### The Problem

You've defined variants in CVA, but now you need TypeScript to know your component accepts `variant` and `size` props with those specific values.

You could manually duplicate the types:

```tsx
interface ButtonProps {
  variant?: "default" | "outline" | "ghost";  // Duplicated from CVA!
  size?: "default" | "sm" | "lg";             // Duplicated from CVA!
}
```

But this is error-prone - if you add a variant to CVA, you must remember to update the interface.

### The Solution: VariantProps

CVA exports a `VariantProps` utility type that extracts the variant types automatically:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("...", {
  variants: {
    variant: { default: "...", outline: "...", ghost: "..." },
    size: { default: "...", sm: "...", lg: "..." },
  },
});

// VariantProps extracts: { variant?: "default" | "outline" | "ghost" | null; size?: ... | null }
type ButtonVariantProps = VariantProps<typeof buttonVariants>;
```

**Using it in your component:**

```tsx
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,  // Standard button props
    VariantProps<typeof buttonVariants> {                  // variant + size props
  asChild?: boolean;  // Additional custom props
}
```

Now if you add a new variant to CVA:

```tsx
variant: {
  default: "...",
  outline: "...",
  ghost: "...",
  destructive: "bg-red-500...",  // New!
},
```

The `ButtonProps` type automatically includes `"destructive"` as a valid option. No manual sync required.

---

## 7. Fix Null vs Undefined Issues

### The Issue

CVA's `VariantProps` types each variant as:

```tsx
variant?: "default" | "outline" | "ghost" | null | undefined
```

Notice it includes **both** `null` and `undefined`. This is because CVA allows you to explicitly pass `null` to skip a variant.

But in some components (like ToggleGroup), there's a React Context that only accepts `undefined`:

```tsx
interface ToggleGroupContextValue {
  size?: "default" | "sm" | "lg";      // Only undefined, not null!
  variant?: "default" | "outline";     // Only undefined, not null!
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
});
```

When the component tries to pass CVA's variant props to the context:

```tsx
const ToggleGroup = React.forwardRef<..., ToggleGroupProps>(
  ({ variant, size, children, ...props }, ref) => (
    // ...
    <ToggleGroupContext.Provider value={{ variant, size }}>
    //                                    ^^^^^^^ Error!
    // Type 'null' is not assignable to type '"default" | "outline" | undefined'
```

TypeScript complains because `variant` could be `null` (from VariantProps), but the context only accepts `undefined`.

### Why TypeScript Distinguishes Them

In JavaScript, `null` and `undefined` are often used interchangeably, but they have different meanings:

- `undefined` - "This value was never set" or "This property doesn't exist"
- `null` - "This value was explicitly set to nothing"

In strict TypeScript, they're separate types:

```tsx
let a: string | undefined;
a = undefined;  // OK
a = null;       // Error!

let b: string | null;
b = null;       // OK
b = undefined;  // Error!
```

### The Fix: Nullish Coalescing

The `??` operator returns the right side if the left side is `null` or `undefined`:

```tsx
// Before (error)
<ToggleGroupContext.Provider value={{ variant, size }}>

// After (fixed)
<ToggleGroupContext.Provider value={{
  variant: variant ?? undefined,  // null → undefined, everything else unchanged
  size: size ?? undefined
}}>
```

**How it works:**

| Input value | `variant ?? undefined` returns |
|-------------|-------------------------------|
| `"default"` | `"default"` |
| `"outline"` | `"outline"` |
| `undefined` | `undefined` |
| `null` | `undefined` ← converted! |

This satisfies TypeScript because the context now only ever receives `undefined`, never `null`.

### Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ CVA VariantProps                                                │
│ variant?: "default" | "outline" | null | undefined              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  │ ?? undefined
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ Context Value                                                   │
│ variant?: "default" | "outline" | undefined                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Remove Unused Imports

**What:** Remove imports that aren't used in the file.

**Before:**

```tsx
import * as React from "react";  // Unused with modern JSX transform
import { ChevronRight, File, Folder } from "lucide-react";
```

**After:**

```tsx
import { ChevronRight, File, Folder } from "lucide-react";
```

**Why:** With `noUnusedLocals: true` in tsconfig, TypeScript errors on unused imports. The modern JSX transform (`jsx: "react-jsx"`) doesn't require React to be in scope for JSX.

**When you still need React import:**

```tsx
import * as React from "react";

// Using React.useState, React.useEffect, etc.
const [state, setState] = React.useState(false);

// Using React.forwardRef
const Component = React.forwardRef<...>(...);

// Using React types
interface Props {
  children: React.ReactNode;
}
```

---

## 9. Fix Export Name Conflicts

**What:** Resolve duplicate export names when re-exporting from index.ts.

**The Problem:**

Both `Dialog.tsx` and `DialogButton.tsx` exported a component named `Dialog`:

```tsx
// Dialog.tsx
export const Dialog = DialogPrimitive.Root;

// DialogButton.tsx
export function Dialog({ ... }) { ... }  // Different component, same name!
```

When `index.ts` re-exports both:

```tsx
export * from "./Dialog";
export * from "./DialogButton";  // Error: 'Dialog' has already been exported
```

**The Fix:**

Rename the internal/less-used component:

```tsx
// DialogButton.tsx
function SimpleDialog({ ... }) { ... }  // Renamed, no longer exported

export function DialogButton({ button, ...props }) {
  return <SimpleDialog {...props} trigger={...} />;
}
```

**Alternative fixes:**

1. Use named re-exports:
   ```tsx
   export { Dialog } from "./Dialog";
   export { Dialog as DialogButton } from "./DialogButton";
   ```

2. Don't export the conflicting component if it's only used internally.

---

## 10. Update tsup.config.ts

**What:** Update build configuration to use TypeScript files and generate declarations.

**Before:**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/Button.jsx",
    "src/cn.js",
    "src/index.js"
  ],
  format: ["esm"],
  dts: false,  // No declaration files
  // ...
});
```

**After:**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/Button.tsx",   // Changed from .jsx
    "src/cn.ts",        // Changed from .js
    "src/index.ts"      // Changed from .js
  ],
  format: ["esm"],
  dts: true,  // Generate .d.ts declaration files
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  }
});
```

**Key changes:**

| Setting | Purpose |
|---------|---------|
| Entry points `.tsx`/`.ts` | Must match actual file extensions |
| `dts: true` | Generates `.d.ts` files for type exports |

---

## 11. Update package.json Exports with Types

**What:** Add conditional exports with `types` field so TypeScript can find declarations.

**Before:**

```json
{
  "name": "@bcl32/utils",
  "version": "1.1.10",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./Button": "./dist/Button.js",
    "./cn": "./dist/cn.js"
  }
}
```

**After:**

```json
{
  "name": "@bcl32/utils",
  "version": "2.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./Button": {
      "types": "./dist/Button.d.ts",
      "import": "./dist/Button.js"
    },
    "./cn": {
      "types": "./dist/cn.d.ts",
      "import": "./dist/cn.js"
    }
  }
}
```

**Why this structure:**

- `types` at root level - Fallback for older TypeScript versions
- `types` in each export - TypeScript finds the correct `.d.ts` file for each import path
- `import` - The actual JavaScript file for runtime

**How TypeScript resolves types:**

```tsx
import { Button } from "@bcl32/utils/Button";
// 1. Looks at package.json exports["./Button"]
// 2. Finds "types": "./dist/Button.d.ts"
// 3. Loads type definitions from that file
```

---

## 12. Version Bump to 2.0.0

**What:** Change version from 1.x to 2.0.0.

**Why this is a major (breaking) change:**

1. **Type exports are new** - Consumers may need to update their tsconfig
2. **Some exports may have changed** - Internal renames (Dialog → SimpleDialog)
3. **Stricter types** - Code that worked before might now show type errors

**Semantic versioning rules:**

| Version change | When to use |
|----------------|-------------|
| 1.0.0 → 1.0.1 (patch) | Bug fixes, no API changes |
| 1.0.0 → 1.1.0 (minor) | New features, backwards compatible |
| 1.0.0 → 2.0.0 (major) | Breaking changes |

Adding TypeScript is considered a breaking change because:
- Consumers using TypeScript may see new errors in their code
- The build output structure changes (new .d.ts files)
- Some internal APIs may have been renamed for type safety

---

## Migration Checklist

Use this checklist when migrating a package:

- [ ] Create `tsconfig.json` with strict mode
- [ ] Rename all `.js` files to `.ts`
- [ ] Rename all `.jsx` files to `.tsx`
- [ ] Add type annotations to all functions
- [ ] Create interfaces for all component props
- [ ] Type all `forwardRef` components with proper generics
- [ ] Use `VariantProps<typeof variants>` for CVA components
- [ ] Fix any null/undefined type mismatches
- [ ] Remove unused imports
- [ ] Resolve any export name conflicts
- [ ] Update `tsup.config.ts` entries and enable `dts: true`
- [ ] Update `package.json` exports with types
- [ ] Bump version to next major (x.0.0)
- [ ] Run `pnpm build` and fix any remaining errors
- [ ] Verify `.d.ts` files are generated in `dist/`

---

## Common Errors and Fixes

### "React is declared but never read"

```
error TS6133: 'React' is declared but its value is never read.
```

**Fix:** Remove the unused React import if you're using the modern JSX transform.

### "Property 'X' does not exist on type"

```
error TS2339: Property 'groupBy' does not exist on type 'ObjectConstructor'.
```

**Fix:** Update `lib` in tsconfig.json to include the required ECMAScript version:

```json
"lib": ["ESNext", "DOM", "DOM.Iterable"]
```

### "Type 'null' is not assignable to type 'X | undefined'"

**Fix:** Use nullish coalescing: `value ?? undefined`

### "Module has already exported a member named 'X'"

**Fix:** Rename one of the conflicting exports or use explicit re-exports.

### "Cannot find name 'X'"

**Fix:** Check that the interface/type was renamed consistently throughout the file.

---

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [CVA Documentation](https://cva.style/docs)
- [tsup Documentation](https://tsup.egoist.dev/)
