---
"@bcl32/hooks": minor
---

`useApiMutation` accepts hook-level `onError` / `onSuccess` / `meta`. Caller `onSuccess` runs after `invalidateKeys` invalidation; hook-level `onError` doubles as the opt-out signal for an app-wide `MutationCache.onError` default toast (global handlers can't see mutate-time callbacks), with `meta: { silenceErrorToast: true }` as the handler-less opt-out.
