# Changesets Migration

**Status: COMPLETED.** This document is kept as a record of the migration. Every step below has been carried out, and the `@changesets/cli` pipeline described here is the one currently in use.

## Context

The old auto-bump system (post-commit hook + PackageManager.ts `bumpCommand`) was broken — it used `git diff --cached` in a post-commit context where no staged files exist. This migration replaced the entire versioning pipeline with `@changesets/cli`, the industry standard for monorepo publishing, and collapsed the 4-job CI workflow into a single job.

## Current vs Changesets

| | Current | Changesets |
|---|---|---|
| Version bumping | Local post-commit hook (broken) | CI runs `changeset version` |
| Change detection | `dorny/paths-filter` per package | Changeset files declare what changed |
| CI jobs | 4 (detect + 3 tiers) | 1 |
| Dependency ordering | Manual tier list in YAML | `pnpm -r` topological order (automatic) |
| Publish trigger | Any push touching package paths | Only when `.changeset/` files exist |
| CHANGELOGs | Custom PackageManager format | Changesets standard format |
| When you decide to publish | Implicit (every push) | Explicit (add a changeset file) |

## Dependency Order

The current 3-tier system (tier-0 → tier-1 → tier-2) is replaced by `pnpm -r build` and `pnpm -r publish`, which automatically run in topological order based on the workspace dependency graph:

1. **Tier 0** (no internal deps): utils, data-utils, hooks
2. **Tier 1** (depends on tier 0): themes, forms, charts, navigation
3. **Tier 2** (depends on tier 0+1): datatable, filters

Same order, handled natively by pnpm rather than explicit CI job dependencies.

## Implementation Steps

### 1. Install & initialize changesets
- `pnpm add -Dw @changesets/cli`
- `pnpm changeset init`
- Configure `.changeset/config.json`:
  - `access: "restricted"` (GitHub Packages)
  - `baseBranch: "main"`
  - `commit: false` (CI handles the commit)
  - `updateInternalDependencies: "patch"`

### 2. Add root scripts to `package.json`
```json
"changeset": "changeset",
"version-packages": "changeset version",
"release": "pnpm run build && pnpm -r publish --no-git-checks"
```

### 3. Replace CI workflow (`.github/workflows/publish-react-packages.yml`)
Single job replacing the current 4-job pipeline:
1. Checkout with `fetch-depth: 0`
2. Check for pending changeset files
3. If found: `pnpm changeset version` (bumps versions, updates changelogs)
4. Detect bumped packages (`publish-verify.sh detect`) — records `name@version` for every package whose version changed
5. Build bumped packages + their workspace dependency chain (`pnpm --filter "<pkg>..." build` per bumped package; topological within the filter). Unbumped, non-dependency packages are not built — they are not published either, since `pnpm -r publish` skips versions already on the registry. Falls back to `pnpm -r build` if the bumped list is empty.
6. Pre-publish collision check (`publish-verify.sh precheck`)
7. Publish (`pnpm -r publish --no-git-checks`) — strict: any non-zero exit fails the release
8. Verify published versions (`publish-verify.sh postcheck`)
9. Commit version changes and push

Triggers: push to `main` when `.changeset/**` changes, plus `workflow_dispatch`.

#### Publish safety (added after the 2026-07-04 stale-artifact incident)
`pnpm -r publish` reads the registry and **silently skips** any version that is
already published (it prints "There are no new packages that should be
published" and exits 0). On 2026-07-04 `changeset version` computed
`@bcl32/data-utils@2.2.0`, but a stale `2.2.0` from an earlier era already sat on
the registry — so `pnpm -r publish` skipped it, reported success, and consumers
kept installing the ancient artifact. The old workflow made this worse by piping
publish through a `while` loop, so the step's exit code was the loop's (always 0)
and even a real failure was swallowed. The pipeline now guards three ways
(`.github/scripts/publish-verify.sh`):

- **Pre-publish collision check** (`precheck`) — for each bumped version that
  already exists on the registry, it downloads the published tarball and diffs
  its unpacked contents (excluding `package.json`, which pnpm rewrites on
  publish) against a local `pnpm pack`. Identical contents = a benign retry of a
  partially completed release (pnpm will skip it). **Different contents = HARD
  FAIL** before anything is published, naming the package, version, and the
  registry publish date. Content diffing is used instead of `dist.shasum`
  because gzip/tarball metadata is non-deterministic, whereas the extracted file
  bytes are reproducible across machines.
- **Strict publish** — publish output is captured, not piped; **any non-zero
  exit fails the release** with a named error. Because pnpm skips
  already-published versions and precheck has ruled out different-artifact
  collisions, a non-zero exit can only mean a real failure (auth, network,
  build, registry).
- **Post-publish verification** (`postcheck`) — confirms every bumped version is
  actually present on the registry (with retries for propagation lag) before the
  version commit is pushed.

Retry semantics: the version commit is the **last** step, so if publish fails
hard the changesets stay on `main` and the next push retries the whole release —
tolerated for versions whose identical artifact already landed.

### 4. Update PackageManager.ts (`~/.claude/tools/PackageManager.ts`)
- Remove `bumpCommand` function (lines 1123-1197)
- Replace `case 'bump'` (line 1384) with `case 'changeset'` that spawns `pnpm changeset` interactively
- Update help text and error messages

### 5. Rewrite the post-commit hook
- `.githooks/post-commit` was **rewritten, not deleted** (it still exists, ~1.8 KB). The old version only did the broken auto-bump; the new version auto-generates a changeset for whichever of the 9 package dirs a commit touches.
- It detects changed packages with `git diff-tree --no-commit-id --name-only -r HEAD`, writes a `patch` changeset under `.changeset/`, then stages it and `--amend`s the commit. A `PAI_SKIP_CHANGESET=1` guard prevents infinite recursion on the amend, and a changeset created manually in the same commit suppresses the auto one.

### 6. Cleanup
- Delete `publish-all.sh` and `publish-package.sh` (replaced by CI)

## Developer Workflow After Migration

```bash
# 1. Make your code changes
# 2. Create a changeset (declares what changed and how)
pnpm changeset
# → Interactive: pick packages, bump type (major/minor/patch), description
# → Creates .changeset/some-random-name.md

# 3. Commit everything (code + changeset file)
git add -A && git commit -m "feat(forms): add new field type"

# 4. Push — CI detects changeset files, bumps versions, builds, publishes
git push
```

Multiple changesets accumulate — if you make 3 commits each with a `minor` changeset for `@bcl32/forms`, CI consolidates them into a single minor bump.

You don't have to create a changeset by hand: the post-commit hook auto-generates a `patch` changeset for any commit that touches one of the 9 package dirs, so those commits are still picked up by the publish system. Run `pnpm changeset` manually only when you want a `minor`/`major` bump or a custom description.

## Files Modified
- `.changeset/config.json` — new
- `.changeset/README.md` — new (from `changeset init`)
- `package.json` — add devDep + scripts
- `.github/workflows/publish-react-packages.yml` — full rewrite (later hardened: detect/precheck/strict-publish/postcheck steps, 2026-07-05)
- `.github/scripts/publish-verify.sh` — new (2026-07-05, publish safety guard described above)
- `~/.claude/tools/PackageManager.ts` — remove bump, add changeset
- `.githooks/post-commit` — rewritten (auto-generates a `patch` changeset for touched packages instead of bumping)
- `publish-all.sh` — delete
- `publish-package.sh` — delete
- `pnpm-lock.yaml` — updated from install

## Verification
1. Run `pnpm changeset` locally — should interactively create a changeset file
2. Commit all changes + the test changeset, push to main
3. Watch CI: should detect changeset, bump version, build, publish, commit back
4. Verify package appears in GitHub Packages with new version
