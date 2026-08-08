import type { LucideIcon } from "lucide-react";
import type { CommandEntry, SearchSource, ShortcutNode } from "./types";

// Statically replaced by the consuming bundler (Vite replaces the whole member
// expression), so no `process` reference survives into the browser.
declare const process: { env: { NODE_ENV?: string } };

/** How long a key sequence stays "live" before the buffer resets. */
export const SEQUENCE_TIMEOUT_MS = 1000;

/** Only these aliases can be typed as a sequence; anything else stays palette-only. */
const TRIE_ALIAS = /^[a-z0-9]+$/;

export type TrieAction =
  | { kind: "command"; entry: CommandEntry }
  | { kind: "source"; source: SearchSource }
  | { kind: "node"; node: ShortcutNode };

export interface TrieNode {
  /** Single [a-z0-9] key at this level; "" for the root. */
  key: string;
  label: string;
  icon?: LucideIcon;
  /** Insertion order is display order. */
  children: Map<string, TrieNode>;
  /** Set on leaves AND on ambiguous exact+prefix nodes (alias "gd" with "gdx" also declared). */
  action?: TrieAction;
}

export interface BuildShortcutTrieOptions {
  commands: CommandEntry[];
  searchSources: SearchSource[];
  /** Explicit branches merged into the root after the alias-derived ones. */
  shortcutTrees: ShortcutNode[];
  /** Labels for interior nodes, keyed by the full prefix leading to them. */
  prefixLabels: Record<string, string>;
}

/** What each accepted sequence declared, for the dev-only warnings below. */
interface Declared {
  path: string;
  label: string;
}

/**
 * Build the key-sequence trie. Search sources are inserted first so they win a
 * collision, matching the Tab handler's source-before-command precedence; a
 * collision is a configuration bug and is warned about in dev.
 */
export function buildShortcutTrie({
  commands,
  searchSources,
  shortcutTrees,
  prefixLabels,
}: BuildShortcutTrieOptions): TrieNode {
  const root: TrieNode = { key: "", label: "", children: new Map() };
  const declared: Declared[] = [];

  /** Walks/creates the nodes for `path`, labelling interiors from prefixLabels. */
  const descend = (path: string): TrieNode => {
    let node = root;
    let prefix = "";
    for (const char of path) {
      prefix += char;
      let child = node.children.get(char);
      if (!child) {
        child = { key: char, label: prefixLabels[prefix] ?? char, children: new Map() };
        node.children.set(char, child);
      }
      node = child;
    }
    return node;
  };

  const attach = (path: string, label: string, icon: LucideIcon | undefined, action: TrieAction) => {
    if (!TRIE_ALIAS.test(path)) return;
    const node = descend(path);
    if (node.action) {
      if (process.env.NODE_ENV !== "production") {
        const previous = declared.find((d) => d.path === path);
        console.warn(
          `[command-palette] duplicate alias "${path}": "${previous?.label ?? node.label}" and ` +
            `"${label}". Only the first one is reachable.`
        );
      }
      return;
    }
    node.action = action;
    // A prefixLabels entry describes the whole branch, so it outranks the leaf
    // label on a node that is both a target and a menu.
    if (prefixLabels[path] === undefined) node.label = label;
    if (icon && !node.icon) node.icon = icon;
    declared.push({ path, label });
  };

  for (const source of searchSources) {
    const alias = source.alias?.toLowerCase();
    if (alias) attach(alias, `Search ${source.label}…`, source.icon, { kind: "source", source });
  }
  for (const entry of commands) {
    const alias = entry.alias?.toLowerCase();
    if (alias) attach(alias, entry.label, entry.icon, { kind: "command", entry });
  }

  const mergeTree = (node: ShortcutNode, prefix: string) => {
    const key = node.key.toLowerCase();
    const path = prefix + key;
    if (!TRIE_ALIAS.test(path)) return;
    if (node.children?.length) {
      const branch = descend(path);
      // A node that already carries an action keeps its own label (first wins).
      if (prefixLabels[path] === undefined && !branch.action) branch.label = node.label;
      if (node.icon && !branch.icon) branch.icon = node.icon;
      for (const child of node.children) mergeTree(child, path);
      return;
    }
    attach(path, node.label, node.icon, { kind: "node", node });
  };
  for (const tree of shortcutTrees) mergeTree(tree, "");

  if (process.env.NODE_ENV !== "production") {
    for (const short of declared) {
      for (const long of declared) {
        if (long.path.length > short.path.length && long.path.startsWith(short.path)) {
          console.warn(
            `[command-palette] alias prefix conflict: "${short.path}" ("${short.label}") is a prefix of ` +
              `"${long.path}" ("${long.label}"), so "${short.path}" only fires after a ` +
              `${SEQUENCE_TIMEOUT_MS}ms pause.`
          );
        }
      }
    }
  }

  return root;
}
