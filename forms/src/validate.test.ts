// @vitest-environment node
/**
 * @bcl32/forms/validate runs in plain Node: no DOM, no React. These tests run
 * without jsdom, so a stray `window` or React import would fail them.
 */
import { describe, expect, it } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

import {
  isEmptyValue,
  issueText,
  textLength,
  validate,
  validateField,
  type CharsetPolicy,
  type CrossFieldRule,
  type FieldIssue,
  type RuleSource,
} from "@bcl32/forms/validate";
import { fieldErrors } from "./numberFields";

describe("the environment", () => {
  it("has no DOM", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });
});

describe("textLength", () => {
  it("counts code points, not UTF-16 units", () => {
    expect("😀😀😀".length).toBe(6);
    expect(textLength("😀😀😀")).toBe(3);
    expect(textLength("")).toBe(0);
    expect(textLength("abc")).toBe(3);
  });

  it("normalises to NFC first", () => {
    const decomposed = "é"; // e + combining acute
    expect(decomposed.length).toBe(2);
    expect(textLength(decomposed)).toBe(1);
  });
});

describe("isEmptyValue", () => {
  it("empty is undefined, null, '' and []; false and 0 are values", () => {
    expect([undefined, null, "", []].map(isEmptyValue)).toEqual([true, true, true, true]);
    expect([false, 0, " ", ["a"]].map(isEmptyValue)).toEqual([false, false, false, false]);
  });
});

const text = (extra: Partial<RuleSource> = {}): RuleSource => ({ name: "t", type: "string", ...extra });

describe("required", () => {
  it("attr.required refuses empty values, untouched included", () => {
    const a = text({ required: true });
    for (const v of [undefined, null, ""]) expect(validateField(a, v)).toEqual({ code: "required" });
    expect(validateField(a, "x")).toBeNull();
  });

  it("skipUntouched leaves undefined alone", () => {
    expect(validateField(text({ required: true }), undefined, {}, { skipUntouched: true })).toBeNull();
    expect(validateField(text({ required: true }), "", {}, { skipUntouched: true })).toEqual({ code: "required" });
  });

  it("a non-nullable number that is null is required (today's rule); undefined is untouched", () => {
    const n: RuleSource = { name: "n", type: "number" };
    expect(validateField(n, null)).toEqual({ code: "required" });
    expect(validateField({ ...n, nullable: true }, null)).toBeNull();
    expect(validateField(n, undefined)).toBeNull();
  });

  it("a string with min_length >= 1 refuses ''", () => {
    expect(validateField(text({ min_length: 1 }), "")).toEqual({ code: "required" });
    expect(validateField(text({ min_length: 0 }), "")).toBeNull();
  });

  it("the registry's isEmpty decides emptiness for its type", () => {
    const a: RuleSource = { name: "c", type: "colour", required: true };
    const registry = { colour: { isEmpty: (v: unknown) => v === "#000000" } };
    expect(validateField(a, "#000000", {}, { registry })).toEqual({ code: "required" });
    expect(validateField(a, "", {}, { registry })).toBeNull();
  });
});

describe("strings", () => {
  it("min_length / max_length in code points", () => {
    expect(validateField(text({ max_length: 3 }), "😀😀😀")).toBeNull();
    expect(validateField(text({ max_length: 3 }), "abcd")).toEqual({ code: "too_long", max: 3 });
    expect(validateField(text({ min_length: 2 }), "a")).toEqual({ code: "too_short", min: 2 });
  });

  it("pattern is a search, not anchored, like Pydantic", () => {
    expect(validateField(text({ pattern: "[a-z]+" }), "ABCd")).toBeNull();
    expect(validateField(text({ pattern: "[a-z]+" }), "ABC")).toEqual({ code: "pattern" });
    expect(validateField(text({ pattern: "^[a-z]+$" }), "ABCd")).toEqual({ code: "pattern" });
  });

  it("a pattern JS cannot compile is not checked, and never throws", () => {
    expect(validateField(text({ pattern: "(?P<name>x)" }), "anything")).toBeNull();
    expect(validateField(text({ pattern: "([" }), "anything")).toBeNull();
  });

  it("a pattern valid only without the u flag still applies", () => {
    // \_ is an invalid identity escape under `u`.
    expect(validateField(text({ pattern: "^a\\_b$" }), "a_b")).toBeNull();
    expect(validateField(text({ pattern: "^a\\_b$" }), "ab")).toEqual({ code: "pattern" });
  });

  it("the pattern sees the raw value unless normalise is NFC", () => {
    const decomposed = "é";
    expect(validateField(text({ pattern: "^é$" }), decomposed)).toEqual({ code: "pattern" });
    expect(validateField(text({ pattern: "^é$", normalise: "NFC" }), decomposed)).toBeNull();
  });

  it("an empty optional string passes the string rules", () => {
    expect(validateField(text({ pattern: "^\\d+$", max_length: 2 }), "")).toBeNull();
  });

  it("a select refuses a value that is not one of its options", () => {
    const s: RuleSource = { name: "s", type: "select", options: [{ value: "a", label: "A" }] };
    expect(validateField(s, "a")).toBeNull();
    expect(validateField(s, "z")).toEqual({ code: "not_an_option" });
    expect(validateField({ ...s, options: ["a"] }, "a")).toBeNull();
    // Free-text types with suggestions are not restricted.
    expect(validateField({ ...s, type: "single_combobox" }, "z")).toBeNull();
  });
});

describe("charset", () => {
  const latin: CharsetPolicy = (cp) => cp >= 0x20 && cp <= 0x7e;
  const charsets = { latin };

  it("names the offending characters once each, never the value", () => {
    const issue = validateField(text({ charset: "latin" }), "I ★ you ★ ♥", {}, { charsets });
    expect(issue).toEqual({ code: "charset", chars: ["★", "♥"] });
  });

  it("checks code points, so an astral character is one character", () => {
    expect(validateField(text({ charset: "latin" }), "hi😀", {}, { charsets })).toEqual({ code: "charset", chars: ["😀"] });
  });

  it("a policy name with no policy supplied is not checked", () => {
    expect(validateField(text({ charset: "latin" }), "★")).toBeNull();
  });
});

describe("numbers", () => {
  const n = (extra: Partial<RuleSource> = {}): RuleSource => ({ name: "n", type: "number", ...extra });

  it("checks the value itself: fraction, decimals, range, in parseNumber's order", () => {
    expect(validateField(n({ integer: true, min: 1, max: 5 }), 2.5)).toEqual({ code: "fraction" });
    expect(validateField(n({ decimals: 1 }), 1.25)).toEqual({ code: "decimals" });
    expect(validateField(n({ format: "money" }), 1.255)).toEqual({ code: "decimals" });
    expect(validateField(n({ min: 0, min_exclusive: true }), 0)).toEqual({ code: "range" });
    expect(validateField(n({ min: 1, max: 5 }), 5)).toBeNull();
    expect(validateField(n({ decimals: 2 }), 0.1 + 0.2)).toBeNull();
  });

  it("a Decimal's string is read as its number", () => {
    expect(validateField(n({ max: 10 }), "12.50")).toEqual({ code: "range" });
    expect(validateField(n({ max: 10 }), "abc")).toEqual({ code: "invalid" });
  });

  it("a parse error from the number box comes first", () => {
    expect(validateField(n(), 3, {}, { parseErrors: { n: "invalid" } })).toEqual({ code: "invalid" });
    expect(validateField(n(), 3, {}, { parseErrors: { n: { code: "range" } } })).toEqual({ code: "range" });
    expect(validateField(n(), 3, {}, { parseErrors: { n: null } })).toBeNull();
  });
});

describe("registry and cross-field rules", () => {
  const a: RuleSource[] = [
    { name: "text", type: "engraving", max_length: 10 },
    { name: "size", type: "number", min: 1 },
  ];

  it("the registry's rule runs after the generic ones", () => {
    const registry = {
      engraving: { validate: (_attr: RuleSource, v: unknown): FieldIssue | null => (v === "nope" ? { code: "x-banned", message: "Not that" } : null) },
    };
    expect(validate(a, { text: "nope" }, { registry })).toEqual({ text: { code: "x-banned", message: "Not that" } });
    expect(validate(a, { text: "much too long text" }, { registry })).toEqual({ text: { code: "too_long", max: 10 } });
  });

  it("cross-field rules add issues to fields that have none yet", () => {
    const fits: CrossFieldRule = (values) =>
      typeof values.text === "string" && typeof values.size === "number" && values.text.length > values.size * 2
        ? [{ field: "text", issue: { code: "x-fits", max: values.size * 2 } }, { field: "size", issue: { code: "x-fits" } }]
        : [];
    expect(validate(a, { text: "abcdef", size: 2 }, { crossField: [fits] })).toEqual({
      text: { code: "x-fits", max: 4 },
      size: { code: "x-fits" },
    });
    // size already has an issue (range): the first one wins.
    expect(validate(a, { text: "abcdef", size: 0 }, { crossField: [fits] }).size).toEqual({ code: "range" });
  });

  it("only and editable: false narrow both", () => {
    const rule: CrossFieldRule = () => [{ field: "size", issue: { code: "x-any" } }];
    expect(validate(a, { text: "much too long text" }, { only: (f) => f === "size", crossField: [rule] })).toEqual({
      size: { code: "x-any" },
    });
    expect(validate([{ ...a[0], editable: false }], { text: "much too long text" })).toEqual({});
  });
});

describe("issueText", () => {
  it("words the string and custom issues", () => {
    expect(
      [
        issueText("Name", { code: "too_short", min: 1 }),
        issueText("Name", { code: "too_short", min: 3 }),
        issueText("Name", { code: "too_long", max: 20 }),
        issueText("Name", "too_long", { name: "n", type: "string", max_length: 5 }),
        issueText("Name", { code: "pattern" }),
        issueText("Name", { code: "charset", chars: ["★"] }),
        issueText("Name", { code: "charset", chars: ["★", "♥"] }),
        issueText("Name", { code: "not_an_option" }),
        issueText("Name", { code: "x-fits", message: "Too long for this size" }),
        issueText("Name", { code: "x-fits" }),
        issueText("Name", { code: "required" }),
      ],
    ).toEqual([
      "At least 1 character",
      "At least 3 characters",
      "At most 20 characters",
      "At most 5 characters",
      "Not in the expected format",
      "This character can't be used: ★",
      "These characters can't be used: ★ ♥",
      "Choose one of the options",
      "Too long for this size",
      "Not valid",
      "Name is required",
    ]);
  });

  it("words the number issues exactly as fieldErrorText always has", () => {
    const attr: ModelAttribute = { name: "w", type: "number", min: 1, max: 5 };
    expect(issueText("Width", { code: "range" }, attr)).toBe("Between 1 and 5");
    expect(issueText("Width", "decimals", { ...attr, decimals: 2 })).toBe("2 decimal places at most");
  });
});

describe("fieldErrors parity", () => {
  // Today's fieldErrors checks parse errors and a null non-nullable number.
  // validate does both the same way, and also checks a number's value against
  // its bounds, which fieldErrors leaves to the box; with in-range values the
  // two agree exactly. fieldErrors itself is unchanged (characterisation.test).
  const attrs: ModelAttribute[] = [
    { name: "a", type: "number", editable: true },
    { name: "b", type: "number", editable: true, nullable: true },
    { name: "c", type: "number", editable: true, min: 0, max: 10 },
    { name: "d", type: "number", editable: true, integer: true },
  ];
  const cases: [Record<string, unknown>, Record<string, "invalid" | "fraction" | "decimals" | "range" | undefined>, ((n: string) => boolean)?][] = [
    [{ a: null, b: null, c: 3, d: 4 }, {}],
    [{ a: 1, b: null, c: null, d: undefined }, { d: "fraction" }],
    [{ a: undefined, b: 2, c: 5 }, { c: "range", a: "invalid" }],
    [{ a: null, c: null }, {}, (n) => n === "c"],
    [{}, { b: "decimals" }],
  ];
  it.each(cases)("%j %j", (data, parseErrors, only) => {
    const codes = Object.fromEntries(
      Object.entries(validate(attrs, data, { parseErrors, only })).map(([k, v]) => [k, v.code]),
    );
    expect(codes).toEqual(fieldErrors(attrs, data, parseErrors, only));
  });
});

describe("textLength and plain Pydantic", () => {
  it("counts NFC code points, which plain Pydantic does not normalise", () => {
    const decomposed = "A".repeat(23) + "é";
    // Pydantic `Field(max_length=24)` with no BeforeValidator counts 25 here and refuses.
    expect(Array.from(decomposed).length).toBe(25);
    expect(textLength(decomposed)).toBe(24);
    expect(validateField({ name: "t", type: "string", max_length: 24 }, decomposed)).toBeNull();
  });
});

describe("trim", () => {
  const line: RuleSource = { name: "line", type: "string", max_length: 5, pattern: "^[a-z]+$" };

  it("is off by default: the value is checked as typed", () => {
    expect(validateField(line, " abcde ")).toEqual({ code: "too_long", max: 5 });
    expect(validateField({ ...line, max_length: 10 }, " abc ")).toEqual({ code: "pattern" });
    expect(validateField({ name: "r", type: "string", required: true }, "   ")).toBeNull();
  });

  it("strips before the length, required and pattern checks", () => {
    expect(validateField(line, " abcde ", {}, { trim: true })).toBeNull();
    expect(validateField({ ...line, max_length: 10 }, " abc ", {}, { trim: true })).toBeNull();
    expect(validateField({ name: "r", type: "string", required: true }, " \t\n ", {}, { trim: true })).toEqual({ code: "required" });
    expect(validateField({ name: "m", type: "string", min_length: 1 }, "  ", {}, { trim: true })).toEqual({ code: "required" });
    expect(validateField({ name: "m", type: "string", min_length: 3 }, " ab ", {}, { trim: true })).toEqual({ code: "too_short", min: 3 });
    // An optional field that is only spaces is empty, so it passes.
    expect(validateField(line, "   ", {}, { trim: true })).toBeNull();
  });

  it("validate() passes it on, and leaves the values alone", () => {
    const values = Object.freeze({ line: " abcde " });
    expect(validate([line], values)).toEqual({ line: { code: "too_long", max: 5 } });
    expect(validate([line], values, { trim: true })).toEqual({});
    expect(values.line).toBe(" abcde ");
  });

  it("the registry's isEmpty and validate see the stripped value", () => {
    const seen: unknown[] = [];
    const registry = {
      word: {
        isEmpty: (v: unknown) => (seen.push(v), v === ""),
        validate: (_a: RuleSource, v: unknown) => (seen.push(v), null),
      },
    };
    validateField({ name: "w", type: "word" }, "  hi  ", {}, { trim: true, registry });
    expect(seen).toEqual(["hi", "hi"]);
  });

  it("strips what Pydantic's str_strip_whitespace strips: Unicode White_Space, not JS trim()", () => {
    // pydantic 2.12.5, every code point c tested as c + "a" + c.
    const pydantic = [
      0x9, 0xa, 0xb, 0xc, 0xd, 0x20, 0x85, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007,
      0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
    ];
    const attr: RuleSource = { name: "s", type: "string", max_length: 1 };
    const stripped: number[] = [];
    for (let cp = 0; cp <= 0xffff; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const c = String.fromCodePoint(cp);
      if (validateField(attr, c + "a" + c, {}, { trim: true }) === null) stripped.push(cp);
    }
    expect(stripped).toEqual(pydantic);
    // The two places JS's own trim() differs.
    expect("﻿a".trim()).toBe("a");
    expect(validateField(attr, "﻿a", {}, { trim: true })).toEqual({ code: "too_long", max: 1 });
    expect("\u0085a".trim()).toBe("\u0085a");
    expect(validateField(attr, "\u0085a", {}, { trim: true })).toBeNull();
  });
});
