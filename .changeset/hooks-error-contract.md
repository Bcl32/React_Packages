---
"@bcl32/hooks": minor
---

Error-contract hardening: `apiFetch` now normalises no-response failures into typed errors (`ApiError{status: 0, code: "network_error"}` for offline/DNS/TLS, `code: "request_timeout"` for an elapsed new `timeoutMs` option, caller aborts re-thrown untouched); `useGetRequest` applies a 30s default GET timeout (`timeoutMs` option, `null` disables); new `queryDefaults` subpath exports `sharedQueryRetry` / `defaultShouldRetry` / `defaultRetryDelay` — no retry on 4xx or timeout, 2× capped backoff on 5xx/network.
