import { describe, expect, it } from "vitest";

import { MODEL_ATTRIBUTE_KEYS } from "./modelAttributeKeys";

// Every top-level key schema_utils writes onto an attribute: the golden
// fixture's set (python-modules/schema_utils/tests/golden/modeldata.json, 32
// keys) plus checkedValue/checkedLabel, which only a checkbox boolean filter
// carries and the fixture has none of. The cross-repo check against the
// generator itself lives in tools/; this pins the table to the same list.
const GENERATED = [
  "name", "source", "type", "title", "stats", "unit", "format", "options",
  "nullable", "integer", "help_text", "colour_presets", "editable", "default", "reference",
  "filter", "filter_excluded_reason", "filter_type", "filter_empty", "filter_rule",
  "cell_shape", "selection", "display", "value_key", "label_key", "primaryFilter",
  "checkedValue", "checkedLabel", "filterOrder", "options_source",
  "endpoint", "sortable", "thumbnail", "sub_fields",
];

// Keys package code reads that the generator does not write.
const HAND_WRITTEN = ["accept"];
const REACT_ONLY = ["description", "groupBy", "searchAliases"];
// Read by parseNumber / formatNumber (R13) ahead of schema_utils emitting them.
const PLANNED = ["decimals", "max", "max_exclusive", "min", "min_exclusive", "unit_label"];

function keysOf(origin: string): string[] {
  return Object.entries(MODEL_ATTRIBUTE_KEYS)
    .filter(([, o]) => o === origin)
    .map(([k]) => k)
    .sort();
}

describe("MODEL_ATTRIBUTE_KEYS", () => {
  it("lists the 34 keys schema_utils writes", () => {
    expect(GENERATED).toHaveLength(34);
    expect(keysOf("generated")).toEqual([...GENERATED].sort());
  });

  it("lists the keys package code reads that nothing generates", () => {
    expect(keysOf("hand-written")).toEqual(HAND_WRITTEN);
    expect(keysOf("react-only")).toEqual([...REACT_ONLY].sort());
    expect(keysOf("planned")).toEqual(PLANNED);
  });

  it("has no key outside those four origins", () => {
    expect(Object.keys(MODEL_ATTRIBUTE_KEYS).sort()).toEqual(
      [...GENERATED, ...HAND_WRITTEN, ...REACT_ONLY, ...PLANNED].sort(),
    );
  });
});
