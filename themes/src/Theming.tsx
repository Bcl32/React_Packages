import { useState, useEffect } from "react";

import { ColourConverter } from "./ColourConverter";
import { hslToObject, type HSLColor } from "./colorUtils";

import { useTheme } from "./ThemeProvider";
import { ThemeGenerator, type ThemeColorConfig } from "./ThemeGenerator";
import { ThemePanel } from "./ThemePanel";
import { ThemeExample } from "./ThemeExample";
import { CopyTheme } from "./CopyTheme";

import { Button } from "@bcl32/utils/Button";
import { DialogButton } from "@bcl32/utils/DialogButton";

// styling data
import Themes from "./themes.json";
import style_metadata from "./style_metadata.json";

type ThemeRecord = Record<string, string>;
type ThemesType = Record<string, ThemeRecord>;
type StyleMetadataType = Record<string, { group: string; description: string }>;

const TypedThemes = Themes as ThemesType;
const TypedStyleMetadata = style_metadata as StyleMetadataType;

export function Theming() {
  const { theme, theme_options } = useTheme();

  const get_theme_values = (currentTheme: string): Record<string, HSLColor | null> => {
    // the very first time a user visits, the theme will be 'system' so it needs to be translated to the light or dark theme applied in the themeprovider, otherwise the Theme object has no key of 'system'
    let resolvedTheme = currentTheme;
    if (currentTheme === "system") {
      resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    const initial_colours: Record<string, HSLColor | null> = {};
    const themeValues = TypedThemes[resolvedTheme];
    if (themeValues) {
      for (const [key, value] of Object.entries(themeValues)) {
        initial_colours[key] = hslToObject(value);
      }
    }
    return initial_colours;
  };

  const theme_colours = get_theme_values(theme);
  const [colours, setColours] = useState<Record<string, ThemeColorConfig>>(
    theme_colours as Record<string, ThemeColorConfig>
  );

  const main_styles: Record<string, ThemeColorConfig> = {};
  for (const [key, value] of Object.entries(TypedStyleMetadata)) {
    if (value["group"] === "main") {
      main_styles[key] = {} as ThemeColorConfig;
      main_styles[key] = colours[key];
      if (main_styles[key]) {
        main_styles[key]["description"] = value["description"];
      }
    }
  }

  function updateCSSVariables(themeColors: Record<string, HSLColor | null>, includeAlpha = false) {
    const style = document.documentElement.style;

    Object.entries(themeColors).forEach(([name, setting]) => {
      if (!setting) return;
      const alpha = setting.alpha ?? 1;
      const value = `${setting.hue} ${setting.saturation}% ${setting.lightness}%${
        includeAlpha && alpha < 1 ? ` / ${alpha * 100}%` : ""
      }`;
      style.setProperty(`--${name}`, value);
    });
  }

  useEffect(() => {
    const newThemeColours = get_theme_values(theme);
    updateCSSVariables(newThemeColours);
    setColours(newThemeColours as Record<string, ThemeColorConfig>);
  }, [theme]);

  const ThemePanels = theme_options.map((themeOption) => {
    return (
      <ThemePanel
        key={themeOption}
        name={themeOption}
        styles={TypedThemes[themeOption] as unknown as import("./ThemePanel").ThemeStyles}
      />
    );
  });

  return (
    <div>
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <h1 className="text-3xl">Active Theme: {theme}</h1>

          {/* Control Buttons */}
          <CopyTheme currentTheme={theme} colours={colours} />

          <ColourConverter />

          <DialogButton
            button={<Button variant="default">Edit Styles</Button>}
            title="Edit Styles"
          >
            <ThemeGenerator
              colours={colours}
              setColours={setColours}
              main_styles={main_styles}
            />
          </DialogButton>
        </div>
      </div>

      <div className="grid xl:grid-cols-12 py-3">
        <div className="col-span-5">
          <h1 className="text-xl">Select Theme:</h1>
          <div className="grid xl:grid-cols-3">{ThemePanels}</div>
        </div>
        <div className="col-span-3">
          <ThemeExample />
        </div>
        <div className="col-span-4">
          <ThemeGenerator
            colours={colours}
            setColours={setColours}
            main_styles={main_styles}
          />
        </div>
      </div>
    </div>
  );
}
