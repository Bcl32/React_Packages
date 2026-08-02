import type { CommandEntry } from "./types";

interface NavLike {
  title: string;
  url?: string;
  icon?: CommandEntry["icon"];
  items?: NavLike[];
}

/**
 * Walks a sidebar nav tree (`{title, url?, icon?, items?}`) and flattens it into
 * `CommandEntry[]`. Url-less section headers are skipped (they are not
 * navigable) and duplicate urls are dropped, keeping the first occurrence.
 */
export function flattenNavItems(items: NavLike[], group = "Navigation"): CommandEntry[] {
  const out: CommandEntry[] = [];
  const seen = new Set<string>();
  const walk = (list?: NavLike[]) => {
    for (const item of list ?? []) {
      if (item.url && !seen.has(item.url)) {
        seen.add(item.url);
        out.push({ id: `nav:${item.url}`, label: item.title, group, icon: item.icon, to: item.url });
      }
      walk(item.items);
    }
  };
  walk(items);
  return out;
}
