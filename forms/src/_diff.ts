// Internal helper for EditModelForm — not a package entry point.
// Lets the edit form PATCH only the attributes a user actually changed,
// rather than re-sending the whole object on every save.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursive equality for form values: primitives, arrays, and plain objects.
 * Non-plain objects (File, Blob, Date, Dayjs) are compared by reference — they
 * fail the `a === b` fast path and are therefore treated as different, which is
 * the desired behaviour for a freshly picked file or date.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== "object" || typeof b !== "object") return false;

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]),
  );
}

/**
 * Returns a new object holding only the keys of `current` whose value is not
 * deep-equal to `original`'s. The `id` key is always skipped — it identifies
 * the record in the request URL, never in the PATCH body.
 */
export function changedFields(
  current: Record<string, unknown>,
  original: Record<string, unknown>,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(current)) {
    if (key === "id") continue;
    if (!deepEqual(current[key], original[key])) {
      diff[key] = current[key];
    }
  }
  return diff;
}
