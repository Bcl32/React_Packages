---
"@bcl32/filters": minor
"@bcl32/utils": minor
---

Reorganize the time filter and its shortcuts dialog.

**`TimeFilter`** no longer imposes its own `xl:grid-cols-3` layout. It nested
inside the filter bar's page grid with no gutters, which crushed the two date
pickers and the action buttons into a single narrow column. It now renders as a
single-column card matching the sibling filters' `p-2 space-y-1.5` rhythm, with
the label and actions on one row and From/To pickers aligned on a two-column
grid below. Trigger labels use an abbreviated `MMM D 'YY, h:mma` format so they
fit the column.

**`TimeEditDialog`** moves off the `big` dialog size (`max-w-screen-2xl` and
full viewport height) to `medium`, and is grouped into three sections: the
selected span, quick ranges, and fine tuning. Spacing comes from `space-y`/`gap`
utilities instead of bare `<br />` tags, and the hardcoded `w-[32rem]` on the
step selector is gone.

- Adds **Past 15 minutes**, **Past 1 hour**, and **Past 6 hours** shortcuts
  alongside the existing day/week/month/year ranges.
- The span summary now prints only non-zero units — a 15 minute window read
  "0 Years 0 Months 0 Days 0 Hours 15 Minutes" before.
- Warns when the end time precedes the start time, which previously rendered
  silently as a negative span.
- The step-size selector no longer sets `bg-muted-foreground` (a foreground
  token) as a background.

**`RadioButton`** gains optional `groupName` and `id` props. It previously
hardcoded `name="option"` and derived `id` from the label, so several groups on
one page formed a single radio group and shared duplicate DOM ids — with more
than one time filter in the bar, changing the step size in one cleared it in the
others. Both props default to the previous behaviour. Checked styling now uses
`bg-primary`/`text-primary-foreground` instead of `bg-primary/50`/`text-white`,
which was low-contrast in light themes.
