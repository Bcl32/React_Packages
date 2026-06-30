# @bcl32 React Packages

Shared React component library for the web-app-monorepo. All packages are written in TypeScript with strict mode and include type declarations.

## Packages

| Package | Description |
|---------|-------------|
| `@bcl32/utils` | Core UI components (Button, Card, Dialog, Input, etc.) |
| `@bcl32/hooks` | React hooks (useGetRequest, useDatabaseMutation, useBokehChart) |
| `@bcl32/data-utils` | Domain data utilities (CalculateFeatureStats, ComputeTimeBounds, ComputeGroupedStats, dayjs_sorter, StringFunctions) |
| `@bcl32/themes` | Theme system with 10 color themes |
| `@bcl32/forms` | Form components (AddModelForm, EditModelForm, FormElement) |
| `@bcl32/charts` | Chart components (BokehLineChart, Recharts wrappers) |
| `@bcl32/filters` | Filter context, 10+ filter/chart UI components, and data-processing utilities |
| `@bcl32/datatable` | DataTable with sorting, pagination, row selection |
| `@bcl32/navigation` | Navigation components (Breadcrumb, NavigationProvider) |

> Versions are intentionally not listed here — they change on every publish. The source of truth for each package's current version is its own `package.json` (mirrored by the GitHub Package Registry); cross-package version floors live in each package's `package.json` and the workspace is defined in `pnpm-workspace.yaml`.

## Installation

Packages are published to GitHub Package Registry.

### 1. Configure npm for @bcl32 scope

Create or update `.npmrc` in your project:

```ini
@bcl32:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 2. Install packages

```bash
pnpm add @bcl32/utils @bcl32/hooks @bcl32/themes
```

## Usage

```tsx
import { Button, Card, Dialog } from "@bcl32/utils";
import { useGetRequest, useDatabaseMutation } from "@bcl32/hooks";
import { DataTable } from "@bcl32/datatable";

function MyComponent() {
  const { data, isLoading } = useGetRequest("/api/items");

  return (
    <Card>
      <Button variant="blue" size="lg">
        Click me
      </Button>
    </Card>
  );
}
```

### Subpath Imports

Each package supports subpath imports for tree-shaking:

```tsx
// Import specific components
import { Button } from "@bcl32/utils/Button";
import { Card } from "@bcl32/utils/Card";
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
```

## TypeScript Support

All packages include TypeScript declarations (`.d.ts` files). Type checking works out of the box:

```tsx
import { Button, type ButtonProps } from "@bcl32/utils";

// Full type inference and autocomplete
const props: ButtonProps = {
  variant: "blue",  // autocomplete shows available variants
  size: "lg",
  onClick: () => console.log("clicked"),
};
```

### tsconfig Requirements

For subpath imports to resolve correctly, use `moduleResolution: "bundler"` — this is the setting in `react-packages/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## Development

### Building Packages

```bash
cd react-packages/<package>
pnpm build
```

### Publishing

Publishing is automated through changeset-based CI — there are no `publish-package.sh` or `publish-all.sh` scripts.

- `.githooks/post-commit` auto-generates a changeset file (`.changeset/auto-*.md`, one `patch` entry per touched package) whenever a commit touches a package directory.
- Pushing those changesets to `main` triggers `.github/workflows/publish-react-packages.yml`, which runs `pnpm changeset version`, `pnpm -r build`, and `pnpm -r publish` to GitHub Packages, then commits the version bumps.

See `CHANGESETS-MIGRATION.md` and the `npm-publishing` skill for the full flow.

#### Build/publish tiers (informational)

There is no valid linear publish order — the packages depend on each other as a graph, not a line (the old `utils → themes → …` ordering was circular and wrong). Because publishing is automated, build order is resolved topologically by `pnpm -r` from the workspace graph; you never run it by hand. For reference, the packages form a 3-tier dependency DAG:

- **Tier 0** (no `@bcl32` dependencies): `utils`, `hooks`, `data-utils`
- **Tier 1** (depend on Tier 0): `themes`, `forms`, `charts`, `navigation`
- **Tier 2** (depend on Tier 0/1): `datatable`, `filters`

## Documentation

- [TypeScript Migration Guide](./TYPESCRIPT-MIGRATION-GUIDE.md) - How the packages were migrated to TypeScript

## Version History

### 2.0.0 (February 2026)

- Complete TypeScript migration with strict mode
- Added `.d.ts` declaration files for all exports
- Updated package.json exports with `types` field
- Breaking: Some internal component names changed for type safety

### 1.x

- JavaScript packages without type declarations
