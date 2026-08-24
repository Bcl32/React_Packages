import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { cn } from "@bcl32/utils/cn";

import type { ActivityEntry } from "./types";
import { UserBadge } from "./UserBadge";

dayjs.extend(relativeTime);

export interface ActivityTimelineProps {
  entries: ActivityEntry[];
  className?: string;
  /** Hide the avatar circle on each row (tight dashboard widgets). */
  showAvatars?: boolean;
}

/** "maintenance_plan" → "maintenance plan". Entity types arrive snake_cased. */
function humanizeEntityType(value?: string | null): string {
  const text = (value ?? "").replace(/_/g, " ").trim();
  return text;
}

/** Past-tense-ish sentence fragment. The API's verbs are already past tense
 *  ("created", "updated", "deleted", "completed", "materialized"); route-derived
 *  action verbs ("bulk-update", "mark-done") are only de-hyphenated. */
function humanizeVerb(verb: string): string {
  return verb.replace(/[-_]/g, " ").trim();
}

function relative(time: string): string {
  const d = dayjs(time);
  return d.isValid() ? d.fromNow() : "";
}

function absolute(time: string): string {
  const d = dayjs(time);
  return d.isValid() ? d.format("MMM D YYYY, h:mma") : time;
}

/**
 * The presentational half of the activity feed: a compact list of rows, no
 * fetching, no paging. Given entries, it renders them; `ActivityFeed` owns the
 * request.
 *
 * Split so a page that already has activity rows in hand (a websocket, an
 * embedded payload, a test) can render the same list.
 */
export function ActivityTimeline({
  entries,
  className,
  showAvatars = true,
}: ActivityTimelineProps) {
  return (
    <ul className={cn("flex flex-col divide-y divide-border", className)}>
      {entries.map((entry) => {
        const entityType = humanizeEntityType(entry.entity_type);
        return (
          <li key={entry.id} className="flex items-center gap-2 py-1.5 text-sm">
            <UserBadge
              userId={entry.user_id}
              email={entry.user_email}
              showAvatar={showAvatars}
              size="sm"
              className="max-w-[10rem] shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              <span>{humanizeVerb(entry.verb)}</span>
              {entityType ? <span> {entityType}</span> : null}
              {entry.entity_label ? (
                <span className="font-medium text-foreground"> {entry.entity_label}</span>
              ) : null}
            </span>
            <time
              className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
              dateTime={entry.time_created}
              title={absolute(entry.time_created)}
            >
              {relative(entry.time_created)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
