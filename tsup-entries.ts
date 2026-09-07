/**
 * ============================================================================
 * tsup-entries - derive a package's build entries from its exports map
 * ============================================================================
 *
 * Every package used to keep the same list twice: `exports` in package.json
 * (what consumers may import) and `entry` in tsup.config.ts (what actually
 * gets built). Nothing checked that they agreed, and twice they did not:
 *
 *   @bcl32/filters 3.10.0    ./PageFilterBar — Print-Tracker's build red for
 *                            three days ("Rollup failed to resolve import")
 *   @bcl32/data-utils        ./types — declared 2026-02-13, never built, and
 *                            invisible for seven months because index.ts
 *                            re-exports the same file
 *
 * Both published GREEN. tsup builds exactly what it is told, changesets
 * versions whatever it is handed, and `npm install` never dereferences an
 * exports map — so the first thing that resolves a subpath is a CONSUMER's
 * bundler, one repo away, after release.
 *
 * The fix is to stop keeping the second list. The exports map is the real
 * contract; entries are derived from it, so the two cannot disagree.
 *
 * MAPPING: an export key "./Foo" builds "src/Foo.tsx", or "src/Foo.ts" when
 * there is no .tsx. The root key "." maps to "src/index.ts". Entry ORDER does
 * not affect tsup's output (verified: filters, 35 entries, 178 files
 * byte-identical when reordered), so exports order is used as-is.
 *
 * IT THROWS rather than skips. An export whose source file is missing is the
 * exact defect this module exists to prevent — quietly dropping it from the
 * entry list would rebuild the bug with a friendlier face. Exports that are
 * genuinely not modules (themes ships a Tailwind preset and a JSON palette)
 * must be named in `staticExports`, and that list should stay short: adding
 * an entry to it is the one way back to a broken published export.
 * ============================================================================
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface EntriesOptions {
  /**
   * Export keys that are shipped files rather than compiled modules, e.g.
   * "./tailwind-preset". Named explicitly so the throw stays meaningful.
   */
  staticExports?: string[];
  /**
   * Modules to build that are NOT public exports — a separately-chunked
   * internal module, say. Empty everywhere today; the hatch exists so that
   * wanting one is not a reason to abandon derivation.
   */
  extraEntries?: string[];
}

export function entriesFromExports(pkgDir: string, opts: EntriesOptions = {}): string[] {
  const staticExports = new Set(opts.staticExports ?? []);
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8")) as {
    name?: string;
    exports?: Record<string, unknown>;
  };
  const label = pkg.name ?? pkgDir;

  const entries: string[] = [];
  for (const key of Object.keys(pkg.exports ?? {})) {
    if (staticExports.has(key)) continue;

    const base = key === "." ? "index" : key.replace(/^\.\//, "");
    const source = [".tsx", ".ts"]
      .map((ext) => `src/${base}${ext}`)
      .find((rel) => existsSync(join(pkgDir, rel)));

    if (!source) {
      throw new Error(
        `${label}: exports "${key}" but neither src/${base}.tsx nor src/${base}.ts exists. ` +
          "Add the source file, drop the export, or — only if it ships as a static asset — " +
          "list the key in staticExports.",
      );
    }
    entries.push(source);
  }

  return [...entries, ...(opts.extraEntries ?? [])];
}
