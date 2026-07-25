import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/Theming.tsx",
    "src/ThemeGenerator.tsx",
    "src/ThemeProvider.tsx",
    "src/ThemePanel.tsx",
    "src/ThemeExample.tsx",
    "src/ThemeDropdownSelect.tsx",
    "src/ColourControls.tsx",
    "src/ColourConverter.tsx",
    "src/ColourPicker.tsx",
    "src/CopyTheme.tsx",
    "src/ImportTheme.tsx",
    "src/colorUtils.ts",
    "src/contrastCheck.ts",
    "src/themeMeta.ts",
    "src/themeOverrides.ts",
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
