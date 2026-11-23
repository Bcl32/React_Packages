import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { REFERENCE_OBJECTS, REFERENCE_ORDER, buildReference, isReferenceKey, placeReferenceBeside, type ReferenceKey } from "./reference";

const sizeOf = (object: Parameters<Box3["setFromObject"]>[0]) => {
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  return { box, size: box.getSize(new Vector3()) };
};

describe("the registry", () => {
  it("lists every object once, smallest first", () => {
    expect([...REFERENCE_ORDER].sort()).toEqual(Object.keys(REFERENCE_OBJECTS).sort());
    const longest = REFERENCE_ORDER.map((k) => Math.max(...REFERENCE_OBJECTS[k].sizeMm));
    expect(longest).toEqual([...longest].sort((a, b) => a - b));
  });

  it("carries the published dimensions", () => {
    expect(REFERENCE_OBJECTS.toonie.sizeMm).toEqual([28, 1.75, 28]);
    expect(REFERENCE_OBJECTS.card.sizeMm).toEqual([85.6, 0.76, 53.98]);
    expect(REFERENCE_OBJECTS.can.sizeMm).toEqual([66.2, 122.2, 66.2]);
  });

  it("recognises its own keys only", () => {
    expect(isReferenceKey("card")).toBe(true);
    expect(isReferenceKey("none")).toBe(false);
    expect(isReferenceKey("toString")).toBe(false);
    expect(isReferenceKey(null)).toBe(false);
  });
});

describe("buildReference", () => {
  const drawn: ReferenceKey[] = ["toonie", "card", "can", "ruler"];

  it.each(drawn)("draws the %s at its real size, resting on the ground, centred", async (key) => {
    const built = await buildReference(key);
    const [long, tall, deep] = REFERENCE_OBJECTS[key].sizeMm;
    const { box, size } = sizeOf(built.object);
    // The drawn details (a coin's core, a card's pad, a ruler's marks) stand
    // at most 0.15 mm proud of the body.
    expect(size.x).toBeCloseTo(long, 0);
    expect(size.z).toBeCloseTo(deep, 0);
    // Geometry is stored as 32-bit floats, hence the small allowances.
    expect(size.y).toBeGreaterThanOrEqual(tall - 1e-4);
    expect(size.y).toBeLessThanOrEqual(tall + 0.31);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 3);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 3);
    expect(built.fallback).toBe(false);
    expect(built.size[0]).toBeCloseTo(size.x, 6);
    expect(built.size[1]).toBeCloseTo(size.y, 6);
    expect(() => built.dispose()).not.toThrow();
  });

  it("stands the object on z = 0 in a Z-up scene, height along z", async () => {
    const built = await buildReference("can", { up: "z" });
    const { box, size } = sizeOf(built.object);
    expect(size.z).toBeCloseTo(122.2, 1);
    expect(size.x).toBeCloseTo(66.2, 0);
    expect(size.y).toBeCloseTo(66.2, 0);
    expect(box.min.z).toBeCloseTo(0, 6);
    expect(built.size[2]).toBeCloseTo(122.2, 1);
  });

  it("uses a box of the right length when the model file has no URL", async () => {
    const built = await buildReference("banana");
    expect(built.fallback).toBe(true);
    expect(sizeOf(built.object).size.x).toBeCloseTo(190, 6);
  });

  it("uses the box, and says so, when the model file cannot be loaded", async () => {
    const errors: string[] = [];
    const built = await buildReference("banana", { assetUrl: "http://127.0.0.1:9/missing.glb", onAssetError: (key) => errors.push(key) });
    expect(built.fallback).toBe(true);
    expect(errors).toEqual(["banana"]);
  });

  it("refuses an unknown key", async () => {
    await expect(buildReference("none" as ReferenceKey)).rejects.toThrow(/unknown reference/);
  });
});

describe("placeReferenceBeside", () => {
  // A part 40 x 20 x 10 mm, centred on the origin.
  const part = { min: [-20, -10, -5], max: [20, 10, 5] };

  it("stands the object on the part's floor on the +X side by default (Y-up)", async () => {
    const built = await buildReference("card");
    const placed = placeReferenceBeside(built, part);
    const { box } = sizeOf(built.object);
    expect(box.min.y).toBeCloseTo(-10, 6);
    // Reach 20, gap max(20 * 0.2, 5) = 5: the card starts at x = 25.
    expect(box.min.x).toBeCloseTo(25, 3);
    expect(placed.position[0]).toBeCloseTo(25 + 85.6 / 2, 4);
    expect(placed.position[2]).toBeCloseTo(0, 6);
  });

  it("turns the long side along the direction and reports the box it occupies (Z-up)", async () => {
    const built = await buildReference("ruler", { up: "z" });
    const placed = placeReferenceBeside(built, part, { up: "z", direction: [0, -3] });
    const { box, size } = sizeOf(built.object);
    // Long side along y now; the part's floor is z = -5.
    expect(size.y).toBeCloseTo(310, 0);
    expect(size.x).toBeCloseTo(30, 0);
    expect(box.min.z).toBeCloseTo(-5, 6);
    // Reach 10 along -y, gap 5: the ruler's near end is at y = -15.
    expect(box.max.y).toBeCloseTo(-15, 3);
    const xs = placed.corners.filter((_, i) => i % 3 === 0);
    const ys = placed.corners.filter((_, i) => i % 3 === 1);
    const zs = placed.corners.filter((_, i) => i % 3 === 2);
    expect(placed.corners).toHaveLength(24);
    expect(Math.min(...xs)).toBeCloseTo(box.min.x, 3);
    expect(Math.max(...xs)).toBeCloseTo(box.max.x, 3);
    expect(Math.min(...ys)).toBeCloseTo(box.min.y, 3);
    expect(Math.max(...ys)).toBeCloseTo(box.max.y, 3);
    expect(Math.min(...zs)).toBeCloseTo(box.min.z, 3);
    expect(Math.max(...zs)).toBeCloseTo(box.max.z, 1);
  });

  it("honours an explicit gap and a diagonal direction", async () => {
    const built = await buildReference("toonie", { up: "z" });
    const placed = placeReferenceBeside(built, part, { up: "z", direction: [-1, -1], gapMm: 2 });
    const d = Math.SQRT1_2;
    // Reach along the diagonal: 20 * d + 10 * d; then the gap and half the coin.
    const distance = 30 * d + 2 + 14;
    expect(placed.position[0]).toBeCloseTo(-d * distance, 6);
    expect(placed.position[1]).toBeCloseTo(-d * distance, 6);
    expect(placed.position[2]).toBeCloseTo(-5, 6);
  });
});
