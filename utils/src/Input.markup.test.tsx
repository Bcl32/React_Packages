// utils declares no @types/react-dom (nothing it ships needs one), and adding
// it is an install; react-dom itself resolves. Drop this line with the types.
// @ts-expect-error TS7016: untyped module
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Input } from "./Input";

// The no-affix path is every Input in every app today, so its markup is pinned
// to the byte. The one deliberate change from the pre-slot release is
// `aria-[invalid=true]:border-destructive` at the end of the base string: an
// input marked invalid now draws a red border on both paths.
const BASE =
  "flex w-full rounded-md border border-input text-base ring-offset-background " +
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed " +
  "disabled:opacity-50 md:text-sm aria-[invalid=true]:border-destructive";

describe("Input without an affix", () => {
  it("renders today's bare input", () => {
    expect(renderToStaticMarkup(<Input />)).toBe(
      `<input class="${BASE} bg-transparent h-10 px-3 py-2"/>`,
    );
  });

  it("merges a caller's height over the size's (twMerge drops h-12)", () => {
    expect(
      renderToStaticMarkup(
        <Input size="lg" variant="background" type="number" className="h-8" />,
      ),
    ).toBe(`<input type="number" class="${BASE} bg-background px-3 py-3 h-8"/>`);
  });
});
