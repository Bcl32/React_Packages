import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/Alert.jsx",
    "src/AnimatedTabs.jsx",
    "src/AnimatedFileSystem.jsx",
    "src/ShowHeirarchy.jsx",
    "src/ToggleGroup.jsx",
    "src/Dialog.jsx",
    "src/DialogButton.jsx",
    "src/Sidebar.jsx",
    "src/Select.jsx",
    "src/Button.jsx",
    "src/Input.jsx",
    "src/Label.jsx",
    "src/Card.jsx",
    "src/Separator.jsx",
    "src/Skeleton.jsx",
    "src/Sheet.jsx",
    "src/Checkbox.jsx",
    "src/Dropdown.jsx",
    "src/Tooltip.jsx",
    "src/RadioButton.jsx",
    "src/Slider.jsx",
    "src/Breadcrumb.jsx",
    "src/UseIsMobile.jsx",
    "src/FileSystem.jsx",
    "src/cn.js",
    "src/ComputeTimeBounds.js",
    "src/ComputeGroupedStats.js",
    "src/CalculateFeatureStats.js",
    "src/PrintState.js",
    "src/StringFunctions.js",
    "src/dayjs_sorter.js",
    "src/index.js"
  ],
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", /^@bcl32\//],
  esbuildOptions(options) {
    options.jsx = "automatic";
  }
});
