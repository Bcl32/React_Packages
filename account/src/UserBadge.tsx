import { cn } from "@bcl32/utils/cn";

import { Avatar } from "./Avatar";
import type { AvatarSize } from "./types";
import { useUserDirectory } from "./UserProvider";

export interface UserBadgeProps {
  /** A `users.id` — resolved against the directory from `UserProvider`. */
  userId?: string | null;
  /** Fallback identity when the id cannot be resolved (denormalized rows). */
  email?: string | null;
  displayName?: string | null;
  showAvatar?: boolean;
  size?: AvatarSize;
  className?: string;
}

/** What an unresolvable attribution renders as, everywhere. */
export const UNKNOWN_USER_LABEL = "—";

/**
 * One user, inline: avatar + label.
 *
 * Renders `—` for a null id **and** for an id the directory does not know
 * (a deleted user, a row written before the migration, a directory that never
 * loaded). Never renders a raw UUID — an id on screen is worse than a dash.
 */
export function UserBadge({
  userId,
  email,
  displayName,
  showAvatar = true,
  size = "sm",
  className,
}: UserBadgeProps) {
  const { resolveUser } = useUserDirectory();
  const resolved = resolveUser(userId);

  const resolvedEmail = resolved?.email ?? email ?? null;
  const resolvedName = resolved?.display_name ?? displayName ?? null;
  const label = resolvedName?.trim() || resolvedEmail?.trim() || null;

  if (!label) {
    return <span className={cn("text-muted-foreground", className)}>{UNKNOWN_USER_LABEL}</span>;
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      {showAvatar ? (
        <Avatar
          email={resolvedEmail}
          displayName={resolvedName}
          size={size}
          title={resolvedEmail ?? label}
        />
      ) : null}
      <span className="truncate" title={resolvedEmail ?? label}>
        {label}
      </span>
    </span>
  );
}
