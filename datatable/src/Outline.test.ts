import { describe, expect, it } from "vitest";

import {
  ancestorsOf,
  buildRowTree,
  childrenOf,
  descendantsOf,
  outlineLines,
  outlineRoots,
  rollupTree,
  topOf,
} from "./Outline";

type T = { id: string; parent: string | null; order: number; done?: boolean; parts?: number };
const t = (id: string, parent: string | null = null, order = 0, extra: Partial<T> = {}): T => ({
  id, parent, order, ...extra,
});

// yard → lights, spot, shed → empty, dolly ; other
const rows = (): T[] => [
  t("yard"),
  t("shed", "yard", 2),
  t("lights", "yard", 0, { done: true }),
  t("spot", "yard", 1),
  t("empty", "shed", 0),
  t("dolly", "shed", 1, { done: true }),
  t("other", null, 1),
];
const build = (r = rows()) =>
  buildRowTree(r, { parentId: (x) => x.parent, compare: (a, b) => a.order - b.order });
const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe("buildRowTree", () => {
  it("sorts siblings and keeps the top level under null", () => {
    const tree = build();
    expect(ids(childrenOf(tree, "yard"))).toEqual(["lights", "spot", "shed"]);
    expect(ids(childrenOf(tree, null))).toEqual(["yard", "other"]);
  });

  it("puts a row whose parent is missing, or itself, at the top level", () => {
    const tree = build([t("lost", "gone"), t("self", "self")]);
    expect(ids(childrenOf(tree, null))).toEqual(["lost", "self"]);
  });
});

describe("walking the tree", () => {
  it("finds ancestors, descendants and the top", () => {
    const tree = build();
    const dolly = tree.byId.get("dolly")!;
    expect(ids(ancestorsOf(tree, dolly))).toEqual(["yard", "shed"]);
    expect(topOf(tree, dolly).id).toBe("yard");
    expect(ids(descendantsOf(tree, "yard"))).toEqual(["lights", "spot", "shed", "empty", "dolly"]);
  });

  it("lists lines with depth and skips folded branches", () => {
    const tree = build();
    expect(outlineLines(tree, "yard").map((l) => `${l.row.id}:${l.depth}`)).toEqual([
      "lights:1", "spot:1", "shed:1", "empty:2", "dolly:2",
    ]);
    expect(ids(outlineLines(tree, "yard", new Set(["shed"])).map((l) => l.row))).toEqual([
      "lights", "spot", "shed",
    ]);
  });

  it("survives a cycle in the data", () => {
    const tree = buildRowTree([t("a", "b"), t("b", "a")], { parentId: (x) => x.parent });
    // Neither resolves to the top level, so the pair is unreachable from it —
    // but no walk loops forever.
    expect(ancestorsOf(tree, tree.byId.get("a")!).length).toBe(1);
    expect(outlineLines(tree, "a").length).toBe(1);
  });
});

describe("outlineRoots", () => {
  it("returns each match's top row once, in match order", () => {
    const tree = build();
    const by = (id: string) => tree.byId.get(id)!;
    expect(ids(outlineRoots(tree, [by("other"), by("dolly"), by("lights"), by("yard")]))).toEqual([
      "other", "yard",
    ]);
  });
});

describe("rollupTree", () => {
  it("gives own, below (row excluded) and deep (row included) figures", () => {
    const tree = build();
    const stats = rollupTree(tree, {
      own: (r) => ({ done: r.done ? 1 : 0, total: 1 }),
      merge: (a, b) => ({ done: a.done + b.done, total: a.total + b.total }),
    });
    expect(stats.get("yard")!.below).toEqual({ done: 2, total: 5 });
    expect(stats.get("yard")!.deep).toEqual({ done: 2, total: 6 });
    expect(stats.get("shed")!.below).toEqual({ done: 1, total: 2 });
    expect(stats.get("other")!.below).toBeNull();
    expect(stats.get("other")!.deep).toEqual({ done: 0, total: 1 });
  });
});
