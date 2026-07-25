import { useState, useEffect } from "react";

import { ColourConverter } from "./ColourConverter";
import { hslToObject, type HSLColor } from "./colorUtils";

import { useTheme } from "./ThemeProvider";
import { ThemeGenerator, type ThemeColorConfig } from "./ThemeGenerator";
import { ThemePanel } from "./ThemePanel";
import { ThemeExample } from "./ThemeExample";
import { CopyTheme } from "./CopyTheme";
import { ImportTheme } from "./ImportTheme";
import {
  readOverrides,
  writeOverrides,
  clearOverrides,
  hasOverrides,
  applyResolvedTheme,
  formatTokenValue,
} from "./themeOverrides";

import { Button } from "@bcl32/utils/Button";
import { DialogButton } from "@bcl32/utils/DialogButton";

// styling data
import Themes from "./themes.json";

type ThemeRecord = Record<string, string>;
type ThemesType = Record<string, ThemeRecord>;

const TypedThemes = Themes as ThemesType;

/** Base palette straight from themes.json for a resolved theme name. */
function getBaseColours(themeName: string): Record<string, HSLColor> {
  const base: Record<string, HSLColor> = {};
  for (const [key, value] of Object.entries(TypedThemes[themeName] ?? {})) {
    const parsed = hslToObject(value);
    if (parsed) base[key] = parsed;
  }
  return base;
}

/** Base palette merged with the user's saved overrides — what is actually rendered. */
function getEffectiveColours(themeName: string): Record<string, ThemeColorConfig> {
  const merged = getBaseColours(themeName);
  for (const [key, value] of Object.entries(readOverrides(themeName))) {
    const parsed = hslToObject(`hsl(${value})`);
    if (parsed) merged[key] = parsed;
  }
  return merged as Record<string, ThemeColorConfig>;
}

export function Theming() {
  const { theme_options, resolved_theme } = useTheme();

  const [colours, setColours] = useState<Record<string, ThemeColorConfig>>(() =>
    getEffectiveColours(resolved_theme)
  );
  const [dirty, setDirty] = useState(false);
  const [customized, setCustomized] = useState(() => hasOverrides(resolved_theme));

  // Theme switched: ThemeProvider has already reset the DOM (stylesheet base +
  // that theme's saved overrides). Re-sync editing state to match; unsaved
  // edits from the previous theme are intentionally discarded.
  useEffect(() => {
    setColours(getEffectiveColours(resolved_theme));
    setDirty(false);
    setCustomized(hasOverrides(resolved_theme));
  }, [resolved_theme]);

  // Persist the diff between `next` and the base palette as this theme's
  // overrides, then normalize inline variables to exactly that diff.
  const persistColours = (next: Record<string, ThemeColorConfig>) => {
    const base = getBaseColours(resolved_theme);
    const diff: Record<string, string> = {};
    for (const [name, config] of Object.entries(next)) {
      const value = formatTokenValue(config);
      const baseValue = base[name] ? formatTokenValue(base[name]) : null;
      if (value !== baseValue) diff[name] = value;
    }
    writeOverrides(resolved_theme, diff);
    applyResolvedTheme(resolved_theme);
    setDirty(false);
    setCustomized(Object.keys(diff).length > 0);
  };

  const saveOverrides = () => persistColours(colours);

  // Imported tokens are applied and saved immediately — importing is an
  // explicit action, unlike incremental slider edits.
  const importTheme = (tokens: Record<string, HSLColor>) => {
    const merged = { ...colours, ...tokens } as Record<string, ThemeColorConfig>;
    setColours(merged);
    persistColours(merged);
  };

  const resetToDefault = () => {
    clearOverrides(resolved_theme);
    applyResolvedTheme(resolved_theme);
    setColours(getEffectiveColours(resolved_theme));
    setDirty(false);
    setCustomized(false);
  };

  // Card palette for a theme: base values with saved overrides merged in —
  // and for the active theme, the live editing state (incl. unsaved edits),
  // so the cards always show what selecting each theme would actually look like.
  const getPanelStyles = (themeName: string): ThemeRecord => {
    if (themeName === resolved_theme) {
      const live: ThemeRecord = {};
      for (const [key, config] of Object.entries(colours)) {
        live[key] = `hsl(${formatTokenValue(config)})`;
      }
      return { ...TypedThemes[themeName], ...live };
    }
    const merged: ThemeRecord = { ...(TypedThemes[themeName] ?? {}) };
    for (const [key, value] of Object.entries(readOverrides(themeName))) {
      merged[key] = `hsl(${value})`;
    }
    return merged;
  };

  const ThemePanels = theme_options.map((themeOption) => {
    return (
      <ThemePanel
        key={themeOption}
        name={themeOption}
        styles={getPanelStyles(themeOption) as unknown as import("./ThemePanel").ThemeStyles}
      />
    );
  });

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
      <div className="flex items-center justify-center gap-3">
        <h2 className="text-xl text-center">
          Active Theme: <span className="capitalize">{resolved_theme}</span>
          {customized && (
            <span className="ml-2 text-sm text-muted-foreground">(customized)</span>
          )}
        </h2>

        <DialogButton
          button={
            <Button variant="default" size="sm">
              Edit
            </Button>
          }
          size="large"
          title="Edit Theme"
        >
          <div className="space-y-4">
            <ThemeGenerator
              colours={colours}
              setColours={setColours}
              onEdited={() => setDirty(true)}
            />

            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="blue" onClick={saveOverrides} disabled={!dirty}>
                Save
              </Button>
              <Button
                variant="outline"
                onClick={resetToDefault}
                disabled={!dirty && !customized}
              >
                Reset to Default
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Saved changes persist in this browser and re-apply on reload.
              Unsaved edits are lost when you switch themes or reload.
            </p>
          </div>
        </DialogButton>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">{ThemePanels}</div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <CopyTheme currentTheme={resolved_theme} colours={colours} />

        <ImportTheme onImport={importTheme} />

        <ColourConverter />
      </div>

      <ThemeExample />
    </div>
  );
}
