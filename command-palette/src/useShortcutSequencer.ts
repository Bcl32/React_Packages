import * as React from "react";
import { SEQUENCE_TIMEOUT_MS } from "./shortcutTrie";
import type { TrieAction, TrieNode } from "./shortcutTrie";

/** Typing anywhere inside one of these never starts a global key sequence. */
export const ALIAS_IGNORE_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]';

/** How the current sequence was started; `null` means idle. */
export type SequenceActivation = "typed" | "leader";

export interface SequencerState {
  /** Typed prefix, "" when idle. */
  path: string;
  /** Trie node for `path` (the root node when path === ""). */
  node: TrieNode;
  /** What activated the UI: typed prefix, leader key, or nothing. */
  activation: SequenceActivation | null;
}

export interface SequencerControls {
  reset: () => void;
  /** Programmatic equivalent of typing `key`, for clickable renderers. */
  enterKey: (key: string) => void;
  popLevel: () => void;
  /** activation="leader" at the current path (root when idle). */
  openLeader: () => void;
}

export interface UseShortcutSequencerOptions {
  trie: TrieNode;
  /** Master enable for typed sequences (the palette's enableGlobalAliases). */
  enableTyped: boolean;
  leaderKey?: string;
  /** While true (palette or other modal open) the sequencer ignores all keys. */
  suspended: boolean;
  /** True when hints are rendered for the current state — disables the silent prefix expiry. */
  hintsVisible: boolean;
  run: (action: TrieAction) => void;
}

interface InternalState {
  path: string;
  activation: SequenceActivation | null;
}

const IDLE: InternalState = { path: "", activation: null };

function walkTrie(root: TrieNode, path: string): TrieNode | undefined {
  let node: TrieNode | undefined = root;
  for (const char of path) {
    node = node.children.get(char);
    if (!node) return undefined;
  }
  return node;
}

/**
 * Global key-sequence engine: `g` `d` navigates, `.` opens the leader menu.
 * The window listener is registered once and reads everything through refs, so
 * it never re-subscribes per keystroke.
 */
export function useShortcutSequencer({
  trie,
  enableTyped,
  leaderKey,
  suspended,
  hintsVisible,
  run,
}: UseShortcutSequencerOptions): SequencerState & SequencerControls {
  const [state, setState] = React.useState<InternalState>(IDLE);

  const stateRef = React.useRef(state);
  const trieRef = React.useRef(trie);
  const enableTypedRef = React.useRef(enableTyped);
  const leaderKeyRef = React.useRef(leaderKey);
  const suspendedRef = React.useRef(suspended);
  const hintsVisibleRef = React.useRef(hintsVisible);
  const runRef = React.useRef(run);
  React.useEffect(() => {
    trieRef.current = trie;
    enableTypedRef.current = enableTyped;
    leaderKeyRef.current = leaderKey;
    suspendedRef.current = suspended;
    hintsVisibleRef.current = hintsVisible;
    runRef.current = run;
  });

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Written from event handlers only, so the ref stays in sync synchronously
  // and a re-entrant handler never reads a stale path.
  const commit = React.useCallback((next: InternalState) => {
    if (stateRef.current.path === next.path && stateRef.current.activation === next.activation) {
      return;
    }
    stateRef.current = next;
    setState(next);
  }, []);

  const reset = React.useCallback(() => {
    clearTimer();
    commit(IDLE);
  }, [clearTimer, commit]);

  /** The sequence always expires after the timeout; `action` also runs then. */
  const armTimer = React.useCallback(
    (action: TrieAction | null) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        commit(IDLE);
        if (action) runRef.current(action);
      }, SEQUENCE_TIMEOUT_MS);
    },
    [clearTimer, commit]
  );

  const advance = React.useCallback(
    (rawKey: string, e: KeyboardEvent | null) => {
      const key = rawKey.toLowerCase();
      if (!/^[a-z0-9]$/.test(key)) return;
      const leader = stateRef.current.activation === "leader";

      const step = (candidate: string, allowRetest: boolean) => {
        const target = walkTrie(trieRef.current, candidate);
        // Unambiguous hit: fire now. The firing key must be swallowed — a
        // source alias focuses the palette input during this same keydown, so
        // without preventDefault the character leaks into the fresh input.
        if (target?.action && target.children.size === 0) {
          e?.preventDefault();
          clearTimer();
          commit(IDLE);
          runRef.current(target.action);
          return;
        }
        // Hit, but a longer sequence shares the prefix: wait for
        // disambiguation. In the leader menu the continuations are on screen,
        // so nothing auto-fires behind the user's back.
        if (target?.action) {
          clearTimer();
          commit({ path: candidate, activation: leader ? "leader" : "typed" });
          if (!leader) armTimer(target.action);
          return;
        }
        // Still a live prefix: keep accumulating. The silent expiry only
        // applies while the prefix is invisible — a rendered hint surface
        // waits for Escape, a dead key, or resolution.
        if (target) {
          clearTimer();
          commit({ path: candidate, activation: leader ? "leader" : "typed" });
          if (!leader && !hintsVisibleRef.current) armTimer(null);
          return;
        }
        // Dead end: restart the sequence from the key just typed, once.
        if (allowRetest && candidate.length > 1) {
          clearTimer();
          step(key, false);
          return;
        }
        reset();
      };

      step(stateRef.current.path + key, true);
    },
    [armTimer, clearTimer, commit, reset]
  );

  const enterKey = React.useCallback((key: string) => advance(key, null), [advance]);

  const popLevel = React.useCallback(() => {
    const { path, activation } = stateRef.current;
    clearTimer();
    // A typed sequence with an empty path is idle, so popping the last key ends it.
    if (!path || (path.length === 1 && activation !== "leader")) {
      commit(IDLE);
      return;
    }
    commit({ path: path.slice(0, -1), activation });
  }, [clearTimer, commit]);

  const openLeader = React.useCallback(() => {
    clearTimer();
    commit({ path: stateRef.current.path, activation: "leader" });
  }, [clearTimer, commit]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (suspendedRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return;
      const { activation } = stateRef.current;
      const target = e.target as HTMLElement | null;
      // The leader menu is itself a dialog, which ALIAS_IGNORE_SELECTOR
      // matches — once it is open its keys must still reach the sequencer.
      if (
        activation !== "leader" &&
        target &&
        typeof target.closest === "function" &&
        target.closest(ALIAS_IGNORE_SELECTOR)
      ) {
        return;
      }
      if (e.key === "Escape") {
        reset();
        return;
      }
      if (activation === "leader" && e.key === "Backspace") {
        e.preventDefault();
        popLevel();
        return;
      }
      // Case-sensitive: the leader key is a literal character, not a letter.
      if (leaderKeyRef.current && e.key === leaderKeyRef.current) {
        e.preventDefault();
        openLeader();
        return;
      }
      if (!/^[a-z0-9]$/i.test(e.key)) return;
      if (!enableTypedRef.current && activation !== "leader") return;
      // Nothing leaks to the page while the leader menu is open.
      if (activation === "leader") e.preventDefault();
      advance(e.key, e);
    };

    // A click elsewhere abandons an invisible sequence, so no hint gets stuck.
    const onMouseDown = () => {
      if (stateRef.current.activation === "typed") reset();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
      clearTimer();
    };
  }, [advance, clearTimer, openLeader, popLevel, reset]);

  const node = React.useMemo(() => walkTrie(trie, state.path) ?? trie, [trie, state.path]);

  return { path: state.path, node, activation: state.activation, reset, enterKey, popLevel, openLeader };
}
