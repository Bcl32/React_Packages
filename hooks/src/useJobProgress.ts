import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "./ApiError";
import { apiFetch } from "./apiFetch";

/**
 * Job statuses after which a job never changes again. `paused` is terminal for
 * the job ROW: resuming queues a new job, it does not revive this one.
 */
export const TERMINAL_JOB_STATUSES: readonly string[] = [
  "succeeded",
  "failed",
  "cancelled",
  "paused",
  "done",
];

/** True when `status` is one a job is finished in. */
export const isTerminalJobStatus = (status: unknown): boolean =>
  typeof status === "string" && TERMINAL_JOB_STATUSES.includes(status);

/**
 * The default "is this finished?" test: a job object (`{status}`) in a terminal
 * status. A list response has no top-level `status`, so a list poll never
 * stops on its own — it stops when the caller disables it.
 */
export const jobIsTerminal = (data: unknown): boolean =>
  typeof data === "object" && data !== null && isTerminalJobStatus((data as { status?: unknown }).status);

/**
 * The next poll delay for `data`: `false` (stop) once it is terminal,
 * `intervalMs` otherwise — including before the first answer lands. Pure, so
 * the stop rule is tested without a QueryClient.
 */
export function jobPollInterval<T>(
  data: T | undefined,
  intervalMs: number,
  isTerminal: (data: T) => boolean = jobIsTerminal,
): number | false {
  if (data !== undefined && isTerminal(data)) return false;
  return intervalMs;
}

export interface UseJobProgressOptions<T> {
  /** Poll cadence; 2 s by default. */
  intervalMs?: number;
  /** Gate the poll (e.g. only while a live stream is down). Default true. */
  enabled?: boolean;
  /** When to stop polling; a job in a terminal status by default. */
  isTerminal?: (data: T) => boolean;
  /** Override the cache key; `["job-progress", url]` by default. */
  queryKey?: unknown[];
  /** Per-request timeout; the shared 30 s GET default. */
  timeoutMs?: number | null;
}

/**
 * Poll a job (or any progress resource) until it finishes.
 *
 * `useJobProgress(jobUrl)` GETs `jobUrl` every `intervalMs` and stops on its
 * own the moment the response is terminal (`isTerminal`, by default a
 * `{status}` in {@link TERMINAL_JOB_STATUSES}). A `null`/empty url disables it,
 * so a page can mount the hook before it knows which job to watch.
 *
 * This is the polling half of live progress: an app with a push channel (SSE)
 * runs it only while the stream is down (`enabled: !live`), and an app without
 * one runs it alone. Background tabs keep polling only as fast as the browser
 * allows timers; nothing here refetches on window focus beyond the app default.
 */
export function useJobProgress<T = unknown>(
  jobUrl: string | null | undefined,
  options?: UseJobProgressOptions<T>,
): UseQueryResult<T, ApiError> {
  const intervalMs = options?.intervalMs ?? 2000;
  const isTerminal = options?.isTerminal ?? (jobIsTerminal as (data: T) => boolean);
  const enabled = Boolean(jobUrl) && (options?.enabled ?? true);
  return useQuery<T, ApiError>({
    queryKey: options?.queryKey ?? ["job-progress", jobUrl],
    queryFn: async () => {
      const res = await apiFetch(jobUrl as string, {
        timeoutMs: options?.timeoutMs === undefined ? 30_000 : options.timeoutMs,
      });
      return (await res.json()) as T;
    },
    enabled,
    staleTime: 0,
    refetchInterval: (query) => (enabled ? jobPollInterval(query.state.data as T | undefined, intervalMs, isTerminal) : false),
    // A background tab still finishes its job; keep the poll honest there too.
    refetchIntervalInBackground: true,
  });
}
