# `@bcl32` React System — Documentation Set

This directory is the **canonical reference for the shared React UI system** that lives in
`react-packages/` (the nine `@bcl32/*` packages), how the five consuming apps use it, and where
the existing docs/skills have drifted from the code.

> **Generated:** 2026-06-15 by a multi-agent review of the live repository.
> **Method:** ~70 agents mapped every package, audited every app, fact-checked every doc/skill
> claim against source, then adversarially verified each claimed inconsistency. Findings were
> spot-checked by hand afterward (see [Caveats](#caveats--how-to-trust-this)).
>
> This set mirrors the precedent of `docs/entity-system/` for the backend: a code-derived
> reference plus a list of corrections to fold back into the skills.

---

## Reading order

| If you want to… | Read |
| --- | --- |
| Understand the system top-down | [`00-OVERVIEW.md`](./00-OVERVIEW.md) |
| Look up a specific package's API | [`01-packages/<pkg>.md`](./01-packages/) |
| Understand how the pieces fit together | [`02-INTEROP.md`](./02-INTEROP.md) |
| Build a **new** app on the system | [`03-NEW-PROJECT-GUIDE.md`](./03-NEW-PROJECT-GUIDE.md) |
| Audit one of the existing apps | [`04-apps/<app>.md`](./04-apps/) |
| See where docs lie about the code | [`05-INCONSISTENCIES.md`](./05-INCONSISTENCIES.md) |
| Plan improvements | [`06-REFACTOR-PROPOSALS.md`](./06-REFACTOR-PROPOSALS.md) |

## Full index

### Core
- **[`00-OVERVIEW.md`](./00-OVERVIEW.md)** — what the system is, the 3-tier dependency DAG, build/versioning/publishing model, and how an app consumes the packages.
- **[`02-INTEROP.md`](./02-INTEROP.md)** — package dependency graph, the `ModelData`/`ModelAttribute` contract, provider wiring, peer-dependency contract, the app→package consumer matrix, and the [dialog design conventions](./02-INTEROP.md#6-dialog-design-conventions) every dialog in the fleet follows.
- **[`03-NEW-PROJECT-GUIDE.md`](./03-NEW-PROJECT-GUIDE.md)** — front-to-back guide for scaffolding a new Vite app: workspace membership, dependency declaration, provider setup, a full datatable+filters+forms CRUD page, and deploy. Defers to the `react-website-dev` and `entity-lifecycle` skills.

### Per-package reference — [`01-packages/`](./01-packages/)

> Versions below are a point-in-time snapshot (refreshed 2026-07-25) and drift as
> packages publish — each `package.json` is authoritative.

| Package | Tier | Version | Role |
| --- | --- | --- | --- |
| [`utils`](./01-packages/utils.md) | foundational | 2.7.0 | Radix + Headless UI + Tailwind component primitives (~127 exports) |
| [`data-utils`](./01-packages/data-utils.md) | foundational | 2.2.3 | Pure data utilities — stats, sorting, string/format helpers (no React) |
| [`hooks`](./01-packages/hooks.md) | foundational | 4.0.0 | TanStack Query wrappers + `apiFetch` for typed FastAPI access |
| [`charts`](./01-packages/charts.md) | mid | 3.2.0 | shadcn-style recharts wrappers — `TimeSeriesChart`, `DonutChart`, `StatCard` |
| [`navigation`](./01-packages/navigation.md) | mid | 2.1.9 | Navigation-state context + breadcrumb UI |
| [`themes`](./01-packages/themes.md) | mid | 3.0.0 | HSL theming: provider, persistence, live editor, colour utils (9 themes) |
| [`forms`](./01-packages/forms.md) | composite | 3.0.1 | `ModelData`-driven CRUD forms (add/edit/bulk/delete) + field primitives |
| [`datatable`](./01-packages/datatable.md) | composite | 2.8.2 | TanStack Table v8 datatable with CRUD dialogs, selection, virtualization |
| [`filters`](./01-packages/filters.md) | composite | 3.2.6 | Filter context + filter/chart controls + pure filter data utilities |

### Per-app audit — [`04-apps/`](./04-apps/)
| App | `@bcl32` packages used | Audit |
| --- | --- | --- |
| `Base-POC/image-poc-react` | 9 (via `Dockerfile.deps`, outside workspace) | [image-poc-react.md](./04-apps/image-poc-react.md) |
| `Print-Tracker/print-tracker-react` | 9 (declared in package.json) | [print-tracker-react.md](./04-apps/print-tracker-react.md) |
| `Security-Benchmarks/security-benchmarks-react` | 9 declared / 6 imported | [security-benchmarks-react.md](./04-apps/security-benchmarks-react.md) |
| `Label-Designer/react` | 4 (utils, hooks, themes, navigation) | [label-designer-react.md](./04-apps/label-designer-react.md) |
| `tools/dashboard` | **0** — standalone Bun app | [dashboard.md](./04-apps/dashboard.md) |

### Findings
- **[`05-INCONSISTENCIES.md`](./05-INCONSISTENCIES.md)** — verified documentation-vs-code discrepancies, grouped by doc/skill and by app, plus a "needs human review" section for disputed claims.
- **[`06-REFACTOR-PROPOSALS.md`](./06-REFACTOR-PROPOSALS.md)** — prioritized refactors across the packages and apps.

---

## Verified ground truth (hand-checked)

These facts were confirmed directly against the filesystem during the post-review QA pass and
are the authoritative correction to several stale docs:

- **There are 9 packages, not 8.** `@bcl32/data-utils` (2.1.10) exists and is foundational-tier;
  it is missing entirely from `react-packages/README.md`.
- **The dependency graph is a strict 3-tier DAG (no cycles):** Tier 0 `{utils, data-utils, hooks}`
  → Tier 1 `{themes→utils, navigation→utils, charts→{utils,hooks}, forms→{utils,data-utils,hooks}}`
  → Tier 2 `{datatable→{utils,data-utils,hooks,forms}, filters→{utils,hooks,data-utils,charts}}`.
  `pnpm -r build` orders this automatically — the README's manual publish order is both wrong and unnecessary.
- **Publishing is changeset-driven via CI**, not the `publish-package.sh`/`publish-all.sh` scripts
  the README references — **those scripts do not exist.** The real workflow is
  `react-packages/.github/workflows/publish-react-packages.yml`.
- **`react-packages/.githooks/post-commit` exists** (executable, ~1.8 KB) and auto-generates patch
  changesets — resolving a dispute in the review where some passes reported it absent.
  **Caveat:** `git config core.hooksPath` is *unset* at the repo root, so this hook only fires if it
  has been installed/symlinked into the active hooks path. Confirm activation before relying on
  auto-changesets — neither the docs nor the review verified the hook is actually wired in.
- **`tsconfig.base.json` uses `moduleResolution: "bundler"`** for all 9 packages; the
  `TYPESCRIPT-MIGRATION-GUIDE.md` still shows `"node"`.
- **`tools/dashboard` uses none of the `@bcl32` packages** — it is a separate Bun project with its
  own `bun.lock`, reimplementing `cn()`, status badges, and skeletons locally.

## Headline findings

**Inconsistencies (all low/medium severity — no high):**
1. `README.md` is the most stale doc: missing `data-utils`, all versions frozen at `2.0.0`, obsolete publish scripts, wrong publish order.
2. `PACKAGE-MODEL.md` is excellent in *reasoning* but its inline version snapshots have drifted, and its §6 claim that "Print-Tracker does NOT declare `@bcl32/*`" is now **inverted** — Print-Tracker declares all 9.
3. The `react-website-dev` skill has the most actionable errors for day-to-day work: a `commit-msg`/`PackageManager.ts bump` publish flow that doesn't exist, "8 themes" (it's 10), a barrel-import example that contradicts its own subpath-import rule, and "Base-POC does not use `@bcl32/*`" (it uses all 9).
4. `TYPESCRIPT-MIGRATION-GUIDE.md` still documents the pre-`bundler` `moduleResolution: "node"` world.

**Top refactor themes (see [`06-REFACTOR-PROPOSALS.md`](./06-REFACTOR-PROPOSALS.md)):**
1. **Adopt the shared system in `tools/dashboard`** — biggest single gap; it reinvents primitives the suite already ships.
2. **`dependencies` → `peerDependencies` for inter-`@bcl32` links** (the `PACKAGE-MODEL.md` §7 "major-bump time bomb" thesis, still unimplemented).
3. **Dependency hygiene** — refresh stale `workspace:^` floors; drop declared-but-unused packages (Security-Benchmarks declares 9, imports 6; image-poc ships unused `moment`/`@bokeh/bokehjs`).
4. **Kill duplicated helpers** — `formatDuration`/`formatGrams`/`fileToBase64`/`fetchJSON`/`getLayoutColor` are copy-pasted across apps; several belong in `@bcl32/data-utils` (already a dependency).
5. **Theme-token discipline** — apps hardcode Tailwind palette colours (`dark:bg-green-900`) instead of semantic tokens; Security-Benchmarks hardcodes `class="light"` with no toggle.

---

## Caveats — how to trust this

- **Machine-generated, then spot-checked.** The bulk was produced by subagents; a human-style QA
  pass verified the load-bearing facts above and reconciled the contradictions. Treat the **reality/
  evidence columns** as authoritative and **line numbers as approximate anchors** — files drift.
- **Count reconciliation.** The automated verifier confirmed **92** of 106 candidate inconsistencies
  on a single-vote pass. The `05-INCONSISTENCIES.md` author then re-adjudicated on closer reading and
  reports **71 confirmed + 16 needs-review**, demoting a disputed cluster (chiefly the post-commit-hook
  existence question and an inverted CI 409-handling claim) to Part 3. The QA pass resolved the hook
  question in favour of *exists*. When the two counts disagree, trust `05-INCONSISTENCIES.md` — it had
  the most context.
- **Nothing outside this directory was modified**, and nothing was committed. Folding these
  corrections back into the source docs/skills is a separate, reviewable step.
