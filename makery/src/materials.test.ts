import { MeshPhysicalMaterial, ShaderLib, REVISION } from "three";
import { describe, expect, it } from "vitest";

import { FINISHES, finishDescriptor, type Finish } from "./finishes";
import {
  ANIMATED_FINISHES,
  FINISH_PARAMS,
  SHADER_ANCHORS,
  applyFinishEnvMap,
  buildFinishMaterial,
  disposeFinishEnvMap,
  finishGlslFor,
  hasAnimatedFinish,
  injectFinishGlsl,
  updateFinishTime,
  type FinishUserData,
} from "./materials";

// A fixed mesh context, so the generated GLSL is a stable snapshot.
const CTX = { meshScale: 42, zMin: -7.5, zRange: 15 };
const GILDED_ROSE = finishDescriptor({ material: "PLA", finish: "Silk Multi-Color", colourName: "Gilded Rose" });
const descriptorFor = (finish: Finish) => (finish === "silk-multi" ? GILDED_ROSE : { finish, colours: null });

/** Run a material's onBeforeCompile on a copy of three's physical shader, as the renderer would. */
function compile(material: MeshPhysicalMaterial) {
  const shader = {
    vertexShader: ShaderLib.physical.vertexShader,
    fragmentShader: ShaderLib.physical.fragmentShader,
    uniforms: {} as Record<string, { value: unknown }>,
  };
  material.onBeforeCompile(shader as never, undefined as never);
  return shader;
}

describe("three's physical shader still has the injection anchors", () => {
  it("is the 0.172 line the package is pinned to", () => {
    expect(REVISION).toBe("172");
  });

  it("vertex: begin_vertex; fragment: the diffuseColor line and opaque_fragment", () => {
    // If any of these disappears, String.replace silently does nothing and the
    // finish is drawn without its shader: exactly what this test exists for.
    expect(ShaderLib.physical.vertexShader).toContain(SHADER_ANCHORS.vertex);
    expect(ShaderLib.physical.fragmentShader).toContain(SHADER_ANCHORS.diffuse);
    expect(ShaderLib.physical.fragmentShader).toContain(SHADER_ANCHORS.light);
    // Each exactly once, so the one replace lands in the right place.
    expect(ShaderLib.physical.vertexShader.split(SHADER_ANCHORS.vertex)).toHaveLength(2);
    expect(ShaderLib.physical.fragmentShader.split(SHADER_ANCHORS.diffuse)).toHaveLength(2);
    expect(ShaderLib.physical.fragmentShader.split(SHADER_ANCHORS.light)).toHaveLength(2);
  });

  it("injectFinishGlsl reports a missing anchor instead of dropping the finish silently", () => {
    const glsl = finishGlslFor({ hex: "#3366CC", descriptor: { finish: "wood" }, ...CTX });
    const out = injectFinishGlsl(glsl, { vertexShader: "void main() {}", fragmentShader: "void main() {}" });
    expect(out.missing).toEqual(["vertex", "diffuse"]);
  });
});

describe("generated GLSL per finish", () => {
  for (const finish of FINISHES) {
    it(`${finish}: snapshot, and every piece lands in three's shader`, () => {
      const opts = { hex: "#3366CC", descriptor: descriptorFor(finish), ...CTX };
      const glsl = finishGlslFor(opts);
      expect({ header: glsl.header.split(NOISE_START)[0], diffuse: glsl.diffuse, light: glsl.light }).toMatchSnapshot();

      const material = buildFinishMaterial(opts);
      const shader = compile(material);
      const userData = material.userData as FinishUserData;
      if (!glsl.header) {
        // basic, matte, glow, translucent: surface parameters only, no shader.
        expect(["basic", "matte", "glow", "translucent"]).toContain(finish);
        expect(shader.fragmentShader).toBe(ShaderLib.physical.fragmentShader);
        return;
      }
      expect(injectFinishGlsl(glsl, ShaderLib.physical).missing).toEqual([]);
      expect(shader.uniforms.uFinishTime).toBe(userData.finishTime);
      expect(shader.vertexShader).toContain("vFinishPos = position;");
      if (glsl.diffuse) expect(shader.fragmentShader).toContain(`${SHADER_ANCHORS.diffuse}\n${glsl.diffuse}`);
      if (glsl.light) expect(shader.fragmentShader).toContain(`${glsl.light}\n${SHADER_ANCHORS.light}`);
      expect(material.customProgramCacheKey()).toBe(glsl.cacheKey);
    });
  }
});

const NOISE_START = "\nfloat finishHash";

describe("buildFinishMaterial", () => {
  it("copies the finish table onto the physical material", () => {
    for (const finish of FINISHES) {
      const m = buildFinishMaterial({ hex: "#808080", descriptor: descriptorFor(finish), ...CTX });
      const p = FINISH_PARAMS[finish];
      expect(m.roughness, finish).toBe(p.roughness);
      expect(m.metalness, finish).toBe(p.metalness);
      expect(m.envMapIntensity, finish).toBe(p.envInt);
      expect(m.clearcoat, finish).toBe(p.clearcoat ?? 0);
      expect((m.userData as FinishUserData).finishWantsEnv, finish).toBe(p.envInt > 0.15);
      expect((m.userData as FinishUserData).finishAnimated, finish).toBe(ANIMATED_FINISHES.has(finish));
    }
  });

  it("Silk Multi-Color is a real gradient from white; with no pair it falls back to plain silk", () => {
    const multi = buildFinishMaterial({ hex: "#FCA2BF", descriptor: GILDED_ROSE, ...CTX });
    expect((multi.userData as FinishUserData).finish).toBe("silk-multi");
    expect(multi.color.getHexString()).toBe("ffffff");
    expect(finishGlslFor({ hex: "#FCA2BF", descriptor: GILDED_ROSE, ...CTX }).diffuse).toContain("gradCol");

    const unknown = buildFinishMaterial({ hex: "#C04080", descriptor: { finish: "silk-multi", colours: null }, ...CTX });
    expect((unknown.userData as FinishUserData).finish).toBe("silk");
    expect(unknown.color.getHexString()).toBe("c04080");
    expect(finishGlslFor({ hex: "#C04080", descriptor: { finish: "silk-multi" }, ...CTX }).diffuse).toBe("");
  });

  it("translucency: an explicit opacity wins, Translucent defaults to 0.55, opaque stays opaque", () => {
    expect(buildFinishMaterial({ hex: "#3366CC", descriptor: { finish: "translucent" } })).toMatchObject({ transparent: true, opacity: 0.55 });
    expect(buildFinishMaterial({ hex: "#3366CC", descriptor: { finish: "basic" }, opacity: 0.25 })).toMatchObject({ transparent: true, opacity: 0.25 });
    expect(buildFinishMaterial({ hex: "#3366CC", descriptor: { finish: "basic" } }).transparent).toBe(false);
  });

  it("glow: emissive in its own colour, pulsing only when time advances", () => {
    const m = buildFinishMaterial({ hex: "#88FF88", descriptor: { finish: "glow" } });
    expect(m.emissive.getHexString()).toBe("88ff88");
    expect(m.emissiveIntensity).toBe(0.45);
    expect(hasAnimatedFinish(m)).toBe(true);
  });

  it("an alpha byte on the hex is ignored (opacity is separate); no hex is the default blue", () => {
    expect(buildFinishMaterial({ hex: "#3366CC80", descriptor: null }).color.getHexString()).toBe("3366cc");
    expect(buildFinishMaterial({}).color.getHexString()).toBe("6b9bd2");
  });

  it("identical bakes share a cache key; different meshes do not", () => {
    const a = buildFinishMaterial({ hex: "#C0A060", descriptor: { finish: "sparkle" }, ...CTX });
    const b = buildFinishMaterial({ hex: "#C0A060", descriptor: { finish: "sparkle" }, ...CTX });
    const c = buildFinishMaterial({ hex: "#C0A060", descriptor: { finish: "sparkle" }, ...CTX, meshScale: 300 });
    expect(a.customProgramCacheKey()).toBe(b.customProgramCacheKey());
    expect(a.customProgramCacheKey()).not.toBe(c.customProgramCacheKey());
  });
});

describe("time and environment helpers", () => {
  it("updateFinishTime advances each material's own clock and says whether anything animates", () => {
    const silk = buildFinishMaterial({ hex: "#C0A060", descriptor: { finish: "silk" }, ...CTX });
    const sparkle = buildFinishMaterial({ hex: "#C0A060", descriptor: { finish: "sparkle" }, ...CTX });
    expect(updateFinishTime([sparkle], 3)).toBe(false);
    expect(updateFinishTime([silk, sparkle], 2.5)).toBe(true);
    expect((silk.userData as FinishUserData).finishTime.value).toBe(2.5);
    expect((sparkle.userData as FinishUserData).finishTime.value).toBe(2.5);
    // Two materials never share a clock.
    expect((silk.userData as FinishUserData).finishTime).not.toBe((sparkle.userData as FinishUserData).finishTime);
  });

  it("applyFinishEnvMap with no renderer, or one PMREM cannot use, changes nothing", () => {
    const m = buildFinishMaterial({ hex: "#C0A060", descriptor: { finish: "metal" } });
    applyFinishEnvMap(null, m);
    applyFinishEnvMap({} as never, m);
    expect(m.envMap).toBeNull();
    expect(() => disposeFinishEnvMap({} as never)).not.toThrow();
  });
});
