/**
 * The single error type thrown by every shared API helper.
 *
 * `Error` is too generic — when a fetch fails, callers want to know "what
 * kind of failure" (a 404 vs a 409 vs a 500) without parsing the message
 * string. `ApiError` carries the structured info attached:
 *
 *   - `code`    — stable string identifier from the backend, e.g. "linked_records_block_delete"
 *                 (defaults to "unknown_error" when the response didn't supply one)
 *   - `status`  — HTTP status code
 *   - `details` — polymorphic per-code payload (varies by endpoint; consumers
 *                 narrow at the call site)
 *
 * This is the foundation. Higher-level conveniences (typed predicates,
 * cross-cutting handlers) layer on top without changing this contract.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(args: {
    code?: string;
    status: number;
    message: string;
    details?: unknown;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.code = args.code ?? "unknown_error";
    this.status = args.status;
    this.details = args.details ?? null;
  }
}

/** Type guard so consumers can branch on `mutation.error` being an ApiError
 * without writing `instanceof` everywhere. */
export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
