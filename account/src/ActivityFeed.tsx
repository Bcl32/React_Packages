import React from "react";

import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import { Button } from "@bcl32/utils/Button";
import { cn } from "@bcl32/utils/cn";
import { Skeleton } from "@bcl32/utils/Skeleton";

import { ActivityTimeline } from "./ActivityTimeline";
import type { ActivityEntry, ListResponse } from "./types";

export interface ActivityFeedProps {
  /**
   * Absolute URL of `GET /activity`, built by the app (`apiUrl("activity")`).
   * Query parameters are appended here; do not include a query string.
   */
  activityUrl: string;
  /** Rows per page. Default 20. Also the "Show more" increment. */
  pageSize?: number;
  /** Restrict the feed to one user's activity (`?user_id=`). */
  userId?: string;
  /** Restrict the feed to one entity type (`?entity_type=`). */
  entityType?: string;
  /**
   * Verbs to hide (`?exclude_verbs=`, repeated). For actions worth recording
   * but not worth reading — Home Helper hides `thumbnail` / `thumbnail_fetch`.
   *
   * Filtered by the API, not here, so `total` counts the same rows the reader
   * can see and "Show more" never fetches a page that renders as nothing.
   */
  excludeVerbs?: string[];
  /** Render nothing at all when the feed is empty — for dashboard widgets that
   *  should not show a "no activity yet" placeholder on a fresh install. */
  hideWhenEmpty?: boolean;
  /** Suppress the "Show more" button (fixed-size widget). Default false. */
  hidePagination?: boolean;
  emptyMessage?: string;
  className?: string;
  showAvatars?: boolean;
}

function buildUrl(
  base: string,
  params: Record<string, string | number | string[] | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    // An array becomes a REPEATED parameter (?k=a&k=b), which is what FastAPI
    // reads into a `list[str]`. Joining it with a comma would arrive as one
    // string that matches no verb at all.
    if (Array.isArray(value)) {
      for (const item of value) if (item !== "") search.append(key, item);
      continue;
    }
    search.set(key, String(value));
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${search.toString()}`;
}

/**
 * The fetching half of the activity feed.
 *
 * Paging grows the window rather than stepping through it (`limit` increases,
 * `offset` stays 0) — a feed is read top-down, and a growing window keeps the
 * rows already on screen stable while "Show more" adds to the bottom. The API
 * caps `limit` at 200.
 */
export function ActivityFeed({
  activityUrl,
  pageSize = 20,
  userId,
  entityType,
  excludeVerbs,
  hideWhenEmpty = false,
  hidePagination = false,
  emptyMessage = "No activity yet.",
  className,
  showAvatars = true,
}: ActivityFeedProps) {
  const [limit, setLimit] = React.useState(pageSize);

  // Depend on the CONTENTS, not the array. Callers pass a literal
  // (`excludeVerbs={["thumbnail"]}`), which is a fresh identity every render —
  // in the dependency list that would re-run the reset below on every render
  // and snap "Show more" back to the first page as fast as it was clicked.
  const excludeKey = (excludeVerbs ?? []).join(",");

  // A changed filter or page size restarts the window rather than keeping a
  // stale, larger one.
  React.useEffect(() => {
    setLimit(pageSize);
  }, [pageSize, userId, entityType, excludeKey, activityUrl]);

  const url = buildUrl(activityUrl, {
    limit,
    offset: 0,
    user_id: userId,
    entity_type: entityType,
    exclude_verbs: excludeVerbs,
  });

  const { data, isLoading, isError } = useGetRequest<ListResponse<ActivityEntry>>(url, {
    queryKey: ["account", "activity", url],
  });

  const entries: ActivityEntry[] = data?.items ?? [];
  const total = data?.total ?? entries.length;

  if (isLoading) {
    if (hideWhenEmpty) return null;
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {Array.from({ length: Math.min(pageSize, 4) }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  // A failed read is treated as "nothing to show". The feed is ambient
  // context, never the reason the page exists — an error banner here would be
  // louder than the content.
  if (isError || entries.length === 0) {
    if (hideWhenEmpty) return null;
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyMessage}</p>;
  }

  const hasMore = entries.length < total;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ActivityTimeline entries={entries} showAvatars={showAvatars} />
      {hasMore && !hidePagination ? (
        <div>
          <Button variant="outline" size="sm" onClick={() => setLimit((n) => n + pageSize)}>
            Show more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
