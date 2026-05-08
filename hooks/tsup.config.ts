import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/ApiError.ts",
    "src/apiFetch.ts",
    "src/useDatabaseMutation.ts",
    "src/useGetRequest.ts",
    "src/useApiMutation.ts",
    "src/useBokehChart.ts",
    "src/useDataLoader.ts",
    "src/index.ts"
  ],
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", /^@bcl32\//]
});
