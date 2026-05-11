---
"@bcl32/datatable": minor
---

feat(datatable): adaptive layout with optional row virtualization

DataTable now renders as a flex-column container with an internal scroll region. When a consumer wraps it in a flex+height parent (e.g. `<div className="h-[calc(100vh-8rem)] flex flex-col">`), DataTable owns its own scroll so the toolbar and filter panel stay visible while rows scroll beneath them. When the parent is unbounded, the layout gracefully falls back to page-scroll — no consumer changes required.

Adds two new props:

- `virtualized?: boolean` — opt in to row virtualization via `@tanstack/react-virtual`. Uses padding-row rendering so standard `<table>` markup, sticky headers, and expandable sub-rows keep working. The virtualizer attaches to DataTable's internal scroll region.
- `estimatedRowHeight?: number` — tune the virtualizer's row-size estimate (default 56px).

Existing call sites that don't use these props are unaffected. To get the sticky-toolbar UX on existing list pages, swap the wrapper's `overflow-auto` for `flex flex-col`.
