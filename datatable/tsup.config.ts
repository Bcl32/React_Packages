import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/DataTable.jsx",
    "src/Table.jsx",
    "src/KeyValueTable.jsx",
    "src/StatsTable.jsx",
    "src/ColumnGenerator.jsx",
    "src/RowActions.jsx",
    "src/TablePagination.jsx",
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
