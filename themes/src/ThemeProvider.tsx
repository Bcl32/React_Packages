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
  /**
   * Server-safe mode for pages rendered ahead of time (SSR, prerender). The
   * first render reads nothing from localStorage or matchMedia: it uses
   * `defaultTheme`, with "system" taken as light, so the server's markup and
   * the browser's first render agree. The stored theme and the OS preference
   * are read in an effect after mount, and `data-theme` is not written until
   * then, so a pre-paint script that set it stays in charge of the first
   * paint. Default false: the theme is read synchronously, as it always was.
   */
  gated?: boolean;
}

// A persisted name can outlive the preset it points at (a theme removed from
// themes.json). An unknown name matches no tw-colors selector, so the palette
// would silently fall back to the :root default while theme_type still
// classified the dead name — drop it and use the default instead.
function readStoredTheme(storageKey: string, defaultTheme: Theme): Theme {
  const stored = localStorage.getItem(storageKey);
  if (stored === "system" || (stored && stored in Themes)) return stored as Theme;
  return defaultTheme;
}

function readSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// site is initialized with system settings, so a light theme or a dark theme is applied based on system preferences
// once a custom theme has been chosen, it will be saved locally and remembered for the next time the page is loaded
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  gated = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() =>
    gated ? defaultTheme : readStoredTheme(storageKey, defaultTheme)
  );

  const [systemDark, setSystemDark] = useState<boolean>(() => (gated ? false : readSystemDark()));

  // Gated: nothing has been read yet. Read once after mount; the attribute
  // effect below waits for it.
  const [ready, setReady] = useState<boolean>(!gated);
  useEffect(() => {
    if (!gated) return;
    setTheme(readStoredTheme(storageKey, defaultTheme));
    setSystemDark(readSystemDark());
    setReady(true);
    // Mount only: a later prop change must not re-read storage over a choice.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!ready) return;
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    // Clear any inline token variables and re-apply this theme's saved
    // overrides — the stylesheet is the base, inline vars are the user's diff.
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme, ready]);

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
