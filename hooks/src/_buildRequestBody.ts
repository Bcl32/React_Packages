/**
 * Internal helper used by the mutation hooks (useApiMutation, useDatabaseMutation)
 * to decide whether a payload should go out as JSON or as multipart/form-data.
 *
 * JSON is the default. If any value in the top-level `data` object is a `File`
 * or a `Blob`, we switch to multipart — the standard transport for file uploads.
 * The browser populates the `Content-Type` (including the boundary token) when
 * a `FormData` body is handed to `fetch`, so we explicitly OMIT the header in
 * that branch to let it do its job.
 *
 * Non-file fields get appended as strings (JSON-encoded when they're objects)
 * so a mixed payload like `{ file: File, material: "pla-matte", tags: ["a","b"] }`
 * round-trips cleanly through FastAPI's `Form(...)` parsing on the server side.
 *
 * Not exported from the package's public surface — the hooks use it internally
 * and callers only see the "pass whatever you want in .mutate()" ergonomics.
 */

function isFileLike(v: unknown): v is File | Blob {
  return v instanceof File || v instanceof Blob;
}

function isArrayOfFiles(v: unknown): v is (File | Blob)[] {
  return Array.isArray(v) && v.length > 0 && v.every(isFileLike);
}

function hasFileValue(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  for (const v of Object.values(data as Record<string, unknown>)) {
    if (isFileLike(v) || isArrayOfFiles(v)) return true;
  }
  return false;
}

export interface RequestBody {
  body: BodyInit;
  headers: Record<string, string>;
}

export function buildRequestBody(data: unknown): RequestBody {
  if (!hasFileValue(data)) {
    return {
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    };
  }

  const fd = new FormData();
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value == null) continue;
    if (isFileLike(value)) {
      fd.append(key, value);
    } else if (isArrayOfFiles(value)) {
      // Multi-file uploads: append each under the same key so FastAPI's
      // `files: list[UploadFile] = File(...)` receives all of them.
      for (const f of value) fd.append(key, f);
    } else if (typeof value === "string") {
      fd.append(key, value);
    } else {
      // Numbers, booleans, arrays, plain objects — JSON-encode so the server
      // can reconstruct complex values from a form field. Simple primitives
      // survive a round-trip through `JSON.stringify` + `json.loads`.
      fd.append(key, JSON.stringify(value));
    }
  }
  // Deliberately no Content-Type — the browser adds the multipart boundary.
  return { body: fd, headers: {} };
}
