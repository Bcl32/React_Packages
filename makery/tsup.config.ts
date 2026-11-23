import { defineConfig } from "tsup";

import { entriesFromExports } from "../tsup-entries";

// ./swatch.css ships as a file (the caller imports it beside the component),
// so it is a static export, not a build entry. three stays external: it is a
// peer, and /finishes, /geometry and /swatch never import it.
export default defineConfig({
  entry: entriesFromExports(__dirname, { staticExports: ["./swatch.css"] }),
  format: ["esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "three", /^three\//, /^@bcl32\//],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
