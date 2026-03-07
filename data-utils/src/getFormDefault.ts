import type { ModelAttribute } from "./types";

export function getFormDefault(attr: ModelAttribute): unknown {
  if (attr.default !== undefined) return attr.default;
  switch (attr.type) {
    case "string":  return "";
    case "boolean": return false;
    case "list":    return [];
    case "id":      return null;
    default:        return undefined;
  }
}
