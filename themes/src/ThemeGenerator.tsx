import { useState, type Dispatch, type SetStateAction } from "react";

import { Card } from "@bcl32/utils/Card";
import { SimpleDialog } from "@bcl32/utils";

import { ColourControls } from "./ColourControls";
import { hslToHex, type HSLColor } from "./colorUtils";

export interface ThemeColorConfig extends HSLColor {
  description?: string;
}

export interface ThemeGeneratorProps {
  colours: Record<string, ThemeColorConfig>;
  setColours: Dispatch<SetStateAction<Record<string, ThemeColorConfig>>>;
  main_styles: Record<string, ThemeColorConfig>;
}

export function ThemeGenerator({ colours, setColours, main_styles }: ThemeGeneratorProps) {
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [includeAlpha] = useState(false);

  const isValidColor = (config: ThemeColorConfig): boolean => {
    return (
      !isNaN(config.hue) &&
      !isNaN(config.saturation) &&
      !isNaN(config.lightness) &&
      !isNaN(config.alpha ?? 1)
    );
  };

  const updateCSSVariables = (themeColors: Record<string, ThemeColorConfig>) => {
    const style = document.documentElement.style;

    Object.entries(themeColors).forEach(([name, setting]) => {
      const alpha = setting.alpha ?? 1;
      const value = `${setting.hue} ${setting.saturation}% ${setting.lightness}%${
        includeAlpha && alpha < 1 ? ` / ${alpha * 100}%` : ""
      }`;
      style.setProperty(`--${name}`, value);
    });
  };

  const updateColor = (colorName: string, property: keyof HSLColor, value: number) => {
    setColours((prev) => {
      const newColors = {
        ...prev,
        [colorName]: { ...prev[colorName], [property]: value },
      };
      updateCSSVariables(newColors);
      return newColors;
    });
  };

  return (
    <div>
      <div className="container max-w-4xl mx-auto px-4">
        <div className="space-y-4">
          {/* Color Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(main_styles).map(([name, config]) => {
              const validColor = isValidColor(config);
              const alpha = config.alpha ?? 1;
              const backgroundColor = validColor
                ? `hsl(${config.hue}, ${config.saturation}%, ${
                    config.lightness
                  }%${includeAlpha && alpha < 1 ? ` / ${alpha * 100}%` : ""})`
                : "transparent";

              const hexValue = validColor
                ? hslToHex(
                    config.hue,
                    config.saturation,
                    config.lightness,
                    alpha
                  )
                : "N/A";

              // Determine text color based on background lightness
              const textColor =
                config.lightness > 50 ? "text-black" : "text-white";

              return (
                <Card
                  key={name}
                  className={`
          p-4
          flex
          flex-col
          items-center
          justify-center
          ${textColor}
          transition
          duration-500
          ease-in-out
          hover:scale-105
          hover:shadow-xl
          cursor-pointer
          active:scale-95
        `}
                  style={{ backgroundColor }}
                  onClick={() => setActiveColor(name)}
                >
                  <div className="text-center">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs font-bold">{hexValue}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Color Control Dialog */}
      <SimpleDialog
        open={activeColor !== null}
        onOpenChange={(open) => !open && setActiveColor(null)}
        isModal={true}
        title={activeColor ?? undefined}
      >
        {activeColor && (
          <div>
            <span>{colours[activeColor]["description"]}</span>

            <ColourControls
              color={{
                ...colours[activeColor],
                alpha: colours[activeColor].alpha ?? 1,
              }}
              onChange={(property, value) =>
                updateColor(activeColor, property, value)
              }
              onHexChange={() => {}}
            />
          </div>
        )}
      </SimpleDialog>
    </div>
  );
}
