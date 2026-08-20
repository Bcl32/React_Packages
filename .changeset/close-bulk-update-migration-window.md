---
"@bcl32/data-utils": minor
---

Close the bulk-update migration window — `resolveBulkUpdateUrl` no longer derives

2.3.0 shipped `resolveBulkUpdateUrl` with a fallback to the old
`update_api_url + "/bulk-update"` derivation, so an app could adopt the package
before regenerating its metadata with a capability-aware generator. That window
is now closed: absence of `bulk_update_api_url` means "no bulk route", not
"unknown".

The precondition is met. Print-Tracker, House-Hunter and Security-Benchmarks all
run generated metadata from bcl32-schema-utils ≥ 0.13.0, and image-poc — the one
registry still unmigrated, and frozen — does not depend on `@bcl32/data-utils`
at all, so its freeze was never a blocker.

What this switches off is exactly the four models with row editing but no bulk
route: Print-Tracker's `PrintJob` and `UploadJob` (a dialog that 405s on submit
today), and Security-Benchmarks' `Benchmark` and `Run`, whose pages already
clear `update_api_url` by hand so nothing visibly changes there.

**Upgrading:** a call site that hand-injects `update_api_url` for a model the
generator gives no URLs at all — anything `surface: embedded`, scoped under a
parent route — was getting its bulk URL out of the derivation for free, and that
URL may well have been real. Those sites must now inject `bulk_update_api_url`
explicitly. Print-Tracker's part-set members and project-items tables are both
this shape; their bulk routes exist and are preserved by injection, not by
derivation.
