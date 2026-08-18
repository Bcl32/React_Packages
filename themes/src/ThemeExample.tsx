import { Button } from "@bcl32/utils/Button";
import { Palette } from "lucide-react";
import { AnimatedTabs, TabContent } from "@bcl32/utils/AnimatedTabs";
import { ShowHierarchy } from "@bcl32/utils/ShowHierarchy";
import { Input } from "@bcl32/utils/Input";
import { Checkbox } from "@bcl32/utils/Checkbox";
import { Label } from "@bcl32/utils/Label";
import { SURFACE_COUNT } from "./contrastCheck";

interface ExampleJson {
  [key: string]: string | boolean | number | ExampleJson | (string | number | boolean)[];
}

const example_json: ExampleJson = {
  "attribute one": {
    "sub attribute one": "Value",
    "sub attribute two": false,
  },
  "attribute two": { "sub attribute one": "Value", "sub attribute two": true },
  array: [1, 2, 3],
};

// Literal class names so Tailwind's content scanner generates them.
const SEMANTIC_SWATCHES: { name: string; className: string }[] = [
  { name: "primary", className: "bg-primary text-primary-foreground" },
  { name: "secondary", className: "bg-secondary text-secondary-foreground" },
  { name: "accent", className: "bg-accent text-accent-foreground" },
  { name: "muted", className: "bg-muted text-muted-foreground" },
  { name: "destructive", className: "bg-destructive text-destructive-foreground" },
  { name: "warning", className: "bg-warning text-warning-foreground" },
  { name: "success", className: "bg-success text-success-foreground" },
];

const CHART_SWATCHES: { name: string; className: string }[] = [
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
  { name: "chart-4", className: "bg-chart-4" },
  { name: "chart-5", className: "bg-chart-5" },
];

// The card backdrop palette. Sized from SURFACE_COUNT and painted through the
// CSS variable rather than listed as `bg-surface-N` literals: the demo should
// show what the palette IS, and a hand-written list would keep showing eight
// after themes.json grew to ten.
//
// Drawn as tiles carrying `card-foreground` rather than as bare chips, because
// that is the whole claim these tokens make — one lightness across the family,
// so a single text colour reads on all of them.
const SURFACE_SWATCHES = Array.from({ length: SURFACE_COUNT }, (_, i) => i + 1);

export function ThemeExample() {
  return (
    <div className="container space-y-3">
      <h1 className="text-2xl py-1">Component Examples:</h1>

      {/* Semantic tokens that rarely show up on a normal page */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SEMANTIC_SWATCHES.map(({ name, className }) => (
          <div
            key={name}
            className={`rounded-md px-3 py-2 text-center text-sm ${className}`}
          >
            {name}
          </div>
        ))}
      </div>

      <h2 className="text-lg pt-2">Chart Colours:</h2>
      <div className="flex gap-1">
        {CHART_SWATCHES.map(({ name, className }) => (
          <div
            key={name}
            title={name}
            className={`h-6 flex-1 rounded ${className}`}
          />
        ))}
      </div>

      <h2 className="text-lg pt-2">Card Backdrops:</h2>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(SURFACE_COUNT, 8)}, minmax(0, 1fr))` }}
      >
        {SURFACE_SWATCHES.map((n) => (
          <div
            key={n}
            title={`surface-${n}`}
            className="rounded-lg border p-2 text-center text-xs text-card-foreground"
            style={{ background: `hsl(var(--surface-${n}))` }}
          >
            {n}
          </div>
        ))}
      </div>

      {/* Form controls: border / input / ring tokens */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Input field" className="max-w-48" />
        <div className="flex items-center gap-2">
          <Checkbox id="theme-example-checkbox" defaultChecked />
          <Label htmlFor="theme-example-checkbox">Checkbox</Label>
        </div>
      </div>

      <div className="flex flex-wrap inline-flex items-center">
        <Button variant="default">Button</Button>
        <Palette size={32} />
        <AnimatedTabs tab_titles={["Tab 1", "Tab 2"]}>
          <div className="overflow-auto">
            <TabContent>
              <div></div>
            </TabContent>
            <TabContent>
              <div></div>
            </TabContent>
          </div>
        </AnimatedTabs>

        <div className="flex">
          {" "}
          <ShowHierarchy json_data={example_json}></ShowHierarchy>
        </div>
      </div>
    </div>
  );
}
