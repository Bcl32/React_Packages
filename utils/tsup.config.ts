import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/Alert.tsx",
    "src/AnimatedTabs.tsx",
    "src/AnimatedFileSystem.tsx",
    "src/ShowHierarchy.tsx",
    "src/ToggleGroup.tsx",
    "src/Dialog.tsx",
    "src/DialogButton.tsx",
    "src/Sidebar.tsx",
    "src/Select.tsx",
    "src/Button.tsx",
    "src/Input.tsx",
    "src/Label.tsx",
    "src/Card.tsx",
    "src/Separator.tsx",
    "src/Skeleton.tsx",
    "src/Sheet.tsx",
    "src/Checkbox.tsx",
    "src/Dropdown.tsx",
    "src/Tooltip.tsx",
    "src/RadioButton.tsx",
    "src/Slider.tsx",
    "src/Breadcrumb.tsx",
    "src/useIsMobile.tsx",
    "src/FileSystem.tsx",
    "src/StatusBanner.tsx",
    "src/cn.ts",
    "src/index.ts"
  ],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", /^@bcl32\//],
  esbuildOptions(options) {
    options.jsx = "automatic";
  }
});
