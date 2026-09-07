import { defineConfig } from "tsup";

import { entriesFromExports } from "../tsup-entries";

export default defineConfig({
  entry: entriesFromExports(__dirname),
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", /^@bcl32\//]
});
