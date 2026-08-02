import type { LucideIcon } from "lucide-react";

export interface CommandEntry {
  /** Unique, stable id — used as the cmdk item value. Convention: "nav:/Route" or "theme-dark". */
  id: string;
  label: string;
  /** Group heading shown in the list, e.g. "Navigation", "Theme". Insertion order preserved. */
  group: string;
  icon?: LucideIcon;
  keywords?: string[];
  /** Router path to navigate to on select. */
  to?: string;
  /** Custom action; takes precedence over `to`. */
  perform?: () => void;
}

export interface SearchSource {
  /** Unique page key, e.g. "parts". */
  key: string;
  /** Human label — the root item reads "Search {label}…". */
  label: string;
  icon?: LucideIcon;
  /** Absolute API list URL WITHOUT query string, e.g. apiUrl("parts"). */
  listUrl: string;
  /** "server" (default): appends ?search=term, debounced. "client": fetch once, cmdk filters. */
  mode?: "server" | "client";
  /** Server mode: min chars before querying. Default 2 (client mode: 0). */
  minChars?: number;
  /** Cap on rendered rows. Default 50 — list endpoints are unbounded, always cap. */
  maxResults?: number;
  getLabel: (item: any) => string;
  getDescription?: (item: any) => string | undefined;
  getRoute: (item: any) => string;
}
