import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/AddModelForm.tsx",
    "src/EditModelForm.tsx",
    "src/DeleteModelForm.tsx",
    "src/FormElement.tsx",
    "src/ButtonDatePicker.tsx",
    "src/index.ts"
  ],
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", /^@bcl32\//],
  esbuildOptions(options) {
    options.jsx = "automatic";
  }
});
