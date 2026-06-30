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
4. `pnpm -r build` (topological order — replaces explicit tiers)
5. `pnpm -r publish --no-git-checks` (topological order, skip 409 conflicts)
6. Commit version changes and push

Triggers: push to `main` when `.changeset/**` changes, plus `workflow_dispatch`.

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
- `.github/workflows/publish-react-packages.yml` — full rewrite
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
