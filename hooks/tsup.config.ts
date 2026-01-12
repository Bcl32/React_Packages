import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/useDatabaseMutation.js",
    "src/useGetRequest.js",
    "src/useBokehChart.js",
    "src/useDataLoader.js",
    "src/index.js"
  ],
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", /^@bcl32\//]
});
