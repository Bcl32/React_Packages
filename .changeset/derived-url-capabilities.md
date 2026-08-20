---
"@bcl32/data-utils": minor
"@bcl32/datatable": minor
"@bcl32/forms": minor
---

Read the bulk-update endpoint as a capability instead of deriving it

A generated ModelData file's URL keys are feature flags — `update_api_url` gates
row editing, `delete_api_url` gates bulk delete. Bulk edit was the exception: it
had no URL of its own and was built as `update_api_url + "/bulk-update"`, so it
was always present wherever editing was, and the button shipped on tables whose
API has no such route (Print-Tracker's `UploadJob`, Base-POC, which batches at
`/batch`) — a dialog that 405s on submit.

bcl32-schema-utils 0.13.0 emits `bulk_update_api_url` only when the route exists
in the app's OpenAPI document. This release consumes it:

- **data-utils** — new `resolveBulkUpdateUrl(ModelData)`, and `ModelData` gains
  the `bulk_update_api_url` field. It falls back to the old derivation while the
  key is absent, so a frontend that upgrades before regenerating its metadata
  keeps bulk edit; that fallback is a migration window and is marked for deletion
  once every app emits the key.
- **forms** — `BulkEditModelForm` posts to the resolved URL, and its
  `ModelData` prop no longer requires `update_api_url`.
- **datatable** — the bulk-edit button and its disabled placeholder gate on the
  resolved bulk URL rather than on row editability, and the Create button now
  requires `add_api_url` as well as `create_enabled` (the same "URL as well as
  the flag" rule bulk delete already followed) — with no create route, that
  button posted to `""`.
