import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/BokehLineChart.tsx",
    "src/Charts.tsx",
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
