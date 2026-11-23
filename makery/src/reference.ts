/**
 * @bcl32/makery/reference: everyday objects at their real size, to stand
 * beside a part so its scale reads at a glance.
 *
 * Four are drawn here from simple shapes at their published dimensions (a
 * payment card, a toonie, a drinks can, a 30 cm ruler): no model file, no
 * download, nothing to license. One (the banana) is a model file the app
 * serves; the app passes its URL, and a plain box of the right length stands
 * in if the file is missing or fails to load.
 *
 *   const ref = await buildReference("toonie", { up: "z" });
 *   scene.add(ref.object);                       // millimetres
 *   placeReferenceBeside(ref, partBounds, { up: "z", direction: [-1, 0] });
 *   ...
 *   ref.object.removeFromParent(); ref.dispose();
 *
 * Everything is in MILLIMETRES, like `/geometry`: add the object where one
 * scene unit is one millimetre (or under a group that scales millimetres to
 * your scene, as the shop's unit-radius pose does).
 *
 * Ported from Print-Tracker (components/MeshReferenceObjects.js). What changed:
 * the scene's up axis is a parameter (Print-Tracker's part viewer is Y-up, the
 * shop's is Z-up), the object can stand on any side of the part, and the four
 * objects that had no model file are drawn properly instead of as plain boxes.
 */
import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Shape,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** Which scene axis points up. */
export type UpAxis = "y" | "z";

export type ReferenceKey = "toonie" | "card" | "can" | "banana" | "ruler";

export interface ReferenceSpec {
  key: ReferenceKey;
  /** A default name; an app with its own copy keys its wording by `key`. */
  label: string;
  /**
   * The object's real size as it rests on a table, in millimetres:
   * [its long side, its height off the table, its depth].
   */
  sizeMm: readonly [number, number, number];
  /**
   * Present when the object is a model file the app serves (pass `assetUrl`).
   * The loaded model is turned by `rotateYDeg`, then scaled so its extent
   * along `normaliseAxis` is `sizeMm[0]`, whatever unit it was authored in.
   */
  asset?: { normaliseAxis: "x" | "y" | "z"; rotateYDeg?: number };
  /** The colour of the plain box that stands in for a missing model file. */
  fallbackColour: string;
}

/**
 * The objects, with their published dimensions:
 *   toonie  Canadian $2 coin: 28 mm across, 1.75 mm thick, 16.8 mm core.
 *   card    ISO/IEC 7810 ID-1: 85.60 x 53.98 x 0.76 mm, 3.18 mm corners.
 *   can     355 mL drinks can: 122.2 mm tall, 66.2 mm across.
 *   banana  about 19 cm; the model file sets its other two dimensions.
 *   ruler   30 cm of scale on a 310 x 30 x 3 mm body.
 */
export const REFERENCE_OBJECTS: Readonly<Record<ReferenceKey, ReferenceSpec>> = Object.freeze({
  toonie: { key: "toonie", label: "Toonie ($2 coin)", sizeMm: [28, 1.75, 28], fallbackColour: "#b08a3e" },
  card: { key: "card", label: "Payment card", sizeMm: [85.6, 0.76, 53.98], fallbackColour: "#2563eb" },
  can: { key: "can", label: "Drinks can (355 mL)", sizeMm: [66.2, 122.2, 66.2], fallbackColour: "#cccccc" },
  banana: {
    key: "banana",
    label: "Banana (about 19 cm)",
    sizeMm: [190, 24, 48],
    // The bundled model is long along Z; turn it so its length runs along X.
    asset: { normaliseAxis: "x", rotateYDeg: 90 },
    fallbackColour: "#f5d442",
  },
  ruler: { key: "ruler", label: "Ruler (30 cm)", sizeMm: [310, 3, 30], fallbackColour: "#f5deb3" },
});

/** Smallest to largest: the order a menu lists them in. */
export const REFERENCE_ORDER: readonly ReferenceKey[] = Object.freeze(["toonie", "card", "can", "banana", "ruler"]);

export const isReferenceKey = (key: unknown): key is ReferenceKey =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(REFERENCE_OBJECTS, key);

// ---------------------------------------------------------------------------
// The drawn objects. Each is built Y-up, resting on y = 0, centred in x and z,
// its long side along x.
// ---------------------------------------------------------------------------

const plain = (colour: string, roughness = 0.6, metalness = 0.1) => new MeshStandardMaterial({ color: colour, roughness, metalness });

function buildToonie(): Object3D {
  const [across, thick] = REFERENCE_OBJECTS.toonie.sizeMm;
  const group = new Group();
  const ring = new Mesh(new CylinderGeometry(across / 2, across / 2, thick, 64), plain("#c4c8cc", 0.4, 0.3));
  ring.position.y = thick / 2;
  // The brass-coloured core stands a hair proud so it reads as a second metal.
  const coreHeight = thick + 0.05;
  const core = new Mesh(new CylinderGeometry(8.4, 8.4, coreHeight, 48), plain("#c9a348", 0.4, 0.3));
  core.position.y = coreHeight / 2;
  group.add(ring, core);
  return group;
}

function buildCard(): Object3D {
  const [w, thick, d] = REFERENCE_OBJECTS.card.sizeMm;
  const r = 3.18;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const outline = new Shape();
  outline.moveTo(x0 + r, y0);
  outline.lineTo(x0 + w - r, y0);
  outline.absarc(x0 + w - r, y0 + r, r, -Math.PI / 2, 0, false);
  outline.lineTo(x0 + w, y0 + d - r);
  outline.absarc(x0 + w - r, y0 + d - r, r, 0, Math.PI / 2, false);
  outline.lineTo(x0 + r, y0 + d);
  outline.absarc(x0 + r, y0 + d - r, r, Math.PI / 2, Math.PI, false);
  outline.lineTo(x0, y0 + r);
  outline.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  const body = new ExtrudeGeometry(outline, { depth: thick, bevelEnabled: false, curveSegments: 6 });
  // The outline is drawn in XY and extruded along Z; lay it flat (Z becomes up).
  body.rotateX(-Math.PI / 2);
  const group = new Group();
  group.add(new Mesh(body, plain("#2563eb", 0.55, 0.05)));
  // A contact pad, so it reads as a card and not a blue tile. No marks, no text.
  const pad = new Mesh(new BoxGeometry(11, 0.1, 9), plain("#d4af37", 0.4, 0.3));
  pad.position.set(-w / 2 + 16, thick + 0.05, -2);
  group.add(pad);
  return group;
}

function buildCan(): Object3D {
  const [across, tall] = REFERENCE_OBJECTS.can.sizeMm;
  const r = across / 2;
  // The profile from the centre of the base, up the wall, in over the shoulder
  // to the rim, and back to the centre of the lid.
  const profile = [
    [0, 0],
    [23, 0],
    [25.5, 2.5],
    [r, 12],
    [r, 104],
    [27.5, 119.5],
    [27.5, tall],
    [0, tall],
  ].map(([x, y]) => new Vector2(x, y));
  const group = new Group();
  group.add(new Mesh(new LatheGeometry(profile, 48), plain("#c9cdd1", 0.4, 0.3)));
  // A plain printed band. No brand.
  const band = new Mesh(new CylinderGeometry(r + 0.15, r + 0.15, 86, 48, 1, true), plain("#e76f51", 0.5, 0.1));
  band.position.y = 14 + 43;
  group.add(band);
  return group;
}

function buildRuler(): Object3D {
  const [length, thick, width] = REFERENCE_OBJECTS.ruler.sizeMm;
  const group = new Group();
  const body = new Mesh(new BoxGeometry(length, thick, width), plain("#e8d5a8", 0.7, 0));
  body.position.y = thick / 2;
  group.add(body);
  // A mark at every centimetre from 0 to 30, longer at 5 and longest at 10.
  const MARKS = 31;
  const marks = new InstancedMesh(new BoxGeometry(1, 1, 1), plain("#3a2f20", 0.8, 0), MARKS);
  const matrix = new Matrix4();
  for (let i = 0; i < MARKS; i++) {
    const long = i % 10 === 0 ? 12 : i % 5 === 0 ? 9 : 6;
    matrix.makeScale(0.6, 0.1, long);
    matrix.setPosition(-150 + i * 10, thick + 0.05, -width / 2 + long / 2);
    marks.setMatrixAt(i, matrix);
  }
  marks.instanceMatrix.needsUpdate = true;
  group.add(marks);
  return group;
}

const DRAWN: Partial<Record<ReferenceKey, () => Object3D>> = {
  toonie: buildToonie,
  card: buildCard,
  can: buildCan,
  ruler: buildRuler,
};

/** A box of the object's size: "right size, wrong shape". */
function buildFallback(spec: ReferenceSpec): Object3D {
  const [x, y, z] = spec.sizeMm;
  const box = new Mesh(new BoxGeometry(x, y, z), plain(spec.fallbackColour));
  box.position.y = y / 2;
  const group = new Group();
  group.add(box);
  return group;
}

// ---------------------------------------------------------------------------
// Model files.
// ---------------------------------------------------------------------------

/** Parsed scenes by URL. Each build deep-clones from here. */
const parsedCache = new Map<string, Promise<Object3D>>();

const materialsOf = (mesh: Mesh): Material[] => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean);

/**
 * A model whose texture did not arrive (it points at a separate image file
 * that was not supplied) would be drawn white: give it the spec's flat colour.
 * A properly embedded texture is left alone.
 */
function tintIfUntextured(root: Object3D, colour: string): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    for (const material of materialsOf(mesh) as MeshStandardMaterial[]) {
      const image = material.map?.image as { width?: number; videoWidth?: number } | undefined;
      if (image && (image.width || image.videoWidth)) continue;
      material.map = null;
      material.color?.set(colour);
    }
  });
}

function loadModel(url: string, colour: string): Promise<Object3D> {
  let parsed = parsedCache.get(url);
  if (!parsed) {
    parsed = new GLTFLoader().loadAsync(url).then((gltf) => {
      tintIfUntextured(gltf.scene, colour);
      return gltf.scene as Object3D;
    });
    parsedCache.set(url, parsed);
    // A failed load is not remembered: the next build tries again.
    parsed.catch(() => parsedCache.delete(url));
  }
  return parsed;
}

/**
 * three's clone(true) shares geometries and materials with the source; give
 * the copy its own so disposing one instance cannot break another. Textures
 * stay shared with the cache (a few small images, kept for the session).
 */
function deepClone(source: Object3D): Object3D {
  const copy = source.clone(true);
  copy.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry = mesh.geometry.clone();
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
  });
  return copy;
}

/**
 * Wrap a model so its extent along `axis` is `target` mm, it is centred in x
 * and z, and it rests on y = 0.
 */
function normaliseToSize(inner: Object3D, axis: "x" | "y" | "z", target: number): Object3D {
  const wrapper = new Group();
  wrapper.add(inner);
  inner.updateMatrixWorld(true);
  const size = new Box3().setFromObject(inner).getSize(new Vector3());
  wrapper.scale.setScalar(target / Math.max(size[axis] || 0, 1e-6));
  wrapper.updateMatrixWorld(true);
  const box = new Box3().setFromObject(wrapper);
  const centre = box.getCenter(new Vector3());
  wrapper.position.set(-centre.x, -box.min.y, -centre.z);
  const outer = new Group();
  outer.add(wrapper);
  return outer;
}

function disposeTree(root: Object3D): void {
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    for (const material of materialsOf(mesh)) material.dispose();
    (mesh as unknown as InstancedMesh).dispose?.();
  });
}

// ---------------------------------------------------------------------------
// Public entry points.
// ---------------------------------------------------------------------------

export interface BuildReferenceOptions {
  /** Which way is up in the scene the object joins. Default "y". */
  up?: UpAxis;
  /** Where the app serves this object's model file (the banana). */
  assetUrl?: string | null;
  /** Told when a model file could not be loaded and the plain box is used. */
  onAssetError?: (key: ReferenceKey, error: unknown) => void;
}

export interface BuiltReference {
  key: ReferenceKey;
  /**
   * Add this to the scene (millimetres). It rests on the ground plane through
   * its origin, centred on it, its long side along x; `placeReferenceBeside`
   * moves and turns it.
   */
  object: Group;
  /** Its size along the scene's x, y and z, in millimetres. */
  size: [number, number, number];
  /** True when the plain box stands in for a model file. */
  fallback: boolean;
  /** Frees the geometries and materials the object owns. */
  dispose(): void;
}

export async function buildReference(key: ReferenceKey, options: BuildReferenceOptions = {}): Promise<BuiltReference> {
  const spec = REFERENCE_OBJECTS[key];
  if (!spec) throw new Error(`unknown reference object "${String(key)}"`);
  const up = options.up ?? "y";

  let inner: Object3D | null = null;
  let fallback = false;
  const draw = DRAWN[key];
  if (draw) inner = draw();
  else if (spec.asset && options.assetUrl) {
    try {
      const model = deepClone(await loadModel(options.assetUrl, spec.fallbackColour));
      if (spec.asset.rotateYDeg) model.rotation.y = MathUtils.degToRad(spec.asset.rotateYDeg);
      inner = normaliseToSize(model, spec.asset.normaliseAxis, spec.sizeMm[0]);
    } catch (error) {
      options.onAssetError?.(key, error);
    }
  }
  if (!inner) {
    inner = buildFallback(spec);
    fallback = true;
  }

  inner.updateMatrixWorld(true);
  const measured = new Box3().setFromObject(inner).getSize(new Vector3());
  const object = new Group();
  object.name = `reference:${key}`;
  if (up === "z") {
    // Y-up to Z-up: the object's height becomes z, its depth runs along y.
    const turned = new Group();
    turned.rotation.x = Math.PI / 2;
    turned.add(inner);
    object.add(turned);
  } else {
    object.add(inner);
  }
  const size: [number, number, number] = up === "z" ? [measured.x, measured.z, measured.y] : [measured.x, measured.y, measured.z];
  return { key, object, size, fallback, dispose: () => disposeTree(object) };
}

/** An axis-aligned box: `min` and `max` as [x, y, z]. */
export interface BoxBounds {
  min: ArrayLike<number>;
  max: ArrayLike<number>;
}

export interface PlaceReferenceOptions {
  /** Which way is up. Default "y". Must match the `up` the object was built with. */
  up?: UpAxis;
  /**
   * Which side of the part, as a direction on the ground: [x, z] when up is
   * "y", [x, y] when up is "z". Default [1, 0], the +X side. The object's long
   * side is turned to run along it.
   */
  direction?: readonly [number, number];
  /** The gap between part and object. Default: a tenth of the part's extent that way, at least 5 mm. */
  gapMm?: number;
}

export interface ReferencePlacement {
  /** Where the object's origin was put. */
  position: [number, number, number];
  /** The eight corners of the box it now occupies, flat xyz, for framing a camera. */
  corners: number[];
}

/**
 * Stand a built reference beside the part: on the part's floor, clear of its
 * bounding box by a small gap, long side running away from it.
 */
export function placeReferenceBeside(
  reference: Pick<BuiltReference, "object" | "size">,
  part: BoxBounds,
  options: PlaceReferenceOptions = {},
): ReferencePlacement {
  const up = options.up ?? "y";
  const [g0, g1, u] = up === "z" ? [0, 1, 2] : [0, 2, 1];
  const [rawX, rawY] = options.direction ?? [1, 0];
  const length = Math.hypot(rawX, rawY) || 1;
  const d0 = rawX / length;
  const d1 = rawY / length;

  const centre = [0, 1, 2].map((k) => (part.min[k] + part.max[k]) / 2);
  const half = [0, 1, 2].map((k) => (part.max[k] - part.min[k]) / 2);
  const reach = Math.abs(d0) * half[g0] + Math.abs(d1) * half[g1];
  const gap = options.gapMm ?? Math.max(reach * 0.2, 5);
  const long = reference.size[g0];
  const across = reference.size[g1];
  const tall = reference.size[u];
  const distance = reach + gap + long / 2;

  const position: [number, number, number] = [0, 0, 0];
  position[g0] = centre[g0] + d0 * distance;
  position[g1] = centre[g1] + d1 * distance;
  position[u] = part.min[u];
  reference.object.position.set(position[0], position[1], position[2]);
  reference.object.rotation.set(0, 0, 0);
  // Turn local +x onto the direction, about the up axis.
  if (up === "z") reference.object.rotation.z = Math.atan2(d1, d0);
  else reference.object.rotation.y = Math.atan2(-d1, d0);
  reference.object.updateMatrixWorld(true);

  const corners: number[] = [];
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      for (const h of [0, tall]) {
        const p = [0, 0, 0];
        p[g0] = position[g0] + (a * d0 * long) / 2 - (b * d1 * across) / 2;
        p[g1] = position[g1] + (a * d1 * long) / 2 + (b * d0 * across) / 2;
        p[u] = position[u] + h;
        corners.push(p[0], p[1], p[2]);
      }
    }
  }
  return { position, corners };
}
