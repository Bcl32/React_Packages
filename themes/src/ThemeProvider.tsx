import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Themes from "./themes.json";
import { isLightTheme } from "./themeMeta";
import { applyResolvedTheme } from "./themeOverrides";

export type Theme = keyof typeof Themes | "system";
type ThemeType = "light" | "dark";

interface ThemeProviderState {
  theme: Theme;
  /** theme with "system" translated to the light/dark palette actually applied */
  resolved_theme: string;
  theme_options: string[];
  theme_type: ThemeType;
  setTheme: (theme: string) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  resolved_theme: "light",
  theme_options: [],
  theme_type: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

// site is initialized with system settings, so a light theme or a dark theme is applied based on system preferences
// once a custom theme has been chosen, it will be saved locally and remembered for the next time the page is loaded
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // A persisted name can outlive the preset it points at (a theme removed from
  // themes.json). An unknown name matches no tw-colors selector, so the palette
  // would silently fall back to the :root default while theme_type still
  // classified the dead name — drop it and use the default instead.
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "system" || (stored && stored in Themes)) return stored as Theme;
    return defaultTheme;
  });

  const [systemDark, setSystemDark] = useState<boolean>(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Track OS light/dark flips so "system" follows them live
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Resolve "system" once, before both the attribute write and the type
  // classification — so theme_type can never disagree with the data-theme
  // attribute actually applied to <html>.
  const resolvedTheme: string =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    // Clear any inline token variables and re-apply this theme's saved
    // overrides — the stylesheet is the base, inline vars are the user's diff.
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  const theme_options = Object.keys(Themes);
  const theme_type: ThemeType = isLightTheme(resolvedTheme) ? "light" : "dark";

  const value: ThemeProviderState = {
    theme,
    resolved_theme: resolvedTheme,
    theme_options,
    theme_type,
    setTheme: (newTheme: string) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme as Theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = (): ThemeProviderState => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
