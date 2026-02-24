import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/ComputeTimeBounds.ts",
    "src/ComputeGroupedStats.ts",
    "src/CalculateFeatureStats.ts",
    "src/StringFunctions.ts",
    "src/dayjs_sorter.ts",
    "src/index.ts"
  ],
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: [/^@bcl32\//]
});
