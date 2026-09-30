---
"@bcl32/filters": minor
---

A `date` filter kind for calendar-day fields: relative presets (Before today, Today, Next 7 days, Has a date, No date) stored as tokens, or an inclusive YYYY-MM-DD range, compared as days rather than instants so "from June 15" keeps June 15 west of UTC. Driven by `filter_type: "date"` from bcl32-schema-utils; metadata still declaring `string` keeps its text box.
