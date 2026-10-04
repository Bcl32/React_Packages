/**
 * The list arithmetic behind RelationCollectionField's folding sections.
 *
 * A section is only the name its rows share (`row.section`); there is no
 * sections table. A box's rows are grouped by that name — the unnamed group
 * first and without a heading, then each named group in the order its first
 * row appears — and every move is done on the groups and flattened back into
 * one stored order. Pure functions, so the component only wires events to them.
 */

export interface Group<T> {
  /** "" is the unnamed group: rows with no section, drawn without a heading. */
  name: string;
  rows: T[];
}

interface Row {
  id: string;
  [key: string]: unknown;
}

export const sectionOf = (row: Row): string => ((row.section as string) || "").trim();

/**
 * Rows grouped by section. `drafts` are headings somebody has added but not yet
 * put anything under; they are drawn (empty) after the groups that have rows.
 */
export function groupRows<T extends Row>(
  rows: T[],
  keyOf: (row: T) => string,
  drafts: string[] = [],
): Group<T>[] {
  const groups = new Map<string, T[]>([["", []]]);
  for (const row of rows) {
    const name = keyOf(row);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(row);
  }
  for (const name of drafts) if (name && !groups.has(name)) groups.set(name, []);
  return [...groups].map(([name, list]) => ({ name, rows: list }));
}

export const flatten = <T>(groups: Group<T>[]): T[] => groups.flatMap((g) => g.rows);

/**
 * Move one row into group `to` at `index`, counted in the group as it stood
 * before the move — so dropping on a row below lands after it, on a row above
 * lands before it, the same as reordering a plain list.
 */
export function moveRow<T extends Row>(
  groups: Group<T>[],
  id: string,
  to: string,
  index: number,
): Group<T>[] {
  const row = flatten(groups).find((r) => r.id === id);
  if (!row || !groups.some((g) => g.name === to)) return groups;
  const next = groups.map((g) => ({ name: g.name, rows: g.rows.filter((r) => r.id !== id) }));
  const target = next.find((g) => g.name === to)!;
  target.rows.splice(Math.max(0, Math.min(index, target.rows.length)), 0, row);
  return next;
}

/**
 * Move the named group to where `onto` stands (after it when moving down,
 * before it when moving up). The unnamed group stays first.
 */
export function moveGroup<T>(groups: Group<T>[], name: string, onto: string): Group<T>[] {
  if (!name || !onto || name === onto) return groups;
  const from = groups.findIndex((g) => g.name === name);
  const to = groups.findIndex((g) => g.name === onto);
  if (from < 0 || to < 0) return groups;
  const next = [...groups];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
