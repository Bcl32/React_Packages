import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/AllFilters.jsx",
    "src/FilterElement.jsx",
    "src/ChartFilter.jsx",
    "src/FiltersSummary.jsx",
    "src/SelectFilter.jsx",
    "src/TimeFilter.jsx",
    "src/FilterContext.jsx",
    "src/BarChartFilter.jsx",
    "src/BarChartSwitcher.jsx",
    "src/StackedBarChart.jsx",
    "src/LineChartFilter.jsx",
    "src/PieChartFilter.jsx",
    "src/Histogram.jsx",
    "src/ListFilter.jsx",
    "src/DebouncedNumberFilter.jsx",
    "src/DebouncedTextFilter.jsx",
    "src/TimeEditDialog.jsx",
    "src/GetSubkeyValues.js",
    "src/ApplyFilters.js",
    "src/GetActiveFilters.js",
    "src/InitializeFilters.js",
    "src/GroupFilters.js",
    "src/ProcessDataset.js",
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
