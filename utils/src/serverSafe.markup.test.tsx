// Plain Node, no DOM: the opt-in server-safe modes render on a server.
// @ts-expect-error TS7016: untyped module (see Input.markup.test.tsx)
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatusBanner } from "./StatusBanner";
import { useIsMobile } from "./useIsMobile";

function Layout({ ssr }: { ssr?: boolean }) {
  const isMobile = useIsMobile(ssr === undefined ? undefined : { ssr });
  return <p>{isMobile ? "mobile" : "desktop"}</p>;
}

describe("useIsMobile", () => {
  it("{ ssr: true } renders on the server without touching window", () => {
    expect(typeof window).toBe("undefined");
    expect(renderToString(<Layout ssr />)).toContain("desktop");
  });

  it("the default (no options) still renders on the server: readIsMobile guards window", () => {
    expect(renderToString(<Layout />)).toContain("desktop");
  });
});

describe("StatusBanner", () => {
  it("renders on the server when shown, and hides when told", () => {
    expect(renderToString(<StatusBanner show text="STAGING" />)).toContain("STAGING");
    expect(renderToString(<StatusBanner show={false} text="STAGING" />)).toBe("");
  });

  it("with no show prop it follows import.meta.env?.DEV without throwing", () => {
    expect(() => renderToString(<StatusBanner text="DEV" />)).not.toThrow();
  });
});
