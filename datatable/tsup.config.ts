import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/DataTable.tsx",
    "src/TableView.tsx",
    "src/CardView.tsx",
    "src/BoardView.tsx",
    "src/RowCard.tsx",
    "src/Table.tsx",
    "src/KeyValueTable.tsx",
    "src/StatsTable.tsx",
    "src/ColumnGenerator.tsx",
    "src/RowActions.tsx",
    "src/TablePagination.tsx",
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
