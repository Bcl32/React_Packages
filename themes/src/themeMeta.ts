import Themes from "./themes.json";
import { hslToObject } from "./colorUtils";

/**
 * A theme is "light" when its background lightness is >= 50% — derived from
 * the palette itself so there is no hand-maintained allowlist to drift out
 * of sync with themes.json. Unknown names classify as dark (matches the old
 * hardcoded-list behaviour).
 */
export function isLightTheme(name: string): boolean {
  const theme = (Themes as Record<string, Record<string, string>>)[name];
  if (!theme?.background) return false;
  return (hslToObject(theme.background)?.lightness ?? 0) >= 50;
}

export const LIGHT_THEMES: string[] = Object.keys(Themes).filter(isLightTheme);
