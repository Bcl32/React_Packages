---
"@bcl32/filters": minor
---

Add filter targeting: reach a specific filter from outside the page that owns it

Filter state lives in per-page React state with no provider at the app root, so
until now nothing outside a page could open one of its filters. `FilterSearchBar`
already faced this and solved it with a DOM attribute, which works for moving
focus but not for calling `addFilter` or expanding the panel.

New subpath `@bcl32/filters/FilterTargeting`:

- `requestFilter(field, { path })` — reveal the panel, mount `field` if it isn't
  already, scroll its card into view with the same landing flash the `/` hotkey
  uses, and focus its control. A combobox opens its list on focus, so an options
  filter lands ready to type a value.
- `requestFilterSearch({ path })` / `requestAddFilter({ path })` — focus the
  filter search box, or open the "+ Add filter" picker.
- `registerFilterBar` / `pumpFilterRequests` — the registry `useDataTableFilterBar`
  now uses to publish itself. Consumers don't call these.

Requests are queued rather than executed immediately, which is what lets a
shortcut navigate to another entity's page first: each retries as the route
lands, the bar mounts, and the dataset loads, then expires after 8s. The
optional `path` pins a request to a route so bars on the page you left can't
answer for a field name they happen to share.

Also exported: `flash` and `topmostFilterRoot` from `./FilterSearchHotkey`, and
`AddFilterPicker` accepts optional controlled `open` / `onOpenChange` props.
Rendered filter cards carry `data-filter-field="<filter key>"`, and the shared
filter header row carries `data-filter-header`.

Backwards compatible: no existing prop or export changed behaviour.
