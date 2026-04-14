---
"@bcl32/forms": patch
---

fix(forms): BulkEditModelForm onSuccess callback never fired

`handleSubmit` awaited `mutation.mutate()` (which returns void, not a promise) and then called `setRowSelection({})` synchronously. Consumers like DataTable conditionally render BulkEditModelForm on `selectedIds.length > 0`, so clearing the selection eagerly unmounted the form before TanStack Query flipped `mutation.isSuccess` to true — the success useEffect never ran, and `onSuccess` was silently dropped.

Fix: drop the bogus `await` and the eager selection clear. The existing success useEffect already handles toast, close, selection reset, and the callback once the form is still guaranteed to be mounted.
