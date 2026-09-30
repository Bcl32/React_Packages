// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { DROP_ANIMATION, DragGrip, DragPill, pillAtCursor } from "./DragAffordances";

// No vitest globals here, so testing-library cannot register its own cleanup.
afterEach(cleanup);

describe("DragPill", () => {
  const text = (props: React.ComponentProps<typeof DragPill>) => render(<DragPill {...props} />).container.textContent;

  it("names one thing, counts several, and falls back to one item", () => {
    expect(text({ label: "Kitchen Reno" })).toBe("Kitchen Reno");
    expect(text({ label: "Kitchen Reno", count: 1 })).toBe("Kitchen Reno");
    expect(text({ label: "ignored", count: 3 })).toBe("3 items");
    expect(text({})).toBe("1 item");
    expect(text({ count: 2, noun: "part" })).toBe("2 parts");
    expect(text({ noun: "part" })).toBe("1 part");
  });
});

describe("DragGrip", () => {
  it("is a button that forwards its ref and the drag library's props", () => {
    const ref = React.createRef<HTMLButtonElement>();
    const onPointerDown = vi.fn();
    const { getByRole } = render(
      <DragGrip ref={ref} label="Drag Kitchen Reno" onPointerDown={onPointerDown} aria-roledescription="draggable" />
    );
    const grip = getByRole("button", { name: "Drag Kitchen Reno" });
    expect(ref.current).toBe(grip);
    expect(grip.getAttribute("type")).toBe("button");
    expect(grip.getAttribute("aria-roledescription")).toBe("draggable");
    expect(grip.className).toContain("touch-none");
    fireEvent.pointerDown(grip);
    expect(onPointerDown).toHaveBeenCalledTimes(1);
  });

  it("draws as a full-height strip when asked, with a larger icon", () => {
    const { getByRole } = render(<DragGrip label="x" strip />);
    const grip = getByRole("button");
    expect(grip.className).toContain("bottom-1");
    expect(grip.className).toContain("top-1");
    expect(grip.querySelector("svg")?.getAttribute("class")).toContain("h-4 w-4");
  });

  it("dims while dragging", () => {
    const { getByRole } = render(<DragGrip label="x" dragging />);
    expect(getByRole("button").className).toContain("opacity-40");
  });
});

describe("DROP_ANIMATION", () => {
  it("fades and shrinks where the pointer let go", () => {
    const [from, to] = DROP_ANIMATION.keyframes({ transform: { initial: { x: 10, y: 20 } } });
    expect(from).toEqual({ opacity: 1, transform: "translate3d(10px, 20px, 0) scale(1)" });
    expect(to).toEqual({ opacity: 0, transform: "translate3d(10px, 20px, 0) scale(0.9)" });
  });
});

describe("pillAtCursor", () => {
  const transform = { x: 100, y: 50, scaleX: 1, scaleY: 1 };
  it("moves the pill from the node's corner to beside the pointer", () => {
    // Grabbed 270px right of and 10px below the card's top-left corner.
    const out = pillAtCursor({
      transform,
      activatorEvent: { clientX: 300, clientY: 110 } as unknown as Event,
      draggingNodeRect: { left: 30, top: 100 },
    });
    expect(out).toEqual({ ...transform, x: 100 + 270 + 14, y: 50 + 10 - 16 });
  });
  it("leaves the transform alone without a pointer position", () => {
    expect(pillAtCursor({ transform, activatorEvent: null, draggingNodeRect: { left: 0, top: 0 } })).toBe(transform);
  });
});
