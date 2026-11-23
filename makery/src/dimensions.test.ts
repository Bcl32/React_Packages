import { Box3, Object3D, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { buildDimensionOverlay, dimensionsOf, formatDimensions, formatMm, type AxisLabel } from "./dimensions";

// A part 64 x 40 x 22.5 mm (x, y, z), off-centre.
const bounds = { min: [10, -20, 0], max: [74, 20, 22.5] };

// Labels need a 2D canvas; the overlay takes a stub.
const stubLabels = () => {
  const made: { text: string; object: Object3D; disposed: boolean }[] = [];
  const label = (text: string): AxisLabel => {
    const entry = { text, object: new Object3D(), disposed: false };
    made.push(entry);
    return { object: entry.object, aspect: 3, dispose: () => (entry.disposed = true) };
  };
  return { made, label };
};

describe("dimensionsOf", () => {
  it("names the extents by the up axis", () => {
    expect(dimensionsOf(bounds, "z")).toEqual({ width: 64, depth: 40, height: 22.5 });
    expect(dimensionsOf(bounds, "y")).toEqual({ width: 64, depth: 22.5, height: 40 });
    expect(dimensionsOf(bounds)).toEqual(dimensionsOf(bounds, "z"));
  });

  it("never reports a negative size", () => {
    expect(dimensionsOf({ min: [1, 1, 1], max: [0, 0, 0] })).toEqual({ width: 0, depth: 0, height: 0 });
  });
});

describe("formatting", () => {
  it("writes one decimal by default, as Print-Tracker does", () => {
    expect(formatMm(42)).toBe("42.0 mm");
    expect(formatMm(4.56)).toBe("4.6 mm");
    expect(formatDimensions({ width: 64, depth: 40, height: 22.5 })).toBe("64.0 × 40.0 × 22.5 mm");
  });

  it("can drop trailing zeros and change precision", () => {
    expect(formatMm(42, { trimZeros: true })).toBe("42 mm");
    expect(formatMm(4.5, { trimZeros: true })).toBe("4.5 mm");
    expect(formatMm(100, { trimZeros: true })).toBe("100 mm");
    expect(formatMm(12.345, { digits: 2 })).toBe("12.35 mm");
    expect(formatMm(12.3, { digits: 0, trimZeros: true })).toBe("12 mm");
    expect(formatDimensions({ width: 64, depth: 40, height: 22.5 }, { trimZeros: true })).toBe("64 × 40 × 22.5 mm");
    expect(formatMm(Number.NaN)).toBe("0.0 mm");
  });
});

describe("buildDimensionOverlay", () => {
  it("draws the box around the part, where the part is", () => {
    const { label } = stubLabels();
    const overlay = buildDimensionOverlay(bounds, { up: "z", label });
    overlay.object.updateMatrixWorld(true);
    const lines = overlay.object.children[0];
    const box = new Box3().setFromObject(lines);
    expect(box.min.toArray().map((v) => +v.toFixed(4))).toEqual([10, -20, 0]);
    expect(box.max.toArray().map((v) => +v.toFixed(4))).toEqual([74, 20, 22.5]);
    expect(overlay.dimensions).toEqual({ width: 64, depth: 40, height: 22.5 });
  });

  it("labels width, depth and height with the formatted lengths", () => {
    const { made, label } = stubLabels();
    const overlay = buildDimensionOverlay(bounds, { up: "z", label, format: (mm) => formatMm(mm, { trimZeros: true }) });
    expect(overlay.texts).toEqual(["64 mm", "40 mm", "22.5 mm"]);
    expect(made.map((m) => m.text)).toEqual(overlay.texts);
  });

  it("puts the labels on the edges that face the default camera (+x, near side)", () => {
    const { made, label } = stubLabels();
    buildDimensionOverlay(bounds, { up: "z", label });
    const off = 64 * 0.06;
    const [w, d, h] = made.map((m) => m.object.position.toArray());
    // Positions are about the box centre.
    expect(w).toEqual([0, -(20 + off), -(11.25 + off)]);
    expect(d).toEqual([32 + off, 0, -(11.25 + off)]);
    expect(h).toEqual([32 + off, -(20 + off), 0]);
  });

  it("follows the camera's side, and can move the height label to the outline edge away from the depth label", () => {
    const { made, label } = stubLabels();
    buildDimensionOverlay(bounds, { up: "z", label, toCamera: [-0.5, 0.7, 0.5], heightEdge: "side" });
    const off = 64 * 0.06;
    const [w, d, h] = made.map((m) => m.object.position.toArray());
    expect(w).toEqual([0, 20 + off, -(11.25 + off)]);
    expect(d).toEqual([-(32 + off), 0, -(11.25 + off)]);
    expect(h).toEqual([32 + off, 20 + off, 0]);
  });

  it("works Y-up: height runs along y", () => {
    const { made, label } = stubLabels();
    const overlay = buildDimensionOverlay(bounds, { up: "y", label });
    expect(overlay.texts).toEqual(["64.0 mm", "22.5 mm", "40.0 mm"]);
    const off = 64 * 0.06;
    const height = made[2].object.position.toArray();
    expect(height[1]).toBe(0);
    expect(height[0]).toBe(32 + off);
    expect(made[0].object.position.y).toBe(-(20 + off));
  });

  it("sizes labels to the part and reports the points a camera must keep in frame", () => {
    const { made, label } = stubLabels();
    const overlay = buildDimensionOverlay(bounds, { up: "z", label });
    const labelHeight = 64 * 0.16 * 0.6;
    expect(made[0].object.scale.toArray()).toEqual([labelHeight * 3, labelHeight, 1]);
    // Six points per label, in the bounds' own space (not about the centre).
    expect(overlay.framingPoints).toHaveLength(3 * 6 * 3);
    const reach = Math.hypot(labelHeight * 3, labelHeight) / 2;
    const anchor = made[0].object.position.clone().add(new Vector3(42, 0, 11.25));
    expect(overlay.framingPoints.slice(0, 6)).toEqual([anchor.x - reach, anchor.y, anchor.z, anchor.x + reach, anchor.y, anchor.z]);
  });

  it("disposes its labels", () => {
    const { made, label } = stubLabels();
    const overlay = buildDimensionOverlay(bounds, { label });
    overlay.dispose();
    expect(made.every((m) => m.disposed)).toBe(true);
  });
});
