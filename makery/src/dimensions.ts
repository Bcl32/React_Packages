/**
 * @bcl32/makery/dimensions: a part's size, as numbers and as an overlay.
 *
 *   const dims = dimensionsOf(bounds, "z");            // { width, depth, height } in mm
 *   formatDimensions(dims);                            // "64.0 × 40.0 × 22.5 mm"
 *
 *   const overlay = buildDimensionOverlay(bounds, { up: "z", toCamera });
 *   scene.add(overlay.object);                         // millimetres
 *   overlay.object.visible = showing;
 *   ...
 *   overlay.object.removeFromParent(); overlay.dispose();
 *
 * The overlay is the bounding box drawn as thin edges, with one label per
 * axis giving that side's length. Ported from Print-Tracker's part viewer
 * (components/MeshViewer.jsx); what changed is that the up axis and the side
 * the camera is on are parameters, so the labels sit on the edges that face
 * the viewer in either app.
 *
 * Width is always the x extent, height the extent along the up axis and depth
 * the remaining one: what a visitor sees for the part as it is posed, which
 * is not necessarily how it lies on the print bed.
 *
 * Everything is in MILLIMETRES, like `/geometry`.
 */
import {
  BoxGeometry,
  CanvasTexture,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Sprite,
  SpriteMaterial,
  type ColorRepresentation,
  type Object3D,
} from "three";

export type UpAxis = "y" | "z";

/** An axis-aligned box: `min` and `max` as [x, y, z]. */
export interface BoxBounds {
  min: ArrayLike<number>;
  max: ArrayLike<number>;
}

export interface PartDimensions {
  /** Extent along x, mm. */
  width: number;
  /** Extent along the horizontal axis that is not x, mm. */
  depth: number;
  /** Extent along the up axis, mm. */
  height: number;
}

/** [x, the other ground axis, up] as indices into an xyz triple. */
const axesFor = (up: UpAxis): [number, number, number] => (up === "z" ? [0, 1, 2] : [0, 2, 1]);

export function dimensionsOf(bounds: BoxBounds, up: UpAxis = "z"): PartDimensions {
  const [g0, g1, u] = axesFor(up);
  const extent = (k: number) => Math.max(0, bounds.max[k] - bounds.min[k]);
  return { width: extent(g0), depth: extent(g1), height: extent(u) };
}

export interface FormatMmOptions {
  /** Decimal places. Default 1. */
  digits?: number;
  /** Write 42 instead of 42.0. Default false. */
  trimZeros?: boolean;
}

const number = (value: number, { digits = 1, trimZeros = false }: FormatMmOptions = {}): string => {
  const fixed = (Number.isFinite(value) ? value : 0).toFixed(digits);
  return trimZeros && fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
};

/** "42.0 mm" (or "42 mm" with trimZeros). */
export const formatMm = (value: number, options?: FormatMmOptions): string => `${number(value, options)} mm`;

/** "64.0 × 40.0 × 22.5 mm": width, depth, height. */
export const formatDimensions = (dims: PartDimensions, options?: FormatMmOptions): string =>
  `${number(dims.width, options)} × ${number(dims.depth, options)} × ${number(dims.height, options)} mm`;

// ---------------------------------------------------------------------------
// The overlay.
// ---------------------------------------------------------------------------

export interface AxisLabel {
  /** The label, to be positioned and scaled by the caller. */
  object: Object3D;
  /** Its width over its height. */
  aspect: number;
  dispose(): void;
}

/**
 * White text on a dark rounded plate, as a sprite that always faces the camera
 * and is drawn over the part. Needs a DOM (a 2D canvas): call it in the
 * browser, after mount.
 */
export function makeAxisLabel(text: string): AxisLabel {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2D canvas for the dimension label");
  const fontSize = 64;
  const font = `bold ${fontSize}px sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 28;
  const h = fontSize + 28;
  canvas.width = w;
  canvas.height = h;
  // Resizing a canvas resets its state.
  ctx.font = font;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 12);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 14, h / 2);

  const texture = new CanvasTexture(canvas);
  const material = new SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true });
  const sprite = new Sprite(material);
  sprite.renderOrder = 999;
  return {
    object: sprite,
    aspect: w / h,
    dispose: () => {
      texture.dispose();
      material.dispose();
    },
  };
}

export interface DimensionOverlayOptions {
  /** Which way is up. Default "z". */
  up?: UpAxis;
  /**
   * A vector from the part towards the camera's usual place, [x, y, z]. Only
   * the signs of its two ground components are used: labels go on the edges
   * that face it. Default: the +x, near side (Print-Tracker's part view).
   */
  toCamera?: ArrayLike<number>;
  /**
   * Where the height label goes: "near" on the upright edge closest to the
   * camera (it sits in front of the part), "side" on the upright edge at the
   * part's outline, on the side away from the depth label, so the three
   * labels sit on three separate edges. Default "near".
   */
  heightEdge?: "near" | "side";
  /** Text for one side's length. Default `formatMm`. */
  format?: (mm: number) => string;
  /** Builds one label. Default `makeAxisLabel`; a test passes a stub. */
  label?: (text: string) => AxisLabel;
  lineColour?: ColorRepresentation;
  lineOpacity?: number;
}

export interface DimensionOverlay {
  /** Add this to the scene (millimetres). Toggle `object.visible`. */
  object: Group;
  /** The box's edges, should the app want to recolour them. */
  lines: LineSegments<EdgesGeometry, LineBasicMaterial>;
  dimensions: PartDimensions;
  /** The label texts: width, depth, height. */
  texts: [string, string, string];
  /**
   * Points a camera must keep in frame for the labels to be readable: flat
   * xyz, in the same space as the bounds.
   */
  framingPoints: number[];
  dispose(): void;
}

/** The box and its three labels, for a part whose bounding box is `bounds`. */
export function buildDimensionOverlay(bounds: BoxBounds, options: DimensionOverlayOptions = {}): DimensionOverlay {
  const up = options.up ?? "z";
  const [g0, g1, u] = axesFor(up);
  const format = options.format ?? ((mm: number) => formatMm(mm));
  const makeLabel = options.label ?? makeAxisLabel;

  const size = [0, 1, 2].map((k) => Math.max(0, bounds.max[k] - bounds.min[k]));
  const centre = [0, 1, 2].map((k) => (bounds.min[k] + bounds.max[k]) / 2);
  const half = size.map((s) => s / 2);
  const maxDim = Math.max(size[0], size[1], size[2]) || 1;
  const dimensions = dimensionsOf(bounds, up);

  const object = new Group();
  object.name = "dimensions";
  object.position.set(centre[0], centre[1], centre[2]);
  const disposers: (() => void)[] = [];

  const box = new BoxGeometry(size[0], size[1], size[2]);
  const edges = new EdgesGeometry(box);
  box.dispose();
  const lineMaterial = new LineBasicMaterial({
    color: options.lineColour ?? 0xaaaaaa,
    transparent: true,
    opacity: options.lineOpacity ?? 0.6,
    depthTest: false,
  });
  const lines = new LineSegments<EdgesGeometry, LineBasicMaterial>(edges, lineMaterial);
  lines.renderOrder = 998;
  object.add(lines);
  disposers.push(() => {
    edges.dispose();
    lineMaterial.dispose();
  });

  // Offsets and label size follow the part's size, so labels read the same on
  // a 10 mm clip and a 300 mm tray.
  const offset = maxDim * 0.06;
  const labelHeight = maxDim * 0.16 * 0.6;
  // The camera's side on each ground axis. The default is +x and the near
  // (negative) side of the other axis.
  const s0 = (options.toCamera?.[g0] ?? 1) < 0 ? -1 : 1;
  const s1 = (options.toCamera?.[g1] ?? -1) < 0 ? -1 : 1;
  const side = options.heightEdge === "side";

  const at = (a: number, b: number, c: number): [number, number, number] => {
    const p: [number, number, number] = [0, 0, 0];
    p[g0] = a;
    p[g1] = b;
    p[u] = c;
    return p;
  };
  const texts: [string, string, string] = [format(dimensions.width), format(dimensions.depth), format(dimensions.height)];
  const positions = [
    // Width: the bottom edge on the camera's side.
    at(0, s1 * (half[g1] + offset), -half[u] - offset),
    // Depth: the bottom edge on the camera's other ground side.
    at(s0 * (half[g0] + offset), 0, -half[u] - offset),
    // Height: an upright edge.
    at((side ? -s0 : s0) * (half[g0] + offset), s1 * (half[g1] + offset), 0),
  ];

  const framingPoints: number[] = [];
  texts.forEach((text, i) => {
    const label = makeLabel(text);
    const width = labelHeight * label.aspect;
    label.object.position.set(positions[i][0], positions[i][1], positions[i][2]);
    label.object.scale.set(width, labelHeight, 1);
    object.add(label.object);
    disposers.push(label.dispose);
    // A label always faces the camera, so it can reach half its diagonal in
    // any direction from its anchor.
    const reach = Math.hypot(width, labelHeight) / 2;
    for (let k = 0; k < 3; k++) {
      for (const sign of [-1, 1]) {
        const p = [centre[0] + positions[i][0], centre[1] + positions[i][1], centre[2] + positions[i][2]];
        p[k] += sign * reach;
        framingPoints.push(p[0], p[1], p[2]);
      }
    }
  });

  return { object, lines, dimensions, texts, framingPoints, dispose: () => disposers.forEach((d) => d()) };
}
