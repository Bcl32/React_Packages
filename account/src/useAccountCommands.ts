import { useMemo } from "react";
import { History, LogOut, UserRound } from "lucide-react";

// Type-only: `@bcl32/command-palette` is a devDependency, never bundled. An app
// that calls this hook already has the palette installed; one that does not
// never imports this module.
import type { CommandEntry } from "@bcl32/command-palette/types";

export interface UseAccountCommandsOptions {
  /** Opens the account panel (profile / preferences / activity). */
  openAccount?: () => void;
  /** Opens the activity view. Omit when the app has no separate activity page. */
  openActivity?: () => void;
  /** Sign-out target — e.g. `/cdn-cgi/access/logout`. */
  logoutUrl?: string;
  /** Group heading in the palette. Default "Account". */
  group?: string;
}

/**
 * Palette commands for the account surface.
 *
 * Deliberately alias-free, exactly like `useThemeCommands`: aliases are a
 * single per-app namespace that has to stay unique and same-length across every
 * command *and* search source, so only the consumer can assign them safely.
 * Post-map the returned entries if the app wants hotkeys.
 *
 * Every entry is opt-in — an option left undefined produces no command, so a
 * consumer wires up only the surfaces it actually has.
 */
export function useAccountCommands(opts: UseAccountCommandsOptions = {}): CommandEntry[] {
  const { openAccount, openActivity, logoutUrl, group = "Account" } = opts;

  return useMemo(() => {
    const entries: CommandEntry[] = [];

    if (openAccount) {
      entries.push({
        id: "account-open",
        label: "Profile & Settings",
        group,
        icon: UserRound,
        keywords: ["account", "profile", "settings", "preferences", "user"],
        perform: openAccount,
      });
    }

    if (openActivity) {
      entries.push({
        id: "account-activity",
        label: "Activity",
        group,
        icon: History,
        keywords: ["activity", "history", "audit", "recent"],
        perform: openActivity,
      });
    }

    if (logoutUrl) {
      entries.push({
        id: "account-sign-out",
        label: "Sign out",
        group,
        icon: LogOut,
        keywords: ["sign out", "log out", "logout"],
        // A full navigation, not a fetch — the identity provider owns the
        // session, so the browser has to go there to drop it.
        perform: () => {
          window.location.href = logoutUrl;
        },
      });
    }

    return entries;
  }, [openAccount, openActivity, logoutUrl, group]);
}
