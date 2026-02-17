import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/useDatabaseMutation.ts",
    "src/useGetRequest.ts",
    "src/useApiMutation.ts",
    "src/useBokehChart.ts",
    "src/useDataLoader.ts",
    "src/index.ts"
  ],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", /^@bcl32\//]
});
