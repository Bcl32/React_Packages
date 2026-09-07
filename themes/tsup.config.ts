import { defineConfig } from "tsup";

import { entriesFromExports } from "../tsup-entries";

export default defineConfig({
  entry: entriesFromExports(__dirname, { staticExports: ["./tailwind-preset", "./themes.json"] }),
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
