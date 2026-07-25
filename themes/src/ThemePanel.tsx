import { Check } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export interface ThemeStyles {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  border: string;
  [key: string]: string;
}

export interface ThemePanelProps {
  name: string;
  styles: ThemeStyles;
}

export function ThemePanel({ name, styles }: ThemePanelProps) {
  const { setTheme, resolved_theme } = useTheme();
  const isActive = resolved_theme === name;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      className={`group cursor-pointer overflow-hidden rounded-lg border shadow-sm transition duration-300 ease-in-out hover:scale-105 hover:shadow-xl ${
        isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
      style={{
        backgroundColor: styles["background"],
        borderColor: styles["border"],
      }}
      onClick={() => setTheme(name)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setTheme(name);
        }
      }}
    >
      {/* Name strip */}
      <div
        className="flex items-center justify-center gap-1 border-b py-1.5"
        style={{ borderColor: styles["border"], color: styles["foreground"] }}
      >
        {isActive && <Check className="h-4 w-4" />}
        <p className="text-base capitalize font-semibold">{name}</p>
      </div>

      {/* Miniature app preview: sidebar strip + main card area */}
      <div className="p-2">
        <div
          className="flex overflow-hidden rounded-md border"
          style={{ borderColor: styles["border"] }}
        >
          {/* Mini sidebar: sidebar-* tokens */}
          <div
            className="w-1/3 shrink-0 space-y-1 border-r p-1"
            style={{
              backgroundColor: styles["sidebar-background"],
              borderColor: styles["sidebar-border"] ?? styles["border"],
            }}
          >
            <div
              className="h-2.5 w-full rounded-sm"
              style={{ backgroundColor: styles["sidebar-primary"] }}
            />
            <div
              className="h-2 w-5/6 rounded-sm opacity-70"
              style={{ backgroundColor: styles["sidebar-foreground"] }}
            />
            <div
              className="h-2 w-5/6 rounded-sm opacity-70"
              style={{ backgroundColor: styles["sidebar-foreground"] }}
            />
            <div
              className="h-2 w-4/6 rounded-sm"
              style={{ backgroundColor: styles["sidebar-accent"] }}
            />
          </div>

          {/* Mini main area: page background holding donut, card and button */}
          <div
            className="min-w-0 flex-1 space-y-1 p-1.5"
            style={{ backgroundColor: styles["background"] }}
          >
            <div className="flex items-center justify-between gap-1">
              {/* Page title bar */}
              <div
                className="h-1.5 w-2/5 rounded-full"
                style={{ backgroundColor: styles["foreground"] }}
              />

              {/* Mini donut chart: chart-1..5 in this theme's palette */}
              <div
                className="relative h-5 w-5 rounded-full"
                aria-hidden="true"
                style={{
                  background: `conic-gradient(${styles["chart-1"]} 0% 30%, ${styles["chart-2"]} 30% 55%, ${styles["chart-3"]} 55% 75%, ${styles["chart-4"]} 75% 90%, ${styles["chart-5"]} 90% 100%)`,
                }}
              >
                <div
                  className="absolute inset-1 rounded-full"
                  style={{ backgroundColor: styles["background"] }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Mini card holding the muted text sample */}
              <div
                className="min-w-0 flex-1 overflow-hidden rounded border px-1 py-0.5"
                style={{
                  backgroundColor: styles["card"],
                  borderColor: styles["border"],
                }}
              >
                <p
                  className="whitespace-nowrap text-[10px] leading-tight"
                  style={{ color: styles["muted-foreground"] ?? styles["foreground"] }}
                >
                  Text
                </p>
              </div>

              {/* Mini button */}
              <span
                className="inline-block shrink-0 whitespace-nowrap rounded px-1 text-[10px] font-medium leading-4"
                style={{
                  backgroundColor: styles["primary"],
                  color: styles["primary-foreground"],
                }}
              >
                Button
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
