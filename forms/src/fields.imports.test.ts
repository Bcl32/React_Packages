// @vitest-environment node
/**
 * The light entries stay light. Walks the static import graph from
 * `src/fields.ts` and `src/validate.ts` (following relative imports and
 * `@bcl32/*` imports into their packages' source) and fails on any banned
 * specifier. Type-only imports are skipped: the compiler erases them.
 *
 * A failure here means a customer page importing `@bcl32/forms/fields`
 * would pull react-query, dayjs, a date picker or a tooltip into its bundle.
 */
import { existsSync, readFileSync, statSync } from "fs";
import { dirname, join, resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const FORMS_SRC = resolve(__dirname);

const BANNED_FIELDS: RegExp[] = [
  /^@bcl32\/hooks(\/|$)/,
  /^@tanstack\/react-query/,
  /^sonner$/,
  /^dayjs(\/|$)/,
  /^@bcl32\/utils\/(Combobox|DateTimePicker|Tooltip)$/,
  /^@radix-ui\/react-tooltip/,
];
const BANNED_LOCAL_FIELDS = /\/(RelationCollectionField|ColourField|ColourArrayField|FormElement|EditableDetailItem|useGroupedSwatches)\.tsx?$/;

/** The specifiers a module imports at runtime (not `import type`, not all-`type` braces). */
export function runtimeImports(source: string): string[] {
  const found: string[] = [];
  const re = /(?:^|\n)\s*(import|export)\s+([^;]*?)\s*from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']/g;
  for (const m of source.matchAll(re)) {
    if (m[4]) {
      found.push(m[4]); // a bare side-effect import
      continue;
    }
    const clause = m[2].trim();
    if (/^type\b/.test(clause)) continue;
    const braces = clause.match(/^\{([\s\S]*)\}$/);
    if (braces) {
      const names = braces[1].split(",").map((s) => s.trim()).filter(Boolean);
      if (names.length > 0 && names.every((n) => /^type\s/.test(n))) continue;
    }
    found.push(m[3]);
  }
  return found;
}

function resolveFile(base: string): string | undefined {
  const candidates = [base, `${base}.tsx`, `${base}.ts`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
}

/** `@bcl32/pkg/Sub` → the workspace source file, via the same mapping tsup uses. */
function resolveWorkspace(spec: string): string | undefined {
  const m = spec.match(/^@bcl32\/([^/]+)(?:\/(.+))?$/);
  if (!m) return undefined;
  const dir = join(ROOT, m[1], "src");
  return resolveFile(join(dir, m[2] ?? "index"));
}

/** Every module reached from `entry`, with the bare specifiers each imports. */
function walk(entry: string) {
  const seen = new Set<string>();
  const bare: { from: string; spec: string }[] = [];
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of runtimeImports(readFileSync(file, "utf8"))) {
      if (spec.startsWith(".")) {
        const next = resolveFile(resolve(dirname(file), spec));
        if (!next) throw new Error(`${file}: cannot resolve ${spec}`);
        queue.push(next);
        continue;
      }
      bare.push({ from: file.replace(ROOT + "/", ""), spec });
      const ws = resolveWorkspace(spec);
      if (ws) queue.push(ws);
    }
  }
  return { files: [...seen].map((f) => f.replace(ROOT + "/", "")), bare };
}

describe("runtimeImports", () => {
  it("skips type-only imports and keeps the rest", () => {
    const src = [
      'import type { A } from "a";',
      'import { type B, type C } from "b";',
      'import { type D, e } from "d";',
      'import * as React from "react";',
      'export { f } from "./f";',
      'export type { G } from "./g";',
      'import "side-effect";',
    ].join("\n");
    expect(runtimeImports(src)).toEqual(["d", "react", "./f", "side-effect"]);
  });
});

describe("@bcl32/forms/fields import graph", () => {
  const graph = walk(join(FORMS_SRC, "fields.ts"));

  it("reaches no banned package", () => {
    const hits = graph.bare.filter(({ spec }) => BANNED_FIELDS.some((re) => re.test(spec)));
    expect(hits).toEqual([]);
  });

  it("reaches none of forms' heavy modules", () => {
    expect(graph.files.filter((f) => BANNED_LOCAL_FIELDS.test(f))).toEqual([]);
  });

  it("actually walked something (the walker is not vacuous)", () => {
    expect(graph.files).toContain("forms/src/fields/FieldInput.tsx");
    expect(graph.files).toContain("utils/src/Input.tsx");
    expect(graph.bare.map((b) => b.spec)).toContain("react");
  });
});

describe("@bcl32/forms/validate import graph", () => {
  const graph = walk(join(FORMS_SRC, "validate.ts"));

  it("imports no React and nothing but data-utils' numbers", () => {
    const specs = [...new Set(graph.bare.map((b) => b.spec))].sort();
    expect(specs).toEqual(["@bcl32/data-utils/numbers"]);
  });
});

describe("@bcl32/forms/ColourFieldView import graph", () => {
  const graph = walk(join(FORMS_SRC, "ColourFieldView.tsx"));

  it("never reaches a fetch: no hooks, no react-query", () => {
    const hits = graph.bare.filter(({ spec }) => /^@bcl32\/hooks(\/|$)|^@tanstack\/react-query/.test(spec));
    expect(hits).toEqual([]);
    expect(graph.files.filter((f) => f.endsWith("useGroupedSwatches.ts"))).toEqual([]);
  });
});
