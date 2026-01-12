import React from "react";
import { useState, useEffect } from "react";

import { ColourConverter } from "./ColourConverter";
import { hslToObject } from "./colorUtils";

import { useTheme } from "@bcl32/themes/ThemeProvider";
import { ThemeGenerator } from "@bcl32/themes/ThemeGenerator";
import { ThemePanel } from "./ThemePanel";
import { ThemeExample } from "./ThemeExample";
import { CopyTheme } from "./CopyTheme";

import { Button } from "@bcl32/utils/Button";
import { DialogButton } from "@bcl32/utils/DialogButton";

//styling data
import Themes from "./themes.json";
import style_metadata from "./style_metadata.json";

export function Theming() {
  const { theme, theme_options } = useTheme();

  var theme_colours = get_theme_values(theme);

  const [colours, setColours] = useState(theme_colours);

  var main_styles = {};
  for (const [key, value] of Object.entries(style_metadata)) {
    if (value["group"] === "main") {
      main_styles[key] = {};
      main_styles[key] = colours[key];
      main_styles[key]["description"] = value["description"];
    } else {
      continue;
    }
  }

  function get_theme_values(theme) {
    //the very first time a user visits, the theme will be 'system' so it needs to be translated to the light or dark theme applied in the themeprovider, otherwise the Theme object has no key of 'system'
    if (theme === "system") {
      var theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    var initial_colours = {};
    for (const [key, value] of Object.entries(Themes[theme])) {
      initial_colours[key] = hslToObject(value);
    }
    return initial_colours;
  }

  React.useEffect(() => {
    updateCSSVariables(theme_colours);
    setColours(theme_colours);
  }, [theme]);

  function updateCSSVariables(themeColors, includeAlpha = false) {
    const style = document.documentElement.style;

    Object.entries(themeColors).forEach(([name, setting]) => {
      const alpha = setting.alpha ?? 1;
      const value = `${setting.hue} ${setting.saturation}% ${setting.lightness}%${
        includeAlpha && alpha < 1 ? ` / ${alpha * 100}%` : ""
      }`;
      style.setProperty(`--${name}`, value);
    });
  }

  var ThemePanels = theme_options.map((theme) => {
    return (
      <ThemePanel key={theme} name={theme} styles={Themes[theme]}></ThemePanel>
    );
  });

  return (
    <div>
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <h1 className="text-3xl">Active Theme: {theme}</h1>

          {/* Control Buttons */}
          <CopyTheme currentTheme={theme} colours={colours}></CopyTheme>

          <ColourConverter />

          <DialogButton
            button={<Button variant="default">Edit Styles</Button>}
            title="Edit Styles"
          >
            <ThemeGenerator
              colours={colours}
              setColours={setColours}
              main_styles={main_styles}
            ></ThemeGenerator>
          </DialogButton>
        </div>
      </div>

      <div className="grid xl:grid-cols-12 py-3">
        <div className="col-span-5">
          <h1 className="text-xl">Select Theme:</h1>
          <div className="grid xl:grid-cols-3">{ThemePanels}</div>
        </div>
        <div className="col-span-3">
          <ThemeExample></ThemeExample>
        </div>
        <div className="col-span-4">
          <ThemeGenerator
            colours={colours}
            setColours={setColours}
            main_styles={main_styles}
          ></ThemeGenerator>
        </div>
      </div>
    </div>
  );
}
