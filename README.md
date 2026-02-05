# @bcl32 React Packages

Shared React component library for the web-app-monorepo. All packages are written in TypeScript with strict mode and include type declarations.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| `@bcl32/utils` | Core UI components (Button, Card, Dialog, Input, etc.) | 2.0.0 |
| `@bcl32/hooks` | React hooks (useGetRequest, useDatabaseMutation, useBokehChart) | 2.0.0 |
| `@bcl32/themes` | Theme system with 8 color themes | 2.0.0 |
| `@bcl32/forms` | Form components (AddModelForm, EditModelForm, FormElement) | 2.0.0 |
| `@bcl32/charts` | Chart components (BokehLineChart, Recharts wrappers) | 2.0.0 |
| `@bcl32/filters` | 16 filter components for data filtering UI | 2.0.0 |
| `@bcl32/datatable` | DataTable with sorting, pagination, row selection | 2.0.0 |
| `@bcl32/navigation` | Navigation components (Breadcrumb, NavigationProvider) | 2.0.0 |

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

For subpath imports to resolve correctly, use `moduleResolution: "bundler"` or `"node16"`:

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

```bash
# Single package
./publish-package.sh utils

# All packages (in dependency order)
./publish-all.sh
```

Publish order: utils → themes → hooks → filters → datatable → forms → charts → navigation

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
