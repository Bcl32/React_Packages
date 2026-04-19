# Package Model & Workspace Guide

How `@bcl32/*` packages resolve, build, and ship — across the host, dev containers, and prod containers.

## Contents

1. [Package managers: why npm and pnpm both appear](#1-package-managers-why-npm-and-pnpm-both-appear)
2. [What a pnpm workspace is](#2-what-a-pnpm-workspace-is)
3. [Where the workspace matters vs doesn't](#3-where-the-workspace-matters-vs-doesnt)
4. [Dev compose: how live @bcl32 editing actually works](#4-dev-compose-how-live-bcl32-editing-actually-works)
5. [Prod compose: workspace is absent by design](#5-prod-compose-workspace-is-absent-by-design)
6. [Package declaration patterns in consumer apps](#6-package-declaration-patterns-in-consumer-apps)
7. [dependencies vs peerDependencies for inter-@bcl32 links](#7-dependencies-vs-peerdependencies-for-inter-bcl32-links)
8. [Version hygiene: stale caret floors](#8-version-hygiene-stale-caret-floors)
9. [Multi-copy bundling: the major-bump time bomb](#9-multi-copy-bundling-the-major-bump-time-bomb)
10. [CI / Dockerfile workflow impact](#10-ci--dockerfile-workflow-impact)
11. [Tooling: pnpm outdated and deps-sync](#11-tooling-pnpm-outdated-and-deps-sync)
12. [Commands quick reference](#12-commands-quick-reference)

---

## 1. Package managers: why npm and pnpm both appear

Both manage Node packages and both read `package.json`, but they store and link dependencies differently — and that difference is why both appear in this repo.

### Core difference: disk layout

**npm** installs into a flat `node_modules/` tree, hoisting deps to the top level. Every project gets its own copies. 20 projects using React 18 means 20 copies of React on disk.

**pnpm** uses a **content-addressable store** at `~/.local/share/pnpm/store/`. Every unique `(package, version)` exists on disk exactly once. Projects get `node_modules/` populated with hard links into that store plus symlinks:

```
node_modules/
├─ react -> .pnpm/react@18.2.0/node_modules/react
├─ @bcl32/utils -> .pnpm/@bcl32+utils@2.3.9/node_modules/@bcl32/utils
└─ .pnpm/
   ├─ react@18.2.0/node_modules/react                    (hard link to store)
   └─ @bcl32+utils@2.3.9/node_modules/
      ├─ @bcl32/utils                                    (hard link to store)
      └─ react -> ../../react@18.2.0/node_modules/react  (symlink)
```

Every package sees only the deps it *declared*, via precise symlinks. No hoisting.

### What pnpm's layout buys

1. **Disk + install speed.** Five apps using `@bcl32/utils` share one copy in the store.
2. **Strictness.** You can only `import` what you declared. If `@bcl32/forms` depends on `dayjs` and your app doesn't, you can't `import dayjs` in your app — it won't be visible. "Phantom dependencies" (the #1 source of "works locally, breaks in CI" bugs under npm) are structurally impossible.
3. **Real peer-dep enforcement.** Because each package has a precise `node_modules`, peer ranges can actually be checked.
4. **Workspaces as a first-class resolver.** The `workspace:^X.Y.Z` protocol refuses to fall through to the registry.

### What npm still has

1. **Ships with Node.** `FROM node:18` in Docker gives you npm for free.
2. **Universal compatibility.** Every tutorial, CI template, and third-party tool assumes npm.
3. **Forgiving tree.** Loose hoisting unblocks under-declared deps (bad for correctness, good for unsticking).

### Why this monorepo uses both

- **Host / monorepo root → pnpm.** `pnpm-lock.yaml`, `pnpm-workspace.yaml`, inter-`@bcl32/*` deps use `workspace:^`. The strictness + workspace support is the whole reason the monorepo works.
- **Docker builds → npm.** `Dockerfile.base` / `Dockerfile.deps` use `npm install`:
  - The build context copies a single app directory, not the whole workspace. There's no `pnpm-workspace.yaml` in scope for pnpm to use.
  - `node:18` already has npm. Adding pnpm is another layer and another failure mode.
  - `npm install @bcl32/utils@^2.3.9` is a straightforward registry install — exactly what npm is good at.

### Command translation

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm install X` | `pnpm add X` |
| `npm install -D X` | `pnpm add -D X` |
| `npm uninstall X` | `pnpm remove X` |
| `npm run build` | `pnpm build` (no `run` needed) |
| `npx X` | `pnpm dlx X` |
| `npm ci` | `pnpm install --frozen-lockfile` |
| `npm install -w app X` | `pnpm add --filter app X` |

Lockfiles are not interchangeable. This repo commits only `pnpm-lock.yaml`.

---

## 2. What a pnpm workspace is

A workspace is a set of packages under one root that share a single resolution scope. Defined by `pnpm-workspace.yaml`:

```yaml
packages:
  - "react-packages/utils"
  - "react-packages/data-utils"
  - "react-packages/hooks"
  - "react-packages/charts"
  - "react-packages/datatable"
  - "react-packages/filters"
  - "react-packages/forms"
  - "react-packages/navigation"
  - "react-packages/themes"
```

When pnpm runs at the monorepo root, it treats those directories as packages that can depend on each other. Combined with the root `.npmrc`:

```
link-workspace-packages=true
prefer-workspace-packages=true
```

...the workspace does five things:

1. **Intra-workspace linking.** Declaring `@bcl32/utils@^2.3.9` anywhere in the workspace symlinks `node_modules/@bcl32/utils` → `react-packages/utils/` instead of fetching from GHCR.
2. **Dep hoisting.** Deps shared across packages (react, dayjs, etc.) are installed once at the root `node_modules/`.
3. **Recursive commands.** `pnpm -r build` runs `build` in every workspace package in topological order (utils → themes → filters, etc.). The root `package.json`:
   ```json
   "scripts": {
     "build": "pnpm -r build",
     "typecheck": "pnpm -r typecheck"
   }
   ```
4. **Filtered commands.** `pnpm --filter @bcl32/utils build` targets one package.
5. **`workspace:` protocol.** Stricter than a plain caret — refuses to resolve outside the workspace.

---

## 3. Where the workspace matters vs doesn't

The single most important thing to understand: **the workspace is a host-side dev-tooling thing.** It exists at the monorepo root during development and publishing. It does **not** extend into Docker, and Docker doesn't need it to.

| Context | Workspace active? | How `@bcl32/*` resolves |
|---------|-------------------|-------------------------|
| Host `pnpm install` at monorepo root | Yes | Symlinks to `react-packages/*` |
| IDE / type checker on host | Yes | Follows those symlinks |
| `pnpm -r build` publishing tarballs | Yes | Topological order from workspace graph |
| Dev container runtime (Vite dev server) | No | Vite alias → mounted source |
| Dev container `node_modules` | No | Regular GHCR installs (baked in, ignored by alias) |
| CI `Dockerfile.base` / `.deps` | No | `npm install` from GHCR |
| CI Vite prod build | No | Uses whatever's in container `node_modules` |
| Prod nginx container | No | Bundled JS — deps no longer exist separately |

---

## 4. Dev compose: how live @bcl32 editing actually works

`compose-dev.yml` (e.g. Print-Tracker's React service):

```yaml
services:
  print-tracker-react:
    build:
      dockerfile: Dockerfile.dev     # FROM print-tracker-react-deps:latest
    environment:
      - USE_LOCAL_PACKAGES=true
    volumes:
      - ./print-tracker-react/src:/app/src
      - ./print-tracker-react/vite.config.js:/app/vite.config.js
      - ../react-packages:/app/react-packages    # ← key mount
```

Inside the container:

- `/app/node_modules/@bcl32/*` — baked in by `Dockerfile.deps` at image build time (regular `npm install` from GHCR). **Not a workspace. Just regular packages.**
- `/app/react-packages/` — live-mounted from the host. Source only, not built.
- Vite dev server is running with:
  ```js
  const useLocalPackages = process.env.USE_LOCAL_PACKAGES === "true";
  const localPackageAliases = useLocalPackages
    ? { "@bcl32/utils": path.resolve(__dirname, "react-packages/utils/src"), ... }
    : {};
  ```

So `import { Button } from "@bcl32/utils/Button"`:

1. Vite's alias intercepts → resolves to `/app/react-packages/utils/src/Button.tsx` (mounted source).
2. `node_modules/@bcl32/utils` is present but **unused** in this path.
3. HMR watches `/app/react-packages/*/src`. Edit `Button.tsx` on the host → change appears instantly in the browser.

**There is no pnpm workspace inside this container.** No `pnpm-workspace.yaml`, no `pnpm install`, no linking. The workspace-like behavior (live `@bcl32` changes) is achieved by **Vite alias + volume mount**, not by the workspace mechanism.

This is why `workspace:^` in consumer `package.json` is dangerous — it reads fine to pnpm on the host but is a hard syntax error to npm in Docker. Plain carets (`^2.3.9`) are understood by both.

### What the host workspace provides *to dev*

Separately from the container, running `pnpm install` at the monorepo root gives you:

- IDE type resolution that follows symlinks into the live `react-packages/` source.
- `pnpm -r typecheck` catches cross-package type errors.
- `pnpm --filter print-tracker-react dev` (if configured) runs host-side dev.
- `pnpm outdated -r` surfaces version drift.

None of that happens inside the dev container. Host and container are parallel layers.

---

## 5. Prod compose: workspace is absent by design

`compose-prod.yml`:

```yaml
services:
  print-tracker-react:
    image: ghcr.io/bcl32/print-tracker/print-tracker-react:latest
    # no volumes, no build context, no source, no react-packages
```

The CI pipeline that produced this image:

```
Dockerfile.base
  COPY package.base.json ./package.json
  RUN npm install              # public deps only
  ↓
Dockerfile.deps
  RUN npm install @bcl32/utils@^2.3.9 @bcl32/themes@^2.1.4 ...
  ↓                              # private @bcl32/* from GHCR
Dockerfile (stage 1: builder)
  COPY . .                     # source
  RUN npm run build            # Vite → /dist
  ↓
Dockerfile (stage 2: nginx)
  FROM nginx:alpine
  COPY --from=builder /app/dist /usr/share/nginx/html
```

Every step: **npm, not pnpm. Registry, not workspace.**

- `Dockerfile.deps` installs `@bcl32/*` as regular packages from GHCR.
- Vite build bundles everything, baking the installed versions into `dist/`.
- The final image is nginx serving static files — no Node, no package manager, no concept of a package. `@bcl32/*` code lives inside minified JS in `/usr/share/nginx/html/assets/index-*.js`.

### Common prod-related confusions

- **"Does the prod image have my latest `@bcl32/utils` changes?"** Only if (a) the package is published to GHCR, (b) `Dockerfile.deps` installs that version (either explicitly or via deps-sync), and (c) the deps image is rebuilt. Prod can't see the host `react-packages/`.
- **"Why are versions hard-coded in `Dockerfile.deps`?"** Docker layer caching. The deps layer only invalidates when that `RUN` line changes. Reading versions from `package.json` would invalidate the layer on any package.json edit, even unrelated ones, costing you ~2 min of rebuild per change.

---

## 6. Package declaration patterns in consumer apps

The consumer apps declare `@bcl32/*` inconsistently:

**`Label-Designer/react/package.json`** — declares them:
```json
"dependencies": {
  "@bcl32/utils": "^2.0.0",
  "@bcl32/hooks": "^2.0.0",
  "@bcl32/themes": "^2.0.0",
  "@bcl32/navigation": "^2.0.0"
}
```

**`Print-Tracker/print-tracker-react/package.json`** — does NOT declare any `@bcl32/*`. They are installed only by `Dockerfile.deps` at image build time.

### Why declarations matter

The app works in either case (workspace linker + explicit Dockerfile installs cover it). But missing declarations cost you:

- **IDE / type checker** — opening `print-tracker-react/` in isolation shows "Cannot find module '@bcl32/utils/Card'" until the workspace linker has run at the monorepo root.
- **`pnpm outdated` is blind** — only checks declared deps. Drift in `Dockerfile.deps` versions is invisible.
- **`pnpm audit` is blind** — security scans skip undeclared deps.
- **Dual source of truth** — "what does this app depend on?" splits between `package.json` and `Dockerfile.deps`. Anyone reading the app standalone can't tell.

### Recommended pattern

Declare every `@bcl32/*` an app uses (including transitive, if peerDeps are adopted per §7), using a **plain caret**, not the workspace protocol:

```json
"dependencies": {
  "@bcl32/charts": "^2.1.5",
  "@bcl32/data-utils": "^2.1.8",
  "@bcl32/datatable": "^2.6.0",
  "@bcl32/filters": "^3.0.3",
  "@bcl32/forms": "^2.5.7",
  "@bcl32/hooks": "^2.2.6",
  "@bcl32/navigation": "^2.1.5",
  "@bcl32/themes": "^2.1.4",
  "@bcl32/utils": "^2.3.9"
}
```

### Why plain caret, not `workspace:^`

`workspace:^X.Y.Z` only resolves inside a pnpm workspace. The Docker build context doesn't include `pnpm-workspace.yaml` and uses `npm`, not pnpm. A `workspace:` spec there would be a resolution error.

Plain caret works everywhere:
- Host: `link-workspace-packages=true` + `prefer-workspace-packages=true` still steers resolution to the local workspace when the version matches.
- Docker: it's a normal semver range npm understands.

Inside `react-packages/*/package.json` (package-to-package), `workspace:^` is fine — those ARE the workspace packages. Only **consumer app** `package.json` files should use plain carets.

---

## 7. dependencies vs peerDependencies for inter-@bcl32 links

Today, inter-`@bcl32/*` links live in `dependencies`:

```jsonc
// react-packages/themes/package.json
"dependencies": {
  "@bcl32/utils": "workspace:^2.3.5"
}
```

`react` and `dayjs` are `peerDependencies`. The reasoning is correct for them — React requires a single instance across the whole app (hooks, context). **But `@bcl32/utils` has the same requirement.** It provides context (ThemeProvider), registers shared module state (Portal roots in Radix-backed Sidebar, tw-colors CSS variables), and is depended on by multiple sibling packages. If two copies are ever loaded simultaneously, context breaks silently.

### Recommended: inter-@bcl32 deps should be peerDependencies

```jsonc
// react-packages/themes/package.json (recommended)
"peerDependencies": {
  "@bcl32/utils": "^2.3.5"   // no "workspace:" prefix in peerDeps
},
"dependencies": {
  "lucide-react": "^0.447.0"
}
```

Same treatment for:
- `charts` → `utils`, `hooks`
- `filters` → `utils`, `hooks`, `data-utils`, `charts`
- `forms` → `utils`, `hooks`, `data-utils`
- `datatable` → `utils`, `hooks`, `data-utils`, `forms`
- `navigation` → `utils`

**Exception worth considering:** `@bcl32/data-utils` is pure functions (no React, no context, no module state). Multiple copies are harmless — functions are idempotent. It can stay in `dependencies` without breaking anything, though peerDep is still a small bundle-size win.

### Why this matters

A library that relies on **single-instance semantics** should declare its shared base as a peer, not a nested dep. This is the same reason React and dayjs are already peers across this monorepo.

With peerDeps:
- There is never a nested `@bcl32/utils` inside `@bcl32/themes`'s `node_modules`.
- The consumer app controls which version of `utils` everyone sees.
- Multiple copies in the bundle become structurally impossible in the overlapping-range case.

Without peerDeps, you get what's described in §9 — a dormant multi-copy time bomb that detonates on the first major version bump.

### Trade-offs

- Consumer apps must declare every transitive `@bcl32/*` they or their dependencies use. pnpm 7+ has `auto-install-peers=true` by default, so installation doesn't break — but unmet peer warnings appear until declarations are complete.
- Changing a published package's `dependencies` → `peerDependencies` is semver-breaking to *external* consumers, if any exist. Inside this monorepo it's controlled. Best timed with a scheduled major version bump.

### Recommended order of operations

1. Add plain-caret `@bcl32/*` declarations to `print-tracker-react/package.json` (per §6). This must come first — flipping to peerDeps without declarations produces a wall of warnings.
2. Refresh stale workspace-protocol floors in `react-packages/*/package.json` (per §8).
3. Flip inter-package deps from `dependencies` to `peerDependencies` across `react-packages/`.
4. Publish the next release — new tarballs reflect the new structure. Existing GHCR images keep working until next consumer rebuild.

---

## 8. Version hygiene: stale caret floors

Each `@bcl32/*` package pins a caret floor for its inter-package deps. Those floors drift behind reality as sibling packages are republished.

Example snapshot (floors for `@bcl32/utils`, current version 2.3.9):

| Package | Pins `@bcl32/utils` | Lag |
|---------|--------------------|-----|
| themes | `workspace:^2.3.5` | 4 patches |
| charts | `workspace:^2.3.5` | 4 patches |
| navigation | `workspace:^2.3.5` | 4 patches |
| datatable | `workspace:^2.3.6` | 3 patches |
| filters | `workspace:^2.3.8` | 1 patch |
| forms | `workspace:^2.3.9` | 0 ✓ |

### Why it works in dev

`link-workspace-packages=true` forces everyone to point at `react-packages/utils/` regardless of what the caret says. The pin is effectively ignored on the host.

### Where it breaks: published tarballs

When `@bcl32/themes@2.1.4` is published to GHCR, the tarball's `package.json` has:

```json
"dependencies": { "@bcl32/utils": "^2.3.5" }
```

(The `workspace:` prefix is stripped at publish time and replaced with the literal caret.)

Then `Dockerfile.deps` installs `themes@^2.1.4` into a Docker image with `npm install`. npm reads the tarball's pins and resolves — it picks the highest version that satisfies every floor. For overlapping ranges within major 2, that's usually fine: `utils@2.3.9` satisfies every floor above and a single copy is installed.

### The real cost today

Stale floors are not currently causing runtime bugs in the overlapping-range case — but:

1. **The floor is no longer documenting "minimum tested version."** If a bug later turns out to require 2.3.7 to manifest, the `^2.3.5` pin misleadingly suggests the package was validated against 2.3.5.
2. **Major-version bumps will explode.** See §9.

### Recommended fix

After publishing package X, bump every dependent's floor to the published version:

```
themes/package.json:     workspace:^2.3.5 → workspace:^2.3.9
charts/package.json:     workspace:^2.3.5 → workspace:^2.3.9
navigation/package.json: workspace:^2.3.5 → workspace:^2.3.9
datatable/package.json:  workspace:^2.3.6 → workspace:^2.3.9
filters/package.json:    workspace:^2.3.8 → workspace:^2.3.9
```

Same treatment for `@bcl32/data-utils` and `@bcl32/forms`. This is a natural extension of the existing `deps-sync` skill, which handles consumer `Dockerfile.deps` but not intra-`react-packages/` pins.

---

## 9. Multi-copy bundling: the major-bump time bomb

### Case A: overlapping carets (today)

All internal pins are within major version 2. `^2.3.5`, `^2.3.8`, `^2.3.9` all overlap. npm/pnpm dedupe to a **single copy** of `@bcl32/utils@2.3.9`:

```
┌─ Print-Tracker app
├─ @bcl32/themes@2.1.4  ──┐
├─ @bcl32/filters@3.0.3 ──┼──→ one @bcl32/utils@2.3.9
└─ (direct use of utils) ─┘
```

This is why nothing is broken today.

### Case B: non-overlapping ranges (time bomb)

The moment you publish `@bcl32/utils@3.0.0` (breaking change), the picture changes:

- `themes@2.1.4` tarball still declares `"@bcl32/utils": "^2.3.5"` — does NOT satisfy 3.0.0.
- App wants `utils@^3.0.0` — does NOT satisfy 2.3.5.
- No single version satisfies both.

npm/pnpm cannot dedupe. It installs **both**:

```
node_modules/
├─ @bcl32/utils/              (3.0.0 — for the app)
└─ @bcl32/themes/
   └─ node_modules/
      └─ @bcl32/utils/        (2.3.9 — for themes)
```

Both get bundled. Vite doesn't know they're "the same package." Things break in subtle ways:

- **React context crosses module boundaries and fails.** `<ThemeProvider>` from the app's `utils` provides context. `<Button>` rendered by `themes` reads from a *different* `utils`. `useContext` returns the default value → theme silently doesn't apply.
- **Radix / Headless UI primitives double-register.** Portal roots, focus scopes, etc. maintain module-level state. Two copies = two competing stateful registries.
- **CSS-in-JS / tailwind-merge** produces doubled class output. tw-colors CSS variables may be scoped to one instance.
- **Bundle size doubles** for everything in `utils`.

### Why pnpm makes this worse-before-better

pnpm is stricter than npm: it won't silently hoist incompatible versions. That's good (more deterministic), but once ranges don't overlap, pnpm will *definitely* install both rather than squint and dedupe.

### How the fixes interact

- **Keeping floors fresh** (§8) doesn't prevent the time bomb by itself, but it means a `utils@3.0.0` release can be coordinated — every dependent's floor already reflects current state, and bumping them all to `^3.0.0` at once becomes a tractable checklist.
- **peerDependencies** (§7) defuses the time bomb at the root: peers are never installed transitively, so there can't be a nested `utils` inside `themes`. pnpm will print a peer-range warning if the app's `utils` version doesn't satisfy `themes`'s peer range — that's the signal to coordinate the upgrade, but no silent multi-copy install.

---

## 10. CI / Dockerfile workflow impact

Short answer: **adding `@bcl32/*` declarations to consumer `package.json` files does not change CI or Dockerfile behavior.** Flipping to peerDependencies doesn't either, with one caveat.

### What stays the same

- `Dockerfile.base` — reads `package.base.json`, installs public deps. Unchanged.
- `Dockerfile.deps` — explicit `npm install @bcl32/*@^X.Y.Z ...` lines. Unchanged.
- `Dockerfile` — copies source, runs `npm run build`. Unchanged.
- `deploy-prod.sh`, K8s manifests — unchanged.
- GitHub Actions workflow paths and triggers — unchanged.

Why: `Dockerfile.deps` installs `@bcl32/*` with explicit versions from GHCR. It does not read the app's `package.json` to determine what to install. Adding declarations means `package.json` now *reflects* what's being installed, but doesn't change *how* it's installed.

### What subtly changes

1. **`package.json` matches reality.** If anyone ever ran `npm ci` against the app's `package.json` in isolation, the install would now succeed. That latent bug (undeclared deps under an old pattern) is gone.
2. **`deps-sync` gets a second target.** Previously it synced `Dockerfile.deps` only. Now after a publish, both `Dockerfile.deps` and the app's `package.json` caret should be updated. Typically the same version in two files — a one-line addition to the sync logic.
3. **`pnpm outdated` starts working.** Previously useless (nothing declared), now reports `@bcl32/*` drift directly.

### Should `Dockerfile.deps` be simplified to `npm install` from `package.json`?

No. The current pattern is intentional. Hard-coding versions in `Dockerfile.deps`:
- Deps layer only invalidates when that `RUN` line changes.
- Unrelated `package.json` edits (app-only deps, scripts, metadata) don't rebuild the slow deps layer.
- Layer cache hits stay high, build times stay short.

Reading from `package.json` would invalidate the deps layer on any `package.json` change, losing the multi-layer optimization.

### peerDependency caveat

Flipping inter-`@bcl32/*` deps to peerDependencies (per §7) does change one thing: `pnpm install` on the host will begin emitting peer-range warnings until every consumer app declares every `@bcl32/*` it needs transitively. This is a *signal*, not a breakage — pnpm 7+ auto-installs peers. But the warnings are noisy until declarations catch up, which is why the recommended ordering is: declare first, then flip to peers.

---

## 11. Tooling: pnpm outdated and deps-sync

### `pnpm outdated`

Read-only report comparing three numbers per declared dep:

- **Current** — version installed in `node_modules`.
- **Wanted** — highest version satisfying the declared caret.
- **Latest** — newest version in the registry.

Sample (Print-Tracker, after `@bcl32/*` is declared):

```
Package         Current   Wanted   Latest
@bcl32/utils    2.3.5     2.3.9    2.3.9
@bcl32/themes   2.1.4     2.1.4    2.1.4
```

Top row = drift inside the caret range (patch bump available).

Run with `-r` at the monorepo root for cross-package drift:

```bash
pnpm outdated -r
```

**Critical limitation:** `pnpm outdated` only checks `package.json`-declared deps. Anything installed imperatively in `Dockerfile.deps` is invisible to it. This is exactly why Print-Tracker is blind to `@bcl32/*` drift today.

### Peer-dep warnings at install time

When inter-`@bcl32/*` deps become peerDeps and a consumer app doesn't declare them, `pnpm install` prints:

```
 WARN  Issues with peer dependencies found
print-tracker-react
├─┬ @bcl32/filters 3.0.3
│ └── ✕ missing peer @bcl32/utils@^2.3.8
│ └── ✕ missing peer @bcl32/hooks@^2.2.6
```

These warnings mean the declared graph doesn't match the real graph. The app may still work (workspace linker covers for missing peers in dev), but anyone running outside the workspace would hit real failures.

For CI enforcement, pass `--strict-peer-dependencies` to `pnpm install` — peer mismatches become install-time errors instead of warnings.

### `deps-sync` skill

Exists to solve silent drift in `Dockerfile.deps` caret ranges after a publish. Once declarations land in consumer `package.json` (per §6), `deps-sync` should update both files together (Dockerfile.deps + package.json). `pnpm outdated -r` becomes the drift radar; `deps-sync` becomes the automated sync after a publish.

### Weekly hygiene recipe

1. `pnpm outdated -r` — scan the whole monorepo.
2. For internal-only drift (`@bcl32/*` or `bcl32-*`), run `deps-sync` to update consumer Dockerfiles and package.jsons.
3. For external drift (react, tailwind, etc.), triage by severity.
4. Commit, republish if any `react-packages/*` version bumped.

---

## 12. Commands quick reference

### On the host (monorepo root)

```bash
pnpm install                                  # workspace setup + dep linking
pnpm -r build                                 # build every package in topological order
pnpm -r typecheck                             # typecheck every package
pnpm --filter @bcl32/utils build              # build a single package
pnpm --filter print-tracker-react dev         # run one consumer app (if scripted)
pnpm outdated -r                              # drift report across the workspace
pnpm install --strict-peer-dependencies       # fail CI on unmet peers
```

### Publishing

`@bcl32/*` packages publish to GHCR via CI on push to main. See `CHANGESETS-MIGRATION.md` and the `npm-publishing` skill for the full flow.

### In a consumer app folder (outside workspace commands)

```bash
pnpm install                                  # same as root — still finds workspace via parent dir
pnpm outdated                                 # drift for this app only (requires declarations)
pnpm dlx X                                    # npx equivalent
```

### Docker dev / prod

```bash
cd Base-POC
docker compose -f compose-dev.yml up          # live dev with Vite HMR + @bcl32 hot reload
docker compose -f compose-prod.yml up         # pull + run GHCR images

./deploy-prod.sh                              # production deploy (auth + pull + up)
./deploy-prod.sh react                        # React service only
```

### After publishing a shared package

```bash
# 1. Refresh internal floors (bump workspace:^ pins in react-packages/*)
# 2. Update consumer Dockerfile.deps + package.json via deps-sync skill
# 3. Rebuild deps image in CI (happens automatically on main push)
```

---

## Related docs

- `README.md` — top-level package usage and installation from GHCR.
- `REFACTORING-LOG.md` — history of the moduleResolution + data-utils split.
- `TYPESCRIPT-MIGRATION-GUIDE.md` — TS 5 + tsup build details.
- `CHANGESETS-MIGRATION.md` — versioning workflow.
