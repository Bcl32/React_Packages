// @vitest-environment jsdom
import { act } from "react";
// @ts-expect-error TS7016: untyped module (see Input.markup.test.tsx)
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { useIsMobile } from "./useIsMobile";

describe("useIsMobile in a browser", () => {
  it("{ ssr: true }: false on the first render even on a phone, the real answer after mount", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.innerWidth = 390;
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    const seen: boolean[] = [];
    const seenDefault: boolean[] = [];
    function Probe() {
      seen.push(useIsMobile({ ssr: true }));
      seenDefault.push(useIsMobile());
      return null;
    }
    const el = document.createElement("div");
    const root = createRoot(el);
    await act(async () => root.render(<Probe />));
    expect(seen[0]).toBe(false);
    expect(seen.at(-1)).toBe(true);
    // The default is unchanged: synchronous on the first render.
    expect(seenDefault[0]).toBe(true);
    act(() => root.unmount());
  });
});
