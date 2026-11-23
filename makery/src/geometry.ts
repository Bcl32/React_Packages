/**
 * @bcl32/makery/geometry: millimetre positions for the finish shaders.
 *
 * The finish shaders (`/materials`) read each vertex's OBJECT-SPACE position
 * and assume it is in millimetres: marble's flecks are ~0.5 mm cells, sparkle's
 * cell size is clamped to a mm band, and the gradient, sheen and grain scale
 * with the part's size in mm. A mesh stored with KHR_mesh_quantization keeps
 * normalised int16 positions and puts the scale (and any offset) on the node,
 * so in the shader `position` is in -1..1, not mm: every finish would be drawn
 * at the wrong scale, and the sparkle and marble cells would be hundreds of
 * times too big.
 *
 * The fix used here is Print-Tracker's (workers/meshBuild.js fetchGlbMesh):
 * bake the node transform into plain Float32 positions (and normals) once,
 * when the mesh is loaded, then centre them on the bounding-box centre, as
 * Print-Tracker's viewers do. Then object space IS millimetres, the bounds the
 * material is given (meshScale, zMin, zRange) come from the same numbers, and
 * a part looks the same in both apps.
 *
 * Pure: plain typed arrays and numbers in, new typed arrays out. No three.js
 * import (a three BufferAttribute or InterleavedBufferAttribute can be passed
 * through `attributeView`), nothing mutated.
 */

/** Any typed array a glTF accessor can be read into. */
export type VertexArray =
  | Float32Array
  | Float64Array
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array;

/** A strided view of a vertex attribute. */
export interface AttributeView {
  /** The backing array (for an interleaved attribute, the whole buffer). */
  array: VertexArray | ArrayLike<number>;
  /** Vertices in the attribute. */
  count: number;
  /** Components per vertex (3 for a position). */
  itemSize: number;
  /** Elements from one vertex to the next (itemSize when not interleaved). */
  stride?: number;
  /** Element offset of the first component (0 when not interleaved). */
  offset?: number;
  /** The integer values stand for -1..1 (signed) or 0..1 (unsigned). */
  normalized?: boolean;
}

/**
 * Duck-typed view of a three.js BufferAttribute or InterleavedBufferAttribute,
 * without importing three.
 */
export function attributeView(attribute: {
  array?: ArrayLike<number>;
  count: number;
  itemSize: number;
  normalized?: boolean;
  offset?: number;
  isInterleavedBufferAttribute?: boolean;
  data?: { array: ArrayLike<number>; stride: number };
}): AttributeView {
  if (attribute.isInterleavedBufferAttribute && attribute.data) {
    return {
      array: attribute.data.array,
      count: attribute.count,
      itemSize: attribute.itemSize,
      stride: attribute.data.stride,
      offset: attribute.offset ?? 0,
      normalized: Boolean(attribute.normalized),
    };
  }
  return {
    array: attribute.array as ArrayLike<number>,
    count: attribute.count,
    itemSize: attribute.itemSize,
    stride: attribute.itemSize,
    offset: 0,
    normalized: Boolean(attribute.normalized),
  };
}

/** glTF / WebGL normalised-integer decoding (the same rule as three's denormalize). */
export function denormalise(value: number, array: AttributeView["array"]): number {
  if (array instanceof Int8Array) return Math.max(value / 127, -1);
  if (array instanceof Uint8Array || array instanceof Uint8ClampedArray) return value / 255;
  if (array instanceof Int16Array) return Math.max(value / 32767, -1);
  if (array instanceof Uint16Array) return value / 65535;
  if (array instanceof Int32Array) return Math.max(value / 2147483647, -1);
  if (array instanceof Uint32Array) return value / 4294967295;
  return value;
}

function component(view: AttributeView, vertex: number, c: number): number {
  const v = view.array[(view.offset ?? 0) + vertex * (view.stride ?? view.itemSize) + c];
  return view.normalized ? denormalise(v, view.array) : v;
}

/** A 4x4 matrix, column-major (three's Matrix4.elements, glTF's node.matrix). */
export type Matrix4Elements = ArrayLike<number>;

const IDENTITY: Matrix4Elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Positions as Float32 xyz, de-normalised and taken through `matrix` (the
 * mesh's world matrix, which carries the quantisation scale and offset).
 */
export function bakePositions(view: AttributeView, matrix: Matrix4Elements = IDENTITY): Float32Array {
  const e = matrix;
  const out = new Float32Array(view.count * 3);
  for (let i = 0; i < view.count; i++) {
    const x = component(view, i, 0);
    const y = component(view, i, 1);
    const z = component(view, i, 2);
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15] || 1);
    out[i * 3] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    out[i * 3 + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    out[i * 3 + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
  }
  return out;
}

/**
 * Normals as unit Float32 xyz, de-normalised and taken through the normal
 * matrix of `matrix` (the inverse transpose of its upper 3x3), so a
 * non-uniform scale still leaves them perpendicular to the surface.
 */
export function bakeNormals(view: AttributeView, matrix: Matrix4Elements = IDENTITY): Float32Array {
  const e = matrix;
  // Upper 3x3, column-major: a b c / d e f / g h i in rows.
  const a = e[0], b = e[4], c = e[8];
  const d = e[1], f = e[5], g = e[9];
  const h = e[2], k = e[6], l = e[10];
  const det = a * (f * l - g * k) - b * (d * l - g * h) + c * (d * k - f * h);
  const inv = det ? 1 / det : 0;
  // Normal matrix = (M^-1)^T, i.e. the cofactor matrix over the determinant.
  const n00 = (f * l - g * k) * inv, n01 = -(d * l - g * h) * inv, n02 = (d * k - f * h) * inv;
  const n10 = -(b * l - c * k) * inv, n11 = (a * l - c * h) * inv, n12 = -(a * k - b * h) * inv;
  const n20 = (b * g - c * f) * inv, n21 = -(a * g - c * d) * inv, n22 = (a * f - b * d) * inv;
  const out = new Float32Array(view.count * 3);
  for (let i = 0; i < view.count; i++) {
    const x = component(view, i, 0);
    const y = component(view, i, 1);
    const z = component(view, i, 2);
    let nx = n00 * x + n01 * y + n02 * z;
    let ny = n10 * x + n11 * y + n12 * z;
    let nz = n20 * x + n21 * y + n22 * z;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    out[i * 3] = nx;
    out[i * 3 + 1] = ny;
    out[i * 3 + 2] = nz;
  }
  return out;
}

/** Axis-aligned bounds of one or more flat xyz arrays. */
export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
  centre: [number, number, number];
  size: [number, number, number];
  /** The largest dimension (0 for no vertices). */
  maxDim: number;
}

export function boundsOf(positions: ArrayLike<number> | readonly ArrayLike<number>[]): Bounds {
  const lists = isList(positions) ? positions : [positions];
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of lists) {
    for (let i = 0; i + 2 < p.length; i += 3) {
      for (let c = 0; c < 3; c++) {
        const v = p[i + c];
        if (v < min[c]) min[c] = v;
        if (v > max[c]) max[c] = v;
      }
    }
  }
  if (min[0] === Infinity) return { min: [0, 0, 0], max: [0, 0, 0], centre: [0, 0, 0], size: [0, 0, 0], maxDim: 0 };
  const centre: [number, number, number] = [0, 1, 2].map((c) => (min[c] + max[c]) / 2) as [number, number, number];
  const size: [number, number, number] = [0, 1, 2].map((c) => max[c] - min[c]) as [number, number, number];
  return { min, max, centre, size, maxDim: Math.max(...size) };
}

function isList(p: ArrayLike<number> | readonly ArrayLike<number>[]): p is readonly ArrayLike<number>[] {
  return Array.isArray(p) && p.length > 0 && typeof p[0] === "object";
}

/** A copy of flat xyz positions moved by -offset (centring on a bounds centre). */
export function translated(positions: ArrayLike<number>, offset: readonly [number, number, number]): Float32Array {
  const out = new Float32Array(positions.length);
  for (let i = 0; i + 2 < positions.length; i += 3) {
    out[i] = positions[i] - offset[0];
    out[i + 1] = positions[i + 1] - offset[1];
    out[i + 2] = positions[i + 2] - offset[2];
  }
  return out;
}

/** The mesh numbers `buildFinishMaterial` bakes into the shader. */
export interface FinishContext {
  /** The largest bounding-box dimension (normalises the noise). */
  meshScale: number;
  /** Object-space Z minimum (gradients run up Z). */
  zMin: number;
  /** Object-space Z extent. */
  zRange: number;
}

/** Print-Tracker's MeshScene finishContext, from bounds. */
export function finishContext(bounds: Bounds): FinishContext {
  return { meshScale: bounds.maxDim, zMin: bounds.min[2], zRange: bounds.size[2] };
}

/** One mesh to bake: its attributes and world matrix. */
export interface MeshToBake {
  position: AttributeView;
  normal?: AttributeView | null;
  matrix?: Matrix4Elements;
}

export interface BakedMesh {
  /** Millimetres, centred on the bounds centre of ALL the meshes baked together. */
  position: Float32Array;
  normal: Float32Array | null;
}

export interface BakedMeshes {
  meshes: BakedMesh[];
  /** Bounds of the centred positions (centre ~0). */
  bounds: Bounds;
  /** Where the bounds centre was before centring (add it back to undo). */
  centre: [number, number, number];
  context: FinishContext;
}

/**
 * Bake several meshes that form one part (one per palette slot, say) into
 * centred millimetre floats, with one shared bounds and finish context.
 * Meshes that share one position view (the same object) are baked once and
 * share the output arrays.
 */
export function bakeMeshes(meshes: readonly MeshToBake[]): BakedMeshes {
  const cache = new Map<AttributeView, BakedMesh>();
  const raw = meshes.map((m) => {
    const hit = cache.get(m.position);
    if (hit) return hit;
    const baked: BakedMesh = {
      position: bakePositions(m.position, m.matrix),
      normal: m.normal ? bakeNormals(m.normal, m.matrix) : null,
    };
    cache.set(m.position, baked);
    return baked;
  });
  const unique = [...new Set(raw)];
  const before = boundsOf(unique.map((b) => b.position));
  const centre = before.centre;
  const moved = new Map<BakedMesh, BakedMesh>();
  for (const b of unique) moved.set(b, { position: translated(b.position, centre), normal: b.normal });
  const out = raw.map((b) => moved.get(b) as BakedMesh);
  const bounds = boundsOf([...moved.values()].map((b) => b.position));
  return { meshes: out, bounds, centre: [...centre] as [number, number, number], context: finishContext(bounds) };
}
