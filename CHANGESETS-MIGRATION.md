# Changesets Migration Plan

## Context

The current auto-bump system (post-commit hook + PackageManager.ts `bumpCommand`) is broken — it uses `git diff --cached` in a post-commit context where no staged files exist. This plan replaces the entire versioning pipeline with `@changesets/cli`, the industry standard for monorepo publishing. This also simplifies the 4-job CI workflow into a single job.

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
6. Create git tags (`@bcl32/{pkg}@{version}`)
7. Commit version changes and push with tags

Triggers: push to `main` when `.changeset/**` changes, plus `workflow_dispatch`.

### 4. Update PackageManager.ts (`~/.claude/tools/PackageManager.ts`)
- Remove `bumpCommand` function (lines 1123-1197)
- Replace `case 'bump'` (line 1384) with `case 'changeset'` that spawns `pnpm changeset` interactively
- Update help text and error messages

### 5. Remove post-commit hook bump logic
- Delete `.githooks/post-commit` (its only purpose is auto-bumping)

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

Commits without a changeset file are invisible to the publish system.

## Files Modified
- `.changeset/config.json` — new
- `.changeset/README.md` — new (from `changeset init`)
- `package.json` — add devDep + scripts
- `.github/workflows/publish-react-packages.yml` — full rewrite
- `~/.claude/tools/PackageManager.ts` — remove bump, add changeset
- `.githooks/post-commit` — delete
- `publish-all.sh` — delete
- `publish-package.sh` — delete
- `pnpm-lock.yaml` — updated from install

## Verification
1. Run `pnpm changeset` locally — should interactively create a changeset file
2. Commit all changes + the test changeset, push to main
3. Watch CI: should detect changeset, bump version, build, publish, tag, commit back
4. Verify package appears in GitHub Packages with new version
