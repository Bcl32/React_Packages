#!/usr/bin/env node
/**
 * check-exports.mjs — every public entry point must exist in the artifact
 * that will be published.
 *
 * tsup-entries.ts (at the workspace root) derives each package's build
 * entries FROM its exports map, so an export with no source file fails the
 * build. This is the other half: after the build, resolve every file the
 * package.json points consumers at — each string inside `exports` (however
 * deeply nested in condition objects), plus `main`, `module`, `types` and
 * `bin` — and require it to be in the tarball `npm pack` would produce.
 *
 * "In the tarball", not "on disk": the `files` whitelist is applied at pack
 * time, so a target that exists locally but is not whitelisted (themes ships
 * ./src/themes.json and ./tailwind-preset.cjs that way) is still broken for
 * every consumer. `npm pack --dry-run --json` applies the same rules the
 * publish does, without touching the registry.
 *
 * Both shipped defects this guards against published GREEN: a green build,
 * typecheck and publish say nothing about whether a subpath resolves, because
 * the first thing that dereferences an exports map is a consumer's bundler,
 * one repo away, after release.
 *
 * Usage:  node .github/scripts/check-exports.mjs [pkgDir ...]
 *         With no args, every package in pnpm-workspace.yaml is checked.
 * Exit 1 lists every missing target; exit 2 is a usage/packing failure.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);

function workspacePackages() {
  const yaml = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  return [...yaml.matchAll(/^\s*-\s*["']?([^"'\s]+)["']?\s*$/gm)].map((m) => m[1]);
}

/** Every string reachable inside an exports value: "./dist/x.js" or nested conditions. */
function targetsOf(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => targetsOf(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => targetsOf(v, out));
  return out;
}

function packedFiles(pkgDir) {
  // --ignore-scripts: prepublishOnly must not run a build from inside the check.
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: pkgDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const [entry] = JSON.parse(raw);
  return new Set(entry.files.map((f) => f.path));
}

function checkPackage(pkgDir) {
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  if (pkg.private) return { name: pkg.name, skipped: "private" };

  const wanted = new Map(); // normalised path -> where it was declared
  const declare = (path, where) => {
    if (typeof path !== "string") return;
    wanted.set(path.replace(/^\.\//, ""), where);
  };
  for (const [key, value] of Object.entries(pkg.exports ?? {})) {
    targetsOf(value).forEach((t) => declare(t, `exports["${key}"]`));
  }
  for (const field of ["main", "module", "types"]) declare(pkg[field], field);
  if (typeof pkg.bin === "string") declare(pkg.bin, "bin");
  else if (pkg.bin) Object.values(pkg.bin).forEach((b) => declare(b, "bin"));

  const packed = packedFiles(pkgDir);
  const missing = [];
  for (const [path, where] of wanted) {
    if (packed.has(path)) continue;
    const onDisk = existsSync(join(pkgDir, path));
    missing.push({ path, where, onDisk });
  }
  return { name: pkg.name, checked: wanted.size, missing, hasExports: !!pkg.exports };
}

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : workspacePackages();
let failed = false;
for (const dir of dirs) {
  const pkgDir = resolve(ROOT, dir);
  if (!existsSync(join(pkgDir, "package.json"))) {
    console.error(`::error::${dir}: no package.json`);
    failed = true;
    continue;
  }
  let result;
  try {
    result = checkPackage(pkgDir);
  } catch (err) {
    console.error(`::error::${dir}: could not pack — ${err.message.split("\n")[0]}`);
    failed = true;
    continue;
  }
  const label = relative(ROOT, pkgDir);
  if (result.skipped) {
    console.log(`  ${label}: skipped (${result.skipped})`);
    continue;
  }
  if (!result.hasExports) {
    console.log(`  ${label}: ::warning::no exports map — only main/module/types checked`);
  }
  if (result.missing.length === 0) {
    console.log(`  ${label}: ok — ${result.checked} entry point(s) present in the packed artifact`);
    continue;
  }
  failed = true;
  for (const m of result.missing) {
    const why = m.onDisk
      ? "exists on disk but is NOT in the packed artifact — add it to \"files\""
      : "does not exist — the build did not produce it";
    console.error(`::error::${result.name}: ${m.where} -> ./${m.path} ${why}`);
  }
}

if (failed) {
  console.error(
    "\nAn entry point consumers may import would not resolve after publish. " +
      "A green build and publish do not catch this; the first thing that does is a consumer's bundler.",
  );
  process.exit(1);
}
