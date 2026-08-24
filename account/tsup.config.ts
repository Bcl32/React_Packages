import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/types.ts",
    "src/Avatar.tsx",
    "src/UserProvider.tsx",
    "src/UserBadge.tsx",
    "src/ActivityTimeline.tsx",
    "src/ActivityFeed.tsx",
    "src/AccountPanel.tsx",
    "src/SidebarUserSection.tsx",
    "src/useAccountCommands.ts",
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
