---
"@bcl32/hooks": minor
---

Add `useJobProgress(jobUrl, { intervalMs = 2000, enabled, isTerminal })` — a polling hook that GETs a job until it reaches a terminal status (`succeeded`, `failed`, `cancelled`, `paused`), then stops on its own. Exported at `@bcl32/hooks/useJobProgress` with `jobPollInterval`, `jobIsTerminal`, `isTerminalJobStatus` and `TERMINAL_JOB_STATUSES`.

The new `@bcl32/viz` package ships at its hand-set `0.1.0` (the registry sweep in `publish-verify.sh detect` picks up a version absent from the registry); it is deliberately NOT listed here, which would bump it to 0.2.0 on its first release.
