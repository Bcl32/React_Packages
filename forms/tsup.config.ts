import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/AddModelForm.tsx",
    "src/BulkEditModelForm.tsx",
    "src/EditModelForm.tsx",
    "src/DeleteModelForm.tsx",
    "src/FormElement.tsx",
    "src/ColourField.tsx",
    "src/ColourArrayField.tsx",
    "src/AutoGrowTextarea.tsx",
    "src/RelationCollectionField.tsx",
    "src/useDebouncedCallback.ts",
    "src/index.ts"
  ],
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", /^@bcl32\//],
  esbuildOptions(options) {
    options.jsx = "automatic";
  }
});
