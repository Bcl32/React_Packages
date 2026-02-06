# React Packages Refactoring Log

Documentation of the refactoring work performed across all `@bcl32/*` packages, including the issues encountered, fixes applied, and technical concepts involved.

---

## What Was Done

### 1. Deleted 6 hand-maintained `.d.ts` ambient declaration files

Each package had a manually written `.d.ts` file that declared types for sibling `@bcl32/*` packages. These were a workaround for `moduleResolution: "node"` not being able to read `package.json` `exports` subpath mappings. They were drifting out of sync and masking real type errors.

**Deleted files:**
- `charts/src/bcl32-deps.d.ts`
- `datatable/src/bcl32-deps.d.ts`
- `filters/src/bcl32-deps.d.ts`
- `forms/src/bcl32-deps.d.ts`
- `navigation/src/bcl32-utils.d.ts`
- `themes/src/bcl32-utils.d.ts`

### 2. Removed `PrintState.ts` debug utility

A `console.log` wrapper that shouldn't have been in a published package. Removed from `utils/src/`, its export from `index.ts`, its entry in `tsup.config.ts`, and its subpath in `package.json`.

### 3. Cleaned up datatable re-export of `dayjs_sorter`

`datatable/src/index.ts` was re-exporting `dayjs_sorter` from `@bcl32/utils`, creating a confusing dual import path. Removed — consumers should import directly from the source package.

### 4. Fixed naming inconsistencies

- `ShowHeirarchy` renamed to `ShowHierarchy` (typo fix) across all files, exports, and imports
- `UseIsMobile.tsx` renamed to `useIsMobile.tsx` (hooks should be lowercase by convention)

### 5. Removed `test-package`

`react-packages/test-package/` used the old `@repo/` scope, had no build tooling, used `.jsx`, and wasn't in `pnpm-workspace.yaml`. Deleted entirely.

### 6. Split `@bcl32/utils` into UI + data utilities

Created a new `@bcl32/data-utils` package and moved domain-specific data utilities out of `@bcl32/utils`:

- `CalculateFeatureStats.ts`
- `ComputeTimeBounds.ts`
- `ComputeGroupedStats.ts`
- `dayjs_sorter.ts`
- `StringFunctions.ts`

`@bcl32/utils` is now purely a UI component library. Consumer imports in `filters`, `datatable`, and `Base-POC` were updated to point to `@bcl32/data-utils`.

### 7. Consolidated recharts/dayjs dependencies

- Removed unused `recharts` from `@bcl32/forms`
- Moved `recharts` to `peerDependencies` in `charts` and `filters`
- Moved `dayjs` to `peerDependencies` in `hooks`, `filters`, `datatable`, `forms`, and `data-utils`

### 8. Build verification and type error fixes

Changed all 8 package `tsconfig.json` files from `moduleResolution: "node"` to `"bundler"`, and changed all inter-workspace `@bcl32/*` dependencies to use the `workspace:^2.0.0` protocol. This exposed and required fixing many pre-existing type errors (detailed below).

---

## Build Issues Encountered and Fixed

### `moduleResolution: "node"` cannot resolve subpath exports

**Root cause:** With `moduleResolution: "node"`, TypeScript does not read the `exports` field in `package.json`. So an import like `@bcl32/utils/Button` could not be resolved to `./dist/Button.d.ts`. This was THE reason the hand-maintained `.d.ts` files existed.

**Fix:** Changed all tsconfigs to `moduleResolution: "bundler"`, which reads the `exports` field — matching how the code is actually resolved at build time by tsup/esbuild/Vite.

### pnpm resolving packages from registry instead of workspace

**Problem:** After renaming `ShowHeirarchy` to `ShowHierarchy`, `@bcl32/themes` couldn't find the new name because pnpm was fetching `@bcl32/utils` from the GitHub Packages registry (which still had the old spelling).

**Fix:**
- Added `link-workspace-packages=true` and `prefer-workspace-packages=true` to root `.npmrc`
- Changed all inter-workspace `@bcl32/*` dependencies to `workspace:^2.0.0` protocol
- Regenerated `pnpm-lock.yaml`

### `Object.groupBy` not available (data-utils)

**Problem:** `data-utils` tsconfig had `lib: ["ES2020"]` but `Object.groupBy` requires ES2024+.

**Fix:** Changed to `lib: ["ESNext"]`.

### Pre-existing type errors exposed by `moduleResolution: "bundler"`

With `"node"` resolution, the ambient `.d.ts` files provided fake type definitions that silently papered over mismatches. Switching to `"bundler"` made TypeScript read the real types from each package's `dist/` output, exposing these errors:

#### ModelData type mismatches (datatable <-> forms)

Datatable's local `ModelData` interface uses `model_attributes: unknown[]`, while forms expects `model_attributes: ModelAttribute[]`. Also, `update_api_url` was optional in datatable but required in forms.

**Affected files:** `ColumnGenerator.tsx`, `DataTable.tsx`, `RowActions.tsx`

**Fix:** Added missing fields to local interfaces and applied the `Parameters<typeof>` cast pattern (see below).

#### ColumnDef contravariance (datatable)

`time_created` and `time_updated` columns created via `columnHelper.accessor()` returned `string | undefined`, but the column array expected `ColumnDef<RowData, unknown>`. Contravariance in the cell function type caused incompatibility.

**Fix:** Explicit `ColumnDef<RowData, unknown>` type annotation on the variable and `as unknown` cast on the accessor return value.

#### Invalid props on components

- `RowActions.tsx` passed `onSelect` to `DialogButton` — not a real prop (silently ignored at runtime)
- `RowActions.tsx` passed `create_enabled` and `add_api_url` to `EditModelForm` — these are `AddModelForm` props
- `TimeEditDialog.tsx` passed `filter` to `RadioButton` — not used by the component

**Fix:** Removed the invalid props.

#### ModelAttribute vs FeatureMetadata (filters)

`filters/ProcessDataset.ts` passes `ModelAttribute[]` (where `type: string`) to `CalculateFeatureStats` which expects `FeatureMetadata[]` (where `type` is a string literal union). Compatible at runtime, but TypeScript can't narrow `string` to the union.

**Fix:** Cast via `Parameters<typeof CalculateFeatureStats>[0]`.

#### BokehLineChart unknown types (charts)

`embed.embed_item()` and `JSON.parse()` received `unknown` typed values.

**Fix:** Added type casts.

---

## Technical Concepts

### ESM vs DTS

**ESM (ECMAScript Modules)** is the JavaScript output — the runnable code. It uses the modern `import`/`export` syntax. These are the `.js` files in `dist/`.

**DTS (Declaration Type System files)** are the `.d.ts` type declaration files. They contain only type information (interfaces, type annotations, function signatures) with no runtime code. They power autocomplete, type checking, and editor intellisense for consumers of the package.

- **ESM** = the code that runs
- **DTS** = the types that other packages see

That's why errors appeared only in the "DTS Build" phase — JavaScript compiled fine, but generating `.d.ts` files triggered strict type checking.

### tsup

tsup is a zero-config bundler for TypeScript libraries. It wraps **esbuild** (extremely fast JS/TS compiler) for JavaScript output and **TypeScript's compiler** for generating declaration files.

Each package has a `tsup.config.ts` defining entry points. When you run `tsup`, it:

1. Compiles `.tsx`/`.ts` to `.js` using esbuild (the ESM build — ~20-40ms)
2. Generates `.d.ts` files using the TypeScript compiler (the DTS build — ~1-5s)

Both outputs go into `dist/`, consumed via the `exports` field in `package.json`.

### moduleResolution: "node" vs "bundler"

`moduleResolution` tells TypeScript how to find the file when you write an import like `import { Button } from "@bcl32/utils/Button"`.

**`"node"` (old setting)** mimics traditional Node.js resolution. It looks for:
1. `node_modules/@bcl32/utils/Button.js`
2. `node_modules/@bcl32/utils/Button/index.js`
3. The `main` field in `package.json`

It **does not** read the `exports` field. So subpath mappings like `"./Button" -> "./dist/Button.d.ts"` were invisible. That's why the hand-maintained `.d.ts` files existed.

**`"bundler"` (new setting)** mimics modern bundlers (Vite, esbuild, tsup). It:
1. Reads the `exports` field in `package.json`
2. Finds `"./Button"` maps to `"./dist/Button.d.ts"`
3. Loads types directly from the built output

This matches how code actually runs at build time. No ambient `.d.ts` workarounds needed.

| Mode | Reads `exports`? | Use case |
|------|-----------------|----------|
| `"node"` | No | Legacy Node.js (CommonJS) |
| `"node16"` / `"nodenext"` | Yes | Modern Node.js (requires `.js` extensions in imports) |
| `"bundler"` | Yes | Bundled code (Vite, tsup, esbuild, webpack) |

### The `Parameters<typeof>` Cast Pattern

When two packages define separate interfaces with the same name (e.g., both datatable and forms define `ModelData`), TypeScript treats them as unrelated types even if they're structurally similar. This pattern bridges that gap:

```ts
ModelData as Parameters<typeof EditModelForm>[0]["ModelData"]
```

Breaking it down:
- `typeof EditModelForm` — gets the function type of the component
- `Parameters<...>` — extracts the parameter types as a tuple
- `[0]` — gets the first parameter (the props object)
- `["ModelData"]` — gets the `ModelData` property from those props

This says "whatever type `EditModelForm` actually expects for `ModelData`, treat my value as that type." It stays in sync automatically if the target component changes its types, without needing an explicit export of the internal interface.

**Limitation:** These casts bypass type safety at package boundaries. If the target component adds a required field, the cast will silently hide the mismatch. The long-term fix is defining a single shared interface that all packages import.

### Double Casting Through `unknown`

```ts
row.original as unknown as Parameters<typeof EditModelForm>[0]["obj_data"]
```

TypeScript's `as` only works when two types sufficiently overlap. When they don't (e.g., a generic record type and a specific interface), you need two casts:

1. `as unknown` — cast to TypeScript's "I know nothing" type (the stepping stone)
2. `as TargetType` — cast from unknown to the desired type

A single cast would fail with: *"neither type sufficiently overlaps with the other"*.

---

## Final Package Dependency Graph

```
utils ─────────────── (leaf - no @bcl32 deps)
hooks ─────────────── (leaf - no @bcl32 deps)
data-utils ────────── (leaf - no @bcl32 deps)
navigation ────────── utils
themes ────────────── utils
charts ────────────── utils, hooks
forms ─────────────── utils, hooks
datatable ─────────── utils, hooks, forms, data-utils
filters ───────────── utils, charts, data-utils
```

All 9 packages build successfully (ESM + DTS) with `pnpm -r build`.
