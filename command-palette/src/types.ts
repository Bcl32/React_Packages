import type { LucideIcon } from "lucide-react";

export interface CommandEntry {
  /** Unique, stable id — used as the cmdk item value. Convention: "nav:/Route" or "theme-dark". */
  id: string;
  label: string;
  /** Group heading shown in the list, e.g. "Navigation", "Theme". Insertion order preserved. */
  group: string;
  icon?: LucideIcon;
  keywords?: string[];
  /**
   * Short lowercase hotkey token (`[a-z0-9]{1,4}`), e.g. "gd".
   * Two consumers: typing it as the first input token + `Tab` at the palette
   * root runs this entry, and typing it as a key sequence while the palette is
   * closed fires it globally. Also appended to the cmdk keywords and rendered
   * as a `<kbd>` badge. Must be unique across all commands AND search sources.
   */
  alias?: string;
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
  /**
   * Short lowercase hotkey token (`[a-z0-9]{1,4}`), e.g. "sp".
   * At the palette root, `<alias> <rest>` + `Tab` opens this search page seeded
   * with `<rest>`. While the palette is closed, typing the token as a key
   * sequence opens the palette straight onto this page. Also appended to the
   * cmdk keywords and rendered as a `<kbd>` badge. Must be unique across all
   * search sources AND commands.
   */
  alias?: string;
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
  /** Return an image URL to show as the row's thumbnail, or undefined for no thumbnail. */
  getThumbnail?: (item: any) => string | undefined;
}
