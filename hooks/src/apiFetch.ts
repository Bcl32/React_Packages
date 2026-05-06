import { ApiError } from "./ApiError";

/**
 * Format FastAPI's 422 validation array into a single-line message, e.g.
 * `"name: field required"`. Returns null when the shape doesn't match —
 * caller should fall through to other strategies.
 */
function formatValidationDetail(detail: unknown): string | null {
  if (!Array.isArray(detail) || detail.length === 0) return null;
  const first = detail[0];
  if (typeof first !== "object" || first === null) return null;
  const loc = Array.isArray((first as any).loc) ? (first as any).loc : [];
  const msg = (first as any).msg;
  if (typeof msg !== "string") return null;
  // FastAPI's loc is ["body", "field_name", ...]. Drop the source prefix.
  const path = loc.slice(1).join(".");
  return path ? `${path}: ${msg}` : msg;
}

/**
 * `fetch` wrapper that throws an {@link ApiError} on any non-OK response.
 *
 * The plain `fetch` API doesn't throw on 4xx/5xx — it returns the response
 * with `res.ok === false` and lets the caller deal with it. Every consumer
 * ends up duplicating the same boilerplate (parse JSON, build an Error, throw).
 * This wrapper centralises that.
 *
 * Handles three response shapes:
 *   1. New structured envelope: `{ code, message, details }`
 *   2. Legacy FastAPI string detail: `{ detail: "human message" }`
 *   3. FastAPI structured detail: `{ detail: { code, message, ... } }`
 *      or `{ detail: [...validation errors...] }` for 422
 *
 * Endpoints that haven't been migrated to the new envelope still produce a
 * usable `ApiError` — they just won't have a meaningful `code` (it falls
 * back to "unknown_error"), and validation-array messages get formatted
 * into a friendly "field: reason" form.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  opts?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, opts);
  if (res.ok) return res;

  let body: any = null;
  try {
    body = await res.clone().json();
  } catch {
    // Response wasn't JSON — leave body null and fall back to res.statusText.
  }

  // Pull fields from whichever envelope the backend used. Order of
  // precedence is "new shape first, legacy fallback second", so endpoints
  // already emitting `{code, message, details}` at the top level win, but
  // unmigrated FastAPI endpoints that wrap the same shape inside `detail`
  // still surface a meaningful `code` to consumers.
  const detail = body?.detail;
  const detailIsObject = typeof detail === "object" && detail !== null && !Array.isArray(detail);
  const code = body?.code ?? (detailIsObject ? detail.code : undefined);
  const message =
    body?.message ??
    (typeof detail === "string" ? detail : null) ??
    (detailIsObject ? detail.message : null) ??
    formatValidationDetail(detail) ??
    res.statusText;
  const details =
    body?.details ??
    (detailIsObject ? detail : null) ??
    (Array.isArray(detail) ? detail : null);

  throw new ApiError({ code, status: res.status, message, details });
}
