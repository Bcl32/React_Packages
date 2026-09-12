#!/usr/bin/env node
/**
 * check-barrel.mjs — the barrel may not publish what the exports map does not.
 *
 * Three surfaces answer "what is public" in this workspace: the exports map,
 * the build's entry list, and `src/index.ts`. tsup-entries.ts derived the
 * second FROM the first, so those two cannot disagree. The barrel was left
 * independent, and it drifted: `RowEditButton` reached consumers through
 * `export * from "./RowEditButton"` while the exports map never named
 * `./RowEditButton`, so no dist/RowEditButton.js was built and every subpath
 * import of it failed — in Home Helper's CI, one repo away, after release.
 *
 * The asymmetry that hid it: a module re-exported from the barrel and nowhere
 * else is indistinguishable, to every other check here, from one that is
 * deliberately barrel-only. Nothing can infer the intent, so this asks for it.
 * Every module the barrel re-exports must either
 *
 *   - be named in the exports map (public, reachable both ways), or
 *   - be listed in `bcl32.barrelOnlyModules` in its package.json (public
 *     through the barrel ONLY, on purpose).
 *
 * The list is a decision, not a suppression, and it lives beside the exports
 * map it qualifies. Like tsup-entries' `staticExports`, it should stay short:
 * every entry is a name consumers can only reach the way 98% of this fleet's
 * imports do not.
 *
 * A stale entry is also an error — listing a module that DOES have a subpath
 * means the two answers disagree again, in the other direction.
 *
 * Usage:  node .github/scripts/check-barrel.mjs [pkgDir ...]
 *         With no args, every package in pnpm-workspace.yaml is checked.
 * Exit 1 lists every undeclared module; exit 2 is a usage failure.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);

function workspacePackages() {
  const yaml = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  return [...yaml.matchAll(/^\s*-\s*["']?([^"'\s]+)["']?\s*$/gm)].map((m) => m[1]);
}

/**
 * Modules the barrel re-exports. Covers `export * from "./X"`,
 * `export { a, b } from "./X"` and `export { default as X } from "./X"` —
 * every form that makes one of this package's own modules reachable from the
 * root. Relative paths only: a re-export of another package is that package's
 * business, not this one's.
 */
function barrelModules(indexSrc) {
  return new Set([...indexSrc.matchAll(/\bfrom\s*["']\.\/([A-Za-z0-9_-]+)["']/g)].map((m) => m[1]));
}

const args = process.argv.slice(2);
const dirs = args.length ? args : workspacePackages();

let failed = false;
for (const rel of dirs) {
  const dir = resolve(ROOT, rel);
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) {
    console.error(`${rel}: no package.json`);
    process.exit(2);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const label = pkg.name ?? rel;

  const indexPath = ["src/index.ts", "src/index.tsx"].map((p) => join(dir, p)).find(existsSync);
  if (!indexPath) continue; // no barrel, nothing to keep in step

  const exported = new Set(
    Object.keys(pkg.exports ?? {})
      .filter((k) => k.startsWith("./"))
      .map((k) => k.slice(2)),
  );
  const allowed = new Set(pkg.bcl32?.barrelOnlyModules ?? []);
  const inBarrel = barrelModules(readFileSync(indexPath, "utf8"));

  const undeclared = [...inBarrel].filter((m) => !exported.has(m) && !allowed.has(m)).sort();
  const stale = [...allowed].filter((m) => exported.has(m)).sort();
  const absent = [...allowed].filter((m) => !inBarrel.has(m)).sort();

  if (undeclared.length) {
    failed = true;
    console.error(`\n${label}: ${undeclared.length} module(s) re-exported by the barrel with no subpath export:`);
    for (const m of undeclared) {
      console.error(`  ${m}`);
      console.error(
        `      public? add "./${m}": { "types": "./dist/${m}.d.ts", "import": "./dist/${m}.js" } to exports`,
      );
      console.error(`      barrel-only on purpose? add "${m}" to bcl32.barrelOnlyModules`);
    }
  }
  if (stale.length) {
    failed = true;
    console.error(
      `\n${label}: bcl32.barrelOnlyModules lists ${stale.join(", ")}, which the exports map also names — drop it from the list.`,
    );
  }
  if (absent.length) {
    failed = true;
    console.error(
      `\n${label}: bcl32.barrelOnlyModules lists ${absent.join(", ")}, which the barrel does not re-export — drop it from the list.`,
    );
  }
  if (!undeclared.length && !stale.length && !absent.length) {
    const note = allowed.size ? ` (${allowed.size} barrel-only by declaration)` : "";
    console.log(`${label}: barrel agrees with exports${note}`);
  }
}

if (failed) {
  console.error("\nThe barrel and the exports map disagree about what is public. See the lines above.");
  process.exit(1);
}
