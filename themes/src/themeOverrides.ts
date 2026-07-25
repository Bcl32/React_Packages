import Themes from "./themes.json";

const STORAGE_KEY = "bcl32-theme-overrides";

/** theme name -> token name -> "h s% l%" (tw-colors CSS variable format) */
export type ThemeOverrides = Record<string, Record<string, string>>;

export function readAllOverrides(): ThemeOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ThemeOverrides) : {};
  } catch {
    // corrupted storage — treat as no overrides rather than crashing the app
    return {};
  }
}

export function readOverrides(theme: string): Record<string, string> {
  return readAllOverrides()[theme] ?? {};
}

export function writeOverrides(theme: string, overrides: Record<string, string>): void {
  const all = readAllOverrides();
  if (Object.keys(overrides).length === 0) {
    delete all[theme];
  } else {
    all[theme] = overrides;
  }
  if (Object.keys(all).length === 0) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}

export function clearOverrides(theme: string): void {
  writeOverrides(theme, {});
}

export function hasOverrides(theme: string): boolean {
  return Object.keys(readOverrides(theme)).length > 0;
}

export function formatTokenValue(c: { hue: number; saturation: number; lightness: number }): string {
  return `${c.hue} ${c.saturation}% ${c.lightness}%`;
}

/**
 * Sync the DOM with a resolved theme. The data-theme stylesheet supplies the
 * base palette; inline CSS variables on <html> are reserved for saved user
 * overrides only. Every known token is cleared first so the stylesheet wins
 * again after an editing session pinned values inline — clearing uses the
 * union of tokens across all themes, so switching also unsets tokens the new
 * theme doesn't define.
 */
export function applyResolvedTheme(resolvedTheme: string): void {
  const style = document.documentElement.style;
  const themes = Themes as Record<string, Record<string, string>>;

  const tokens = new Set<string>();
  for (const palette of Object.values(themes)) {
    for (const token of Object.keys(palette)) tokens.add(token);
  }
  tokens.forEach((token) => style.removeProperty(`--${token}`));

  for (const [name, value] of Object.entries(readOverrides(resolvedTheme))) {
    style.setProperty(`--${name}`, value);
  }
}
