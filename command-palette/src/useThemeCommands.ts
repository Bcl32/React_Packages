import { useMemo } from "react";
import { Palette } from "lucide-react";
import { useTheme } from "@bcl32/themes/ThemeProvider";
import type { CommandEntry } from "./types";

/**
 * Builds one command per available theme (plus "system").
 * Must be rendered inside a `ThemeProvider` (true in every app Layout).
 */
export function useThemeCommands(): CommandEntry[] {
  const { setTheme, theme_options } = useTheme();
  return useMemo(
    () =>
      [...theme_options, "system"].map((t) => ({
        id: `theme-${t}`,
        label: `Theme: ${t}`,
        group: "Theme",
        icon: Palette,
        keywords: ["theme", t],
        perform: () => setTheme(t),
      })),
    [setTheme, theme_options]
  );
}
