import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/AllFilters.tsx",
    "src/FilterElement.tsx",
    "src/ChartFilter.tsx",
    "src/FiltersSummary.tsx",
    "src/SelectFilter.tsx",
    "src/TimeFilter.tsx",
    "src/FilterContext.tsx",
    "src/BarChartFilter.tsx",
    "src/BarChartSwitcher.tsx",
    "src/StackedBarChart.tsx",
    "src/LineChartFilter.tsx",
    "src/PieChartFilter.tsx",
    "src/Histogram.tsx",
    "src/ListFilter.tsx",
    "src/DebouncedNumberFilter.tsx",
    "src/DebouncedTextFilter.tsx",
    "src/TimeEditDialog.tsx",
    "src/GetSubkeyValues.ts",
    "src/ApplyFilters.ts",
    "src/GetActiveFilters.ts",
    "src/InitializeFilters.ts",
    "src/GroupFilters.ts",
    "src/ProcessDataset.ts",
    "src/types.ts",
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
