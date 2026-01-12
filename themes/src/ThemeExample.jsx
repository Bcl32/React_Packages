import React from "react";

//ui components
import { Button } from "@bcl32/utils/Button";

import { Palette } from "lucide-react";
import { AnimatedTabs, TabContent } from "@bcl32/utils/AnimatedTabs";
import { ShowHeirarchy } from "@bcl32/utils/ShowHeirarchy";

export function ThemeExample() {
  return (
    <div className="container">
      <h1 className="text-2xl py-1">Component Examples:</h1>
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
          <ShowHeirarchy json_data={example_json}></ShowHeirarchy>
        </div>
      </div>
    </div>
  );
}
const example_json = {
  "attribute one": {
    "sub attribute one": "Value",
    "sub attribute two": false,
  },
  "attribute two": { "sub attribute one": "Value", "sub attribute two": true },
  array: [1, 2, 3],
};
