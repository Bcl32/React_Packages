// @ts-expect-error TS7016: untyped module (see Input.markup.test.tsx)
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SidebarProvider, SidebarTrigger } from "./Sidebar";

describe("SidebarTrigger", () => {
  it("names the keyboard shortcut in its tooltip", () => {
    const html = renderToStaticMarkup(
      <SidebarProvider>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    // The test host is Linux, so the label is Ctrl+B (Macs get ⌘B).
    expect(html).toContain('title="Toggle Sidebar (Ctrl+B)"');
  });

  it("lets a caller's title override the default", () => {
    const html = renderToStaticMarkup(
      <SidebarProvider>
        <SidebarTrigger title="Menu" />
      </SidebarProvider>,
    );
    expect(html).toContain('title="Menu"');
    expect(html).not.toContain("Toggle Sidebar (");
  });
});
