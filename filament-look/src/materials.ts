/**
 * @bcl32/filament-look/materials: finish-aware three.js materials.
 *
 * The WebGL counterpart of the swatch (`/swatch`). Each finish (silk, sparkle,
 * galaxy, ...) maps to a tuned MeshPhysicalMaterial plus, where the look needs
 * it, GLSL injected through onBeforeCompile:
 *   - diffuse-stage code (gradient / veins / grain / nebula) runs right after
 *     `vec4 diffuseColor = ...` so lighting applies on top;
 *   - light-stage code (silk sheen, glitter glints) adds to `outgoingLight`
 *     just before `#include <opaque_fragment>`.
 * Everything mesh-specific (scale, Z extent, palette colours) is baked into
 * the shader source as constants, so identical bakes share a program via
 * customProgramCacheKey and there is no cross-material uniform sharing. The
 * single real uniform, uFinishTime, drives the ambient motion and is owned per
 * material through userData so a viewer's frame loop can advance it
 * (updateFinishTime). Nothing moves unless a caller advances it.
 *
 * POSITIONS MUST BE MILLIMETRES, centred on the part. The shaders read
 * object-space `position`; a quantised mesh (KHR_mesh_quantization) must be
 * baked first: see `/geometry` (bakeMeshes).
 *
 * Ported from Print-Tracker (print-tracker-react/src/utils/filamentMaterials.js),
 * numbers and GLSL unchanged. `three` is a peer dependency on the 0.172 line:
 * the injection anchors (SHADER_ANCHORS) are three's own shader text, and the
 * package's tests check they still exist in the installed three.
 */
import {
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  PMREMGenerator,
  type Material,
  type Side,
  type Texture,
  type WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import type { Finish, FinishDescriptor } from "./finishes";

export { hasFinishData } from "./finishes";

// ---------------------------------------------------------------------------
// Material parameter table + GLSL snippets
// ---------------------------------------------------------------------------

/** Physical-material surface parameters for one finish. */
export interface FinishParams {
  roughness: number;
  metalness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  /** envMapIntensity once applyFinishEnvMap attaches the studio environment. */
  envInt: number;
}

// `envInt` is the envMapIntensity once applyFinishEnvMap attaches the shared
// studio environment (reflective finishes are flat without one).
export const FINISH_PARAMS: Readonly<Record<Finish, Readonly<FinishParams>>> = Object.freeze({
  basic: { roughness: 0.4, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.25, envInt: 0.45 },
  matte: { roughness: 0.95, metalness: 0.0, envInt: 0.12 },
  silk: { roughness: 0.25, metalness: 0.85, envInt: 1.1 },
  "silk-multi": { roughness: 0.25, metalness: 0.85, envInt: 1.1 },
  sparkle: { roughness: 0.5, metalness: 0.25, envInt: 0.5 },
  metal: { roughness: 0.32, metalness: 1.0, envInt: 1.0 },
  galaxy: { roughness: 0.45, metalness: 0.3, envInt: 0.7 },
  glow: { roughness: 0.55, metalness: 0.0, envInt: 0.2 },
  translucent: { roughness: 0.15, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.15, envInt: 0.9 },
  marble: { roughness: 0.75, metalness: 0.0, envInt: 0.25 },
  wood: { roughness: 0.85, metalness: 0.0, envInt: 0.1 },
});

/** Glow's emissive intensity and its pulse (driven by updateFinishTime). */
export const GLOW_EMISSIVE = Object.freeze({ base: 0.45, amplitude: 0.25 });

/** Translucent's opacity when the colour itself carries no alpha. */
export const TRANSLUCENT_OPACITY = 0.55;

// Finishes whose shader responds to uFinishTime (glow pulses on the JS side).
// Sparkle is deliberately absent: its glitter flashes with view angle only, so
// a still camera needs no frames.
export const ANIMATED_FINISHES: ReadonlySet<Finish> = new Set<Finish>(["silk", "silk-multi", "galaxy"]);

/**
 * The three shader lines the finish GLSL is injected at. If three's physical
 * shader stops containing one of them, String.replace silently does nothing
 * and the finish vanishes, so the package's tests check them against the
 * installed three (ShaderLib.physical).
 */
export const SHADER_ANCHORS = Object.freeze({
  /** Vertex: the object-space position varying is written after this. */
  vertex: "#include <begin_vertex>",
  /** Fragment, diffuse stage: colour code runs after this line. */
  diffuse: "vec4 diffuseColor = vec4( diffuse, opacity );",
  /** Fragment, light stage: sheen and glints are added before this. */
  light: "#include <opaque_fragment>",
});

// Shared hash/value-noise helpers. Prefixed to avoid clashing with three's
// own chunk symbols.
const NOISE_GLSL = `
float finishHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 finishHash3(vec3 p) {
  return vec3(finishHash(p), finishHash(p + 19.19), finishHash(p + 37.7));
}
float finishNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(finishHash(i), finishHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(finishHash(i + vec3(0.0, 1.0, 0.0)), finishHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(finishHash(i + vec3(0.0, 0.0, 1.0)), finishHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(finishHash(i + vec3(0.0, 1.0, 1.0)), finishHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float finishFbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * finishNoise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

const f6 = (x: number) => Number(x).toFixed(6);
const vec3 = (c: Color) => `vec3(${f6(c.r)}, ${f6(c.g)}, ${f6(c.b)})`;

// Multi-stop gradient as a baked if-ladder mix (2–4 stops in practice).
function gradientGlsl(colours: readonly string[]): string {
  const stops = colours.map((hex) => new Color(hex));
  const n = stops.length;
  let code = `  float seg = gt * ${f6(n - 1)};\n  vec3 gradCol = ${vec3(stops[0])};\n`;
  for (let i = 0; i < n - 1; i++) {
    code += `  gradCol = mix(gradCol, ${vec3(stops[i + 1])}, clamp(seg - ${f6(i)}, 0.0, 1.0));\n`;
  }
  return code;
}

interface SparkleLayer {
  scale: number;
  phase: number;
  gate: number;
  rMin: number;
  rVar: number;
  spread: number;
  lo: number;
  hi: number;
  strength: number;
}

// Glitter glints: round flecks that flare as the view direction sweeps past
// them — the 3D analogue of the swatch's feTurbulence speck fields.
//
// Each layer is a cell lattice, and within a cell the fleck is a *sphere* at a
// jittered centre — so the surface slices it into a round disc whose radius
// varies with slice depth, giving free size variation on top of the per-cell
// random radius. Two incommensurate layers break up the lattice regularity:
// fine dust plus rarer larger flakes.
//
// Cell size is 1/scale mm. Callers size it from the mesh (see sparkleCellMm)
// rather than fixing it in absolute mm the way marble's mineral specks do: the
// camera frames the whole part, so a fixed 0.3mm fleck is sub-pixel on a 300mm
// part and reads as shimmering noise instead of glitter.
//
// `gate` is the r.x threshold above which a cell carries a fleck; `rMin`/`rVar`
// are cell-relative radii and must stay under 0.225 so a fleck never crosses
// its own cell wall (the centre jitter is ±0.275) — otherwise it clips flat
// against the boundary and we are back to straight edges. `twinkle` is the
// uFinishTime amplitude (0 = view-angle only).
function sparkleLayerGlsl({
  scale,
  phase,
  gate,
  rMin,
  rVar,
  spread,
  lo,
  hi,
  strength,
  tintCode,
  twinkle,
}: SparkleLayer & { tintCode: string; twinkle: number }): string {
  const timeCode = twinkle
    ? `float sparkTwinkle = ${f6(1 - twinkle)} + ${f6(twinkle)} * sin(uFinishTime * 3.1 + sparkRnd.y * 6.2831);`
    : "float sparkTwinkle = 1.0;";
  return `
  {
    vec3 sparkP = vFinishPos * ${f6(scale)} + ${f6(phase)};
    vec3 sparkCell = floor(sparkP);
    vec3 sparkRnd = finishHash3(sparkCell);
    // Facet orientation from a second, decorrelated hash so a fleck's angle is
    // independent of whether it exists and how big it is.
    vec3 sparkFacet = finishHash3(sparkCell + 5.3);
    vec3 sparkOff = fract(sparkP) - 0.5 - (sparkRnd - 0.5) * 0.55;
    float sparkRad = ${f6(rMin)} + ${f6(rVar)} * sparkRnd.y;
    // Flat core with a soft rim: the fleck reads as a solid round dot, and the
    // rim is just enough anti-aliasing to keep it from crawling.
    float sparkDisc = step(${f6(gate)}, sparkRnd.x)
      * (1.0 - smoothstep(sparkRad * 0.78, sparkRad, length(sparkOff)));
    vec3 sparkDir = normalize(vViewPosition);
    vec3 sparkNormal = normalize(normalize(normal) + (sparkFacet * 2.0 - 1.0) * ${f6(spread)});
    // Thresholded rather than pow()-falloff: a facet is either catching the
    // light or it isn't, which is what makes a field of flecks read as glitter
    // instead of a soft specular haze. A tight pow() exponent would leave
    // almost every fleck dark on surfaces angled away from the camera.
    float sparkGlint = smoothstep(${f6(lo)}, ${f6(hi)}, max(dot(sparkDir, sparkNormal), 0.0));
    ${timeCode}
    ${tintCode}
    outgoingLight += sparkTint * sparkGlint * sparkDisc * sparkTwinkle
      * ${f6(strength)} * (0.6 + 0.8 * sparkFacet.z);
  }
`;
}

/** A whole glitter field: several sparkleLayerGlsl layers sharing tint/twinkle. */
function sparkleGlsl({ layers, tintCode, twinkle = 0 }: { layers: SparkleLayer[]; tintCode: string; twinkle?: number }): string {
  return layers.map((l) => sparkleLayerGlsl({ ...l, tintCode, twinkle })).join("");
}

/**
 * Fleck cell size in mm: `across` cells over the mesh's largest dimension, so
 * apparent glitter density holds steady whatever the part's size, then clamped
 * to a physically sane mm band so a tiny part doesn't get boulders and a huge
 * one doesn't get invisible dust.
 */
export function sparkleCellMm(meshScale: number, across: number, minMm: number, maxMm: number): number {
  return Math.min(Math.max(meshScale / across, minMm), maxMm);
}

// ---------------------------------------------------------------------------
// Material factory
// ---------------------------------------------------------------------------

export interface BuildFinishMaterialOptions {
  /** Base colour "#RRGGBB" (an alpha byte is ignored; pass opacity). */
  hex?: string | null;
  /** { finish, colours } from finishDescriptor (null -> basic). */
  descriptor?: Pick<FinishDescriptor, "finish"> & { colours?: readonly (string | null | undefined)[] | null } | null;
  /** Largest bounding-box dimension in mm (normalises the noise). */
  meshScale?: number;
  /** Object-space Z minimum in mm (gradients). */
  zMin?: number;
  /** Object-space Z extent in mm. */
  zRange?: number;
  /** Translucency, e.g. from meshOpacity (undefined = opaque, Translucent 0.55). */
  opacity?: number;
  side?: Side;
  /**
   * Extra diffuse-stage GLSL run before the finish's own colour code
   * (Print-Tracker's layer-mode height-step colours). It may read vFinishPos.
   */
  colourInjection?: string;
}

/** What buildFinishMaterial leaves on material.userData. */
export interface FinishUserData {
  finish: Finish;
  finishWantsEnv: boolean;
  finishTime: { value: number };
  finishAnimated: boolean;
  glowPulse?: { base: number; amplitude: number };
}

/**
 * The GLSL a finish injects, before it is spliced into three's shader:
 * `header` goes in front of the fragment shader (defines, uniform, varying,
 * noise), `diffuse` after SHADER_ANCHORS.diffuse, `light` before
 * SHADER_ANCHORS.light. Empty strings when the finish needs no shader.
 */
export interface FinishGlsl {
  effectiveFinish: Finish;
  header: string;
  diffuse: string;
  light: string;
  cacheKey: string;
}

function finishGlsl(
  effectiveFinish: Finish,
  base: Color,
  gradColours: readonly string[] | null,
  { meshScale, zMin, zRange, colourInjection = "" }: Pick<BuildFinishMaterialOptions, "meshScale" | "zMin" | "zRange" | "colourInjection">,
): FinishGlsl {
  const scale = Math.max(meshScale || 1, 1e-6);
  const zr = Math.max(zRange || 0, 1e-6);
  const consts =
    `#define FINISH_SCALE ${f6(scale)}\n` +
    `#define FINISH_ZMIN ${f6(zMin || 0)}\n` +
    `#define FINISH_ZRANGE ${f6(zr)}\n`;

  let diffuseCode = colourInjection ? `${colourInjection}\n` : "";
  let lightCode = "";

  if (gradColours) {
    // Diagonal multi-colour gradient over the object, sliding slowly when
    // ambient motion is on (uFinishTime is 0 otherwise).
    diffuseCode += `
  {
    float gt = clamp((vFinishPos.z - FINISH_ZMIN) / FINISH_ZRANGE
      + 0.2 * (vFinishPos.x / FINISH_SCALE)
      + 0.12 * sin(uFinishTime * 0.5), 0.0, 1.0);
${gradientGlsl(gradColours)}
    diffuseColor.rgb *= gradCol;
  }
`;
  }

  if (effectiveFinish === "silk" || effectiveFinish === "silk-multi") {
    // Satin sheen: fresnel-weighted bands that sweep with uFinishTime —
    // the 3D cousin of the swatch's 115° sheen gradient + backdrop drift.
    const sheenTint = base.clone().lerp(new Color(0xffffff), 0.65);
    lightCode += `
  {
    vec3 silkDir = normalize(vViewPosition);
    float silkFres = pow(1.0 - abs(dot(silkDir, normalize(normal))), 2.5);
    float silkBand = 0.5 + 0.5 * sin(
      (vFinishPos.x + vFinishPos.y + 2.0 * vFinishPos.z) / FINISH_SCALE * 9.0
      + uFinishTime * 0.6);
    outgoingLight += ${vec3(sheenTint)} * silkFres * (0.12 + 0.28 * silkBand);
  }
`;
  }

  if (effectiveFinish === "sparkle") {
    // Two fine dust layers at different lattice scales — the second exists only
    // to break up the first's grid, so its cell-relative radius is scaled down
    // by the same ratio as its cell size to land on the same absolute fleck
    // size. Deliberately no coarse layer: uniformly small specks, no big spots.
    // No uFinishTime term either — the specks flash with view angle only, so a
    // still camera means a still surface.
    lightCode += sparkleGlsl({
      layers: [
        {
          scale: 1 / sparkleCellMm(scale, 68, 0.4, 2.0),
          phase: 0, gate: 0.32, rMin: 0.16, rVar: 0.03,
          spread: 1.45, lo: 0.62, hi: 0.9, strength: 1.7,
        },
        {
          scale: 1 / sparkleCellMm(scale, 50, 0.55, 2.7),
          phase: 17, gate: 0.45, rMin: 0.115, rVar: 0.022,
          spread: 1.35, lo: 0.64, hi: 0.91, strength: 1.8,
        },
      ],
      tintCode: "vec3 sparkTint = vec3(1.0);",
    });
  }

  if (effectiveFinish === "galaxy") {
    // Nebula patches first (diffuse), then dense colour-shifted glitter.
    diffuseCode += `
  {
    vec3 nebP = vFinishPos / FINISH_SCALE;
    float neb1 = finishFbm(nebP * 2.1);
    float neb2 = finishFbm(nebP * 3.3 + 11.7);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.25, 0.65), 0.4 * smoothstep(0.55, 0.8, neb1));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.2, 0.4, 0.7), 0.35 * smoothstep(0.6, 0.85, neb2));
  }
`;
    // Denser and brighter than sparkle, and it keeps the ambient twinkle.
    lightCode += sparkleGlsl({
      layers: [
        {
          scale: 1 / sparkleCellMm(scale, 70, 0.4, 2.0),
          phase: 0, gate: 0.28, rMin: 0.13, rVar: 0.09,
          spread: 1.5, lo: 0.58, hi: 0.88, strength: 1.8,
        },
        {
          scale: 1 / sparkleCellMm(scale, 26, 1.2, 6.0),
          phase: 23, gate: 0.82, rMin: 0.15, rVar: 0.07,
          spread: 1.35, lo: 0.62, hi: 0.9, strength: 2.6,
        },
      ],
      twinkle: 0.25,
      tintCode:
        "vec3 sparkTint = mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 0.6, 0.9), sparkRnd.z);",
    });
  }

  if (effectiveFinish === "metal") {
    // Faint anisotropic streaking along X — the brushed-metal texture.
    diffuseCode += `
  {
    vec3 mp = vFinishPos / FINISH_SCALE;
    float streak = finishNoise(vec3(mp.x * 3.0, mp.y * 80.0, mp.z * 80.0));
    diffuseColor.rgb *= 0.93 + 0.14 * streak;
  }
`;
  }

  if (effectiveFinish === "marble") {
    // Real marble filament isn't veined — it's a matte base with fine mineral
    // particles mixed in (see the Bambu PLA Marble product shots: a dense dust
    // of tiny dark flecks plus occasional slightly larger bits). Two
    // incommensurate cell fields at absolute mm scale reproduce that: cells
    // are ~0.5mm and ~1.3mm regardless of part size, like the real particles.
    // Fleck colour derives from the base: dark specks on light stone, light
    // specks on dark stone.
    const lum = base.r * 0.299 + base.g * 0.587 + base.b * 0.114;
    const speckColour = lum > 0.4
      ? base.clone().multiplyScalar(0.28)
      : base.clone().lerp(new Color(0xffffff), 0.7);
    diffuseCode += `
  {
    // Hard-edged flecks: distance to a jittered per-cell centre, with a
    // random subset stretched into ellipses (elongation along a random
    // per-cell axis). The smoothstep band is kept to a whisker — just enough
    // anti-aliasing — so specks read as crisp embedded bits, not blurry blobs.
    // Dense micro-dust (~0.5mm cells).
    vec3 sp1 = vFinishPos * 2.0;
    vec3 sr1 = finishHash3(floor(sp1));
    vec3 so1 = fract(sp1) - 0.5 - (sr1 - 0.5) * 0.5;
    vec3 sa1 = normalize(sr1 - 0.5 + vec3(0.013));
    float sel1 = 1.0 + 2.2 * step(0.55, sr1.z);
    float spar1 = dot(so1, sa1);
    float sd1 = sqrt(dot(so1, so1) - spar1 * spar1 + (spar1 / sel1) * (spar1 / sel1));
    float ssz1 = 0.09 + 0.09 * sr1.y;
    float sf1 = step(0.6, sr1.x) * (1.0 - smoothstep(ssz1 * 0.85, ssz1, sd1));
    // Sparser, slightly larger bits (~1.3mm cells).
    vec3 sp2 = vFinishPos * 0.75 + 31.0;
    vec3 sr2 = finishHash3(floor(sp2));
    vec3 so2 = fract(sp2) - 0.5 - (sr2 - 0.5) * 0.5;
    vec3 sa2 = normalize(sr2 - 0.5 + vec3(0.017));
    float sel2 = 1.0 + 1.8 * step(0.5, sr2.z);
    float spar2 = dot(so2, sa2);
    float sd2 = sqrt(dot(so2, so2) - spar2 * spar2 + (spar2 / sel2) * (spar2 / sel2));
    float ssz2 = 0.12 + 0.1 * sr2.y;
    float sf2 = step(0.88, sr2.x) * (1.0 - smoothstep(ssz2 * 0.85, ssz2, sd2));
    float speck = clamp(sf1 * (0.55 + 0.45 * sr1.y) + sf2 * (0.6 + 0.4 * sr2.y), 0.0, 1.0);
    diffuseColor.rgb = mix(diffuseColor.rgb, ${vec3(speckColour)}, speck);
  }
`;
  }

  if (effectiveFinish === "wood") {
    // Growth rings (warped sine along X) over fine fibre noise.
    diffuseCode += `
  {
    vec3 wp = vFinishPos / FINISH_SCALE;
    float rings = sin((wp.x + 2.5 * finishFbm(wp * 6.0)) * 40.0);
    float fibre = finishNoise(vec3(wp.x * 6.0, wp.y * 120.0, wp.z * 120.0));
    diffuseColor.rgb *= mix(0.85, 1.08, smoothstep(-0.6, 0.6, rings));
    diffuseColor.rgb *= 0.95 + 0.1 * fibre;
  }
`;
  }

  const needsShader = Boolean(diffuseCode || lightCode);
  return {
    effectiveFinish,
    header: needsShader ? `${consts}uniform float uFinishTime;\nvarying vec3 vFinishPos;\n${NOISE_GLSL}\n` : "",
    diffuse: diffuseCode,
    light: lightCode,
    // Value-based key — everything varying between materials is baked into
    // the source, so identical bakes may safely share a program.
    cacheKey: needsShader ? `finish|${effectiveFinish}|${consts}|${diffuseCode}|${lightCode}` : "",
  };
}

/**
 * Splice a finish's GLSL into three's (unexpanded) shader sources, as
 * onBeforeCompile does. Exported for tests and for anyone checking a shader.
 * `missing` lists the anchors that were needed but not found (the finish would
 * be silently incomplete): empty when all is well.
 */
export function injectFinishGlsl(
  glsl: FinishGlsl,
  shader: { vertexShader: string; fragmentShader: string },
): { vertexShader: string; fragmentShader: string; missing: (keyof typeof SHADER_ANCHORS)[] } {
  const missing: (keyof typeof SHADER_ANCHORS)[] = [];
  if (!glsl.header) return { ...shader, missing };
  const need = (key: keyof typeof SHADER_ANCHORS, source: string) => {
    if (!source.includes(SHADER_ANCHORS[key])) missing.push(key);
  };
  need("vertex", shader.vertexShader);
  const vertexShader =
    "varying vec3 vFinishPos;\n" +
    shader.vertexShader.replace(SHADER_ANCHORS.vertex, `${SHADER_ANCHORS.vertex}\n  vFinishPos = position;`);
  let frag = glsl.header + shader.fragmentShader;
  if (glsl.diffuse) {
    need("diffuse", shader.fragmentShader);
    frag = frag.replace(SHADER_ANCHORS.diffuse, `${SHADER_ANCHORS.diffuse}\n${glsl.diffuse}`);
  }
  if (glsl.light) {
    need("light", shader.fragmentShader);
    frag = frag.replace(SHADER_ANCHORS.light, `${glsl.light}\n${SHADER_ANCHORS.light}`);
  }
  return { vertexShader, fragmentShader: frag, missing };
}

/**
 * Resolve what a descriptor draws as: Silk Multi-Color needs its gradient
 * pair; without one (an unknown colourway) it falls back to plain silk, so a
 * bogus gradient is never rendered.
 */
function resolveFinish(
  descriptor: BuildFinishMaterialOptions["descriptor"],
  baseHex: string,
): { finish: Finish; effectiveFinish: Finish; gradColours: string[] | null } {
  const finish: Finish = descriptor?.finish || "basic";
  const colours = descriptor?.colours;
  const gradColours = finish === "silk-multi" && colours && colours.length >= 2
    ? colours.map((h) => (h || baseHex).slice(0, 7))
    : null;
  const effectiveFinish: Finish = finish === "silk-multi" && !gradColours ? "silk" : finish;
  return { finish, effectiveFinish, gradColours };
}

/**
 * The GLSL buildFinishMaterial would inject for these options, without
 * building a material (for tests and snapshots).
 */
export function finishGlslFor(opts: BuildFinishMaterialOptions): FinishGlsl {
  const baseHex = (opts.hex || "#6b9bd2").slice(0, 7);
  const { effectiveFinish, gradColours } = resolveFinish(opts.descriptor, baseHex);
  return finishGlsl(effectiveFinish, new Color(baseHex), gradColours, opts);
}

/** Build one finish-aware material. */
export function buildFinishMaterial({
  hex,
  descriptor,
  meshScale,
  zMin,
  zRange,
  opacity,
  side = DoubleSide,
  colourInjection = "",
}: BuildFinishMaterialOptions): MeshPhysicalMaterial {
  const baseHex = (hex || "#6b9bd2").slice(0, 7);
  const base = new Color(baseHex);
  const { finish, effectiveFinish, gradColours } = resolveFinish(descriptor, baseHex);
  const params = FINISH_PARAMS[finish] || FINISH_PARAMS.basic;

  const isTranslucent = effectiveFinish === "translucent";
  const resolvedOpacity = opacity ?? (isTranslucent ? TRANSLUCENT_OPACITY : undefined);
  const alphaProps = resolvedOpacity != null ? { transparent: true, opacity: resolvedOpacity } : {};

  const material = new MeshPhysicalMaterial({
    // The gradient (and the layer-mode height colours) multiply diffuseColor,
    // so those modes start from white; everything else starts from the base.
    color: gradColours || colourInjection ? 0xffffff : base,
    roughness: params.roughness,
    metalness: params.metalness,
    side,
    ...(params.clearcoat != null
      ? { clearcoat: params.clearcoat, clearcoatRoughness: params.clearcoatRoughness }
      : {}),
    ...alphaProps,
  });
  material.envMapIntensity = params.envInt;

  const userData = material.userData as FinishUserData;
  if (effectiveFinish === "glow") {
    material.emissive = base.clone();
    material.emissiveIntensity = GLOW_EMISSIVE.base;
    userData.glowPulse = { ...GLOW_EMISSIVE };
  }

  const glsl = finishGlsl(effectiveFinish, base, gradColours, { meshScale, zMin, zRange, colourInjection });
  const timeUniform = { value: 0 };
  userData.finish = effectiveFinish;
  userData.finishWantsEnv = params.envInt > 0.15;
  userData.finishTime = timeUniform;
  userData.finishAnimated = ANIMATED_FINISHES.has(effectiveFinish);

  if (glsl.header) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFinishTime = timeUniform;
      const out = injectFinishGlsl(glsl, shader);
      shader.vertexShader = out.vertexShader;
      shader.fragmentShader = out.fragmentShader;
    };
    material.customProgramCacheKey = () => glsl.cacheKey;
  }

  return material;
}

// ---------------------------------------------------------------------------
// Helpers shared with the viewers (material may be a per-group array)
// ---------------------------------------------------------------------------

type MaterialOrArray<M extends Material = Material> = M | readonly M[] | null | undefined;

export function forEachMaterial<M extends Material>(materialOrArray: MaterialOrArray<M>, fn: (m: M) => void): void {
  if (Array.isArray(materialOrArray)) (materialOrArray as readonly M[]).forEach(fn);
  else if (materialOrArray) fn(materialOrArray as M);
}

export function disposeMaterials(materialOrArray: MaterialOrArray): void {
  forEachMaterial(materialOrArray, (m) => m.dispose());
}

export function setMaterialsWireframe(materialOrArray: MaterialOrArray, wireframe: boolean): void {
  forEachMaterial(materialOrArray, (m) => {
    (m as Material & { wireframe?: boolean }).wireframe = wireframe;
  });
}

export function getMaterialsWireframe(materialOrArray: MaterialOrArray): boolean {
  const first = Array.isArray(materialOrArray) ? materialOrArray[0] : materialOrArray;
  return Boolean((first as (Material & { wireframe?: boolean }) | null | undefined)?.wireframe);
}

/**
 * Advance the ambient-motion clock on every finish material. Returns true
 * when at least one material actually animates (so the caller's frame loop
 * knows to keep rendering).
 */
export function updateFinishTime(materialOrArray: MaterialOrArray, seconds: number): boolean {
  let animated = false;
  forEachMaterial(materialOrArray, (m) => {
    const data = m.userData as Partial<FinishUserData>;
    if (data?.finishTime) data.finishTime.value = seconds;
    if (data?.finishAnimated) animated = true;
    if (data?.glowPulse) {
      const { base, amplitude } = data.glowPulse;
      (m as MeshPhysicalMaterial).emissiveIntensity = base + amplitude * (0.5 + 0.5 * Math.sin(seconds * 2.2));
      animated = true;
    }
  });
  return animated;
}

/** True when any material in the set carries ambient motion. */
export function hasAnimatedFinish(materialOrArray: MaterialOrArray): boolean {
  let animated = false;
  forEachMaterial(materialOrArray, (m) => {
    const data = m.userData as Partial<FinishUserData>;
    if (data?.finishAnimated || data?.glowPulse) animated = true;
  });
  return animated;
}

// One studio environment map per renderer (PMREM output is renderer-bound).
// Reflective finishes are lifeless under lights-only scenes; a compact
// RoomEnvironment gives silk/metal/sparkle something real to mirror without
// touching scene.background or non-finish materials.
const envMapCache = new WeakMap<WebGLRenderer, Texture>();

/**
 * Give every finish material that wants reflections (envInt > 0.15) the
 * renderer's studio environment. Materials that already have an envMap are
 * left alone. Does nothing without a renderer, or where PMREM fails
 * (headless or limited contexts: finishes still render, just flatter).
 */
export function applyFinishEnvMap(renderer: WebGLRenderer | null | undefined, materialOrArray: MaterialOrArray): void {
  if (!renderer) return;
  let tex = envMapCache.get(renderer);
  if (!tex) {
    try {
      const pmrem = new PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      tex = pmrem.fromScene(room, 0.04).texture;
      pmrem.dispose();
      room.dispose?.();
      envMapCache.set(renderer, tex);
    } catch {
      return; // headless/limited contexts: finishes still render, just flatter
    }
  }
  forEachMaterial(materialOrArray, (m) => {
    const pm = m as MeshPhysicalMaterial;
    if ((m.userData as Partial<FinishUserData>)?.finishWantsEnv && !pm.envMap) {
      pm.envMap = tex as Texture;
      pm.needsUpdate = true;
    }
  });
}

/**
 * Free the studio environment applyFinishEnvMap made for a renderer (call it
 * before renderer.dispose()). Safe to call when there is none.
 */
export function disposeFinishEnvMap(renderer: WebGLRenderer | null | undefined): void {
  if (!renderer) return;
  const tex = envMapCache.get(renderer);
  if (tex) {
    tex.dispose();
    envMapCache.delete(renderer);
  }
}
