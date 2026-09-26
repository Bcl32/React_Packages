/**
 * One vitest config for every workspace package.
 *
 * Tests run in plain Node by default; a component test opts into a DOM with a
 * `// @vitest-environment jsdom` first line (and a jsdom devDependency, added
 * with the first such test).
 *
 * Cross-package imports are aliased to SOURCE. Without this, `@bcl32/x` in a
 * test resolves through the workspace symlink to x's exports map, which points
 * at dist/ — whatever build was last left on disk, stale or missing — and a
 * test would pass or fail for reasons unrelated to the change under test. The
 * alias table is derived from each exports map with the same mapping tsup uses
 * (tsup-entries.ts), so the two cannot disagree.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { defineConfig } from "vitest/config";

import { exportSource } from "./tsup-entries";

function workspaceDirs(): string[] {
  // pnpm-workspace.yaml is a flat list of `  - "dir"` lines.
  const yaml = readFileSync(join(__dirname, "pnpm-workspace.yaml"), "utf-8");
  return [...yaml.matchAll(/^\s*-\s*["']?([^"'\s]+)["']?\s*$/gm)].map((m) => m[1]);
}

function srcAliases() {
  const aliases: { find: RegExp; replacement: string }[] = [];
  for (const dir of workspaceDirs()) {
    const pkgDir = join(__dirname, dir);
    const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8")) as {
      name: string;
      exports?: Record<string, unknown>;
    };
    for (const key of Object.keys(pkg.exports ?? {})) {
      // Static exports (a Tailwind preset, a JSON palette) have no source
      // module; they keep resolving to the shipped file.
      const source = exportSource(pkgDir, key);
      if (!source) continue;
      const specifier = key === "." ? pkg.name : `${pkg.name}/${key.slice(2)}`;
      const escaped = specifier.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      aliases.push({ find: new RegExp(`^${escaped}$`), replacement: join(pkgDir, source) });
    }
  }
  return aliases;
}

export default defineConfig({
  resolve: { alias: srcAliases() },
  test: {
    environment: "node",
    include: ["*/src/**/*.test.{ts,tsx}"],
  },
});
