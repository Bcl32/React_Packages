import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/Charts.tsx",
    "src/TimeSeriesChart.tsx",
    "src/StatCard.tsx",
    "src/DonutChart.tsx",
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
