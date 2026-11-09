/** Join class names, dropping falsy ones. Internal: the package needs no `cn`. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
