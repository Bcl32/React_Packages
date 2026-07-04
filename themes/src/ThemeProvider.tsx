import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Themes from "./themes.json";
import { isLightTheme } from "./themeMeta";

export type Theme = keyof typeof Themes | "system";
type ThemeType = "light" | "dark";

interface ThemeProviderState {
  theme: Theme;
  theme_options: string[];
  theme_type: ThemeType;
  setTheme: (theme: string) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
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
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  // Resolve "system" once, before both the attribute write and the type
  // classification — so theme_type can never disagree with the data-theme
  // attribute actually applied to <html>.
  const resolvedTheme: string =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const theme_options = Object.keys(Themes);
  const theme_type: ThemeType = isLightTheme(resolvedTheme) ? "light" : "dark";

  const value: ThemeProviderState = {
    theme,
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
