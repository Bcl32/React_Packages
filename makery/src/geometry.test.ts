import { describe, expect, it } from "vitest";

import { attributeView, bakeMeshes, bakeNormals, bakePositions, boundsOf, denormalise, finishContext } from "./geometry";

// A KHR_mesh_quantization-style node: uniform scale 0.004 (so q 32767 is
// ~131 mm) and an offset, column-major.
const S = 0.004;
const NODE = [S, 0, 0, 0, 0, S, 0, 0, 0, 0, S, 0, 10, -5, 2, 1];

// Two vertices, int16 normalised, byteStride 8 (xyz + one pad), the shop's
// display-model layout (renderer/model.py).
const interleaved = new Int16Array([32767, 0, -32767, 0, -16384, 16384, 0, 0]);

describe("denormalise (three's rule)", () => {
  it("decodes signed and unsigned normalised integers", () => {
    expect(denormalise(32767, new Int16Array(1))).toBe(1);
    expect(denormalise(-32768, new Int16Array(1))).toBe(-1);
    expect(denormalise(127, new Int8Array(1))).toBe(1);
    expect(denormalise(255, new Uint8Array(1))).toBe(1);
    expect(denormalise(0.5, new Float32Array(1))).toBe(0.5);
  });
});

describe("bakePositions", () => {
  it("bakes a quantised, interleaved attribute through the node matrix into millimetres", () => {
    const view = { array: interleaved, count: 2, itemSize: 3, stride: 4, offset: 0, normalized: true };
    const mm = bakePositions(view, NODE);
    expect(mm).toBeInstanceOf(Float32Array);
    expect(mm[0]).toBeCloseTo(1 * S + 10, 6);
    expect(mm[1]).toBeCloseTo(-5, 6);
    expect(mm[2]).toBeCloseTo(-1 * S + 2, 6);
    expect(mm[3]).toBeCloseTo((-16384 / 32767) * S + 10, 6);
    expect(mm[4]).toBeCloseTo((16384 / 32767) * S - 5, 6);
  });

  it("does not touch its input", () => {
    const copy = interleaved.slice();
    bakePositions({ array: interleaved, count: 2, itemSize: 3, stride: 4, normalized: true }, NODE);
    expect(interleaved).toEqual(copy);
  });

  it("reads three.js attributes through attributeView (plain and interleaved)", () => {
    const plain = attributeView({ array: new Float32Array([1, 2, 3]), count: 1, itemSize: 3 });
    expect(Array.from(bakePositions(plain))).toEqual([1, 2, 3]);
    const inter = attributeView({
      isInterleavedBufferAttribute: true,
      data: { array: interleaved, stride: 4 },
      offset: 0,
      count: 2,
      itemSize: 3,
      normalized: true,
    });
    expect(inter).toMatchObject({ stride: 4, offset: 0, normalized: true });
    expect(bakePositions(inter, NODE)[0]).toBeCloseTo(S + 10, 6);
  });
});

describe("bakeNormals", () => {
  it("unit length, and perpendicular to the surface under a non-uniform scale", () => {
    // Scale x by 2: a 45° normal (1,1,0) must lean toward y afterwards.
    const m = [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const n = bakeNormals({ array: new Float32Array([Math.SQRT1_2, Math.SQRT1_2, 0]), count: 1, itemSize: 3 }, m);
    expect(Math.hypot(n[0], n[1], n[2])).toBeCloseTo(1, 6);
    expect(n[1]).toBeGreaterThan(n[0]);
    expect(n[0] / n[1]).toBeCloseTo(0.5, 6);
  });

  it("int8 normalised normals", () => {
    const n = bakeNormals({ array: new Int8Array([0, 0, 127, 0]), count: 1, itemSize: 3, stride: 4, normalized: true }, NODE);
    expect(Array.from(n)).toEqual([0, 0, 1]);
  });
});

describe("bakeMeshes", () => {
  it("centres all slots together and gives the material its millimetre context", () => {
    const a = { array: new Float32Array([0, 0, 0, 10, 0, 0]), count: 2, itemSize: 3 };
    const b = { array: new Float32Array([0, 20, 4, 0, 0, 8]), count: 2, itemSize: 3 };
    const { meshes, bounds, centre, context } = bakeMeshes([{ position: a }, { position: b }]);
    expect(centre).toEqual([5, 10, 4]);
    expect(bounds.min).toEqual([-5, -10, -4]);
    expect(bounds.max).toEqual([5, 10, 4]);
    expect(context).toEqual({ meshScale: 20, zMin: -4, zRange: 8 });
    expect(Array.from(meshes[0].position)).toEqual([-5, -10, -4, 5, -10, -4]);
    expect(meshes[1].normal).toBeNull();
  });

  it("meshes sharing one position view share one baked array", () => {
    const shared = { array: new Float32Array([0, 0, 0, 1, 1, 1]), count: 2, itemSize: 3 };
    const { meshes } = bakeMeshes([{ position: shared }, { position: shared }]);
    expect(meshes[0].position).toBe(meshes[1].position);
  });

  it("finishContext and boundsOf agree with Print-Tracker's MeshScene rule", () => {
    const bounds = boundsOf(new Float32Array([-2, -3, -1, 2, 3, 1]));
    expect(finishContext(bounds)).toEqual({ meshScale: 6, zMin: -1, zRange: 2 });
    expect(boundsOf([]).maxDim).toBe(0);
  });
});
