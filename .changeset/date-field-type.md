---
"@bcl32/forms": minor
"@bcl32/data-utils": minor
---

Render a `date` attribute as a native date picker

Pairs with bcl32-schema-utils, which now emits `type: "date"` for a
`datetime.date` column instead of letting it fall through to `string`. Until
now every calendar-day field — a due date, a purchase date, a budget window —
got a free-text box: no picker, no validation, no calendar.

**`@bcl32/forms`** — `FieldInput` gains a `date` case rendering
`<input type="date">`, and `FormElement` routes `date` through the same
single-line layout as `string`. It is deliberately NOT the existing `datetime`
branch: that one is a dayjs-backed date-and-time control, and a due date has no
time to ask for.

The value format is the wire format. An `<input type="date">` reads and writes
`"YYYY-MM-DD"`, which is exactly what a Pydantic `date` accepts and emits, so
no parsing, formatting or timezone conversion sits between the picker and the
column — verified round-tripping the 1st of a month, where a UTC/local slip
would surface as the last day of the previous month.

**`@bcl32/data-utils`** — `CalculateFeatureStats` counts `date` alongside
`string` and `select`. This is what keeps the change behaviour-neutral: a date
field filters as a string, so it needs the same grouped-count stat a string
gets, or its stats entry would come back empty and its filter would behave
differently from the free-text box it replaced.

**Upgrading:** adopt this BEFORE regenerating metadata against schema-utils
with the date type. `canRenderFormElement` returns `false` for a type it does
not know, so metadata declaring `type: "date"` against an older `@bcl32/forms`
makes those fields **vanish from the form** rather than fall back to a text
box. Publish → deps-sync → regenerate, in that order.

Filtering is unchanged: `date` still filters as a string (contains). A real
date-range filter needs a date-only comparison first — the `datetime` filter
parses a bare `"2026-06-15"` as UTC midnight and compares it against a
local-time bound, which drops boundary days west of UTC.
