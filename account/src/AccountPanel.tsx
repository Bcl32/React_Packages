import React from "react";

import { AnimatedTabs, TabContent } from "@bcl32/utils/AnimatedTabs";
import { Button } from "@bcl32/utils/Button";
import { cn } from "@bcl32/utils/cn";
import { Input } from "@bcl32/utils/Input";
import { Label } from "@bcl32/utils/Label";

import { ActivityFeed } from "./ActivityFeed";
import { Avatar } from "./Avatar";
import { useCurrentUser } from "./UserProvider";

/**
 * The body height every account-surface dialog wears.
 *
 * A dialog's shape is part of its identity, so the box must not resize in
 * response to its own content: `SimpleDialog` pins the width via its `size`
 * variant, and this pins the height. Every tab panel below is exactly this
 * tall and scrolls internally, so Profile (short) and Activity (long) render
 * the same rectangle. Apps that mount sibling account dialogs — a standalone
 * activity feed, the theme editor — give those bodies the same height, so
 * switching *between* dialogs is as still as switching between tabs.
 *
 * 28rem is tall enough that the long tabs show real content, and short enough
 * that the whole dialog — this, plus `SimpleDialog`'s `p-8` and its title row —
 * still clears a short laptop viewport without hitting the modal's own
 * `max-h-[calc(100vh-4rem)]` cap, which would put the jump right back.
 *
 * See `react-packages/docs/02-INTEROP.md` §6 — Dialog design conventions.
 */
export const ACCOUNT_DIALOG_BODY_HEIGHT = "h-[28rem]";

export interface AccountPanelProps {
  /**
   * Absolute URL of `GET /activity` (`apiUrl("activity")`). Omit to drop the
   * Activity tab entirely — the panel never invents endpoints.
   */
  activityUrl?: string;
  /** Rows in the Activity tab. Default 20. */
  activityPageSize?: number;
  /**
   * Scope the Activity tab to the signed-in user. Default `true` — this is the
   * *account* panel; the whole-house feed belongs on the dashboard.
   */
  activityOwnOnly?: boolean;
  /**
   * Verbs the Activity tab hides (`?exclude_verbs=`). Passed straight to
   * `ActivityFeed` — see its prop for why the API does the filtering.
   */
  activityExcludeVerbs?: string[];
  /** Body of the Preferences tab. Omit to drop that tab. */
  children?: React.ReactNode;
  preferencesLabel?: string;
  /**
   * Extra classes for every tab panel — this is where the fixed height lives.
   * Defaults to {@link ACCOUNT_DIALOG_BODY_HEIGHT}; pass another Tailwind
   * height and `cn` resolves the conflict in your favour. Outside a dialog,
   * `"h-auto"` hands the height back to the content.
   */
  panelClassName?: string;
  className?: string;
}

/**
 * Profile / Preferences / Activity, as tabs.
 *
 * Deliberately imports nothing from `@bcl32/datatable`, `@bcl32/charts` or any
 * dnd library: this panel is mounted from the sidebar, which every page has, so
 * anything it pulls in is eagerly bundled on first paint for the whole app.
 */
export function AccountPanel({
  activityUrl,
  activityPageSize = 20,
  activityOwnOnly = true,
  activityExcludeVerbs,
  children,
  preferencesLabel = "Preferences",
  panelClassName = ACCOUNT_DIALOG_BODY_HEIGHT,
  className,
}: AccountPanelProps) {
  const { user, updateMe, isUpdating, isLoading } = useCurrentUser();

  // One class string for every panel: the shape has to be identical whichever
  // tab is active, so the height cannot be decided per-tab.
  const panelClass = cn("overflow-y-auto p-4", panelClassName);

  const [draftName, setDraftName] = React.useState<string>("");
  const [savedName, setSavedName] = React.useState<string | null>(null);

  // Seed the field from the server value, and re-seed whenever the server
  // value changes underneath us (another tab renamed, the query refetched).
  const serverName = user?.display_name ?? "";
  React.useEffect(() => {
    setDraftName(serverName);
    setSavedName(null);
  }, [serverName, user?.id]);

  const dirty = user != null && draftName.trim() !== serverName.trim();

  const saveName = async () => {
    if (!dirty) return;
    const next = draftName.trim();
    const updated = await updateMe({ display_name: next === "" ? null : next });
    // `updateMe` resolves to null on failure — silent by contract, so the only
    // feedback is the absence of the confirmation.
    setSavedName(updated ? (updated.display_name ?? "") : null);
  };

  const tabTitles: string[] = ["Profile"];
  const panels: React.ReactNode[] = [
    <TabContent key="profile" className={panelClass}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : user ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar email={user.email} displayName={user.display_name} size="lg" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {user.display_name?.trim() || user.email}
              </div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-display-name">Display name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="account-display-name"
                value={draftName}
                placeholder={user.email}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                }}
              />
              <Button size="sm" disabled={!dirty || isUpdating} onClick={() => void saveName()}>
                {isUpdating ? "Saving…" : "Save"}
              </Button>
            </div>
            {savedName !== null ? (
              <p className="text-xs text-muted-foreground">Saved.</p>
            ) : null}
          </div>

          {user.provider ? (
            <p className="text-xs text-muted-foreground">
              Signed in via <span className="font-medium">{user.provider}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not signed in. Open this app through its public hostname to sign in.
        </p>
      )}
    </TabContent>,
  ];

  if (children !== undefined) {
    tabTitles.push(preferencesLabel);
    panels.push(
      <TabContent key="preferences" className={panelClass}>
        {children}
      </TabContent>
    );
  }

  if (activityUrl) {
    tabTitles.push("Activity");
    panels.push(
      <TabContent key="activity" className={panelClass}>
        <ActivityFeed
          activityUrl={activityUrl}
          pageSize={activityPageSize}
          userId={activityOwnOnly ? (user?.id ?? undefined) : undefined}
          excludeVerbs={activityExcludeVerbs}
        />
      </TabContent>
    );
  }

  // AnimatedTabs needs at least two titles to build its layoutId, and a
  // single-tab panel is just a panel — render it without the tab strip.
  if (tabTitles.length < 2) {
    return <div className={cn("w-full", className)}>{panels[0]}</div>;
  }

  return (
    <div className={cn("w-full", className)}>
      <AnimatedTabs tab_titles={tabTitles}>{panels}</AnimatedTabs>
    </div>
  );
}
