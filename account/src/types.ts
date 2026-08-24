import type { LucideIcon } from "lucide-react";

/**
 * The signed-in user as served by `GET /auth/me` (bcl32-auth).
 *
 * `id` is a UUID string; `display_name` is user-editable and may be null
 * (fall back to `email` for display — {@link resolveUserLabel}).
 */
export interface AccountUser {
  id: string;
  email: string;
  display_name?: string | null;
  /** Server-synced preference blob. Namespaced by the app (e.g. `prefs.settings`). */
  prefs?: Record<string, unknown> | null;
  /** Identity provider that authenticated this request, e.g. "cloudflare_access". */
  provider?: string | null;
  time_created?: string;
  time_updated?: string;
}

/** One row of the attribution directory served by `GET /auth/users`. */
export interface DirectoryUser {
  id: string;
  email: string;
  display_name?: string | null;
}

/** One row of the audit log served by `GET /activity`. */
export interface ActivityEntry {
  id: string;
  /** FK to users.id — null once the subject row is deleted (audit outlives subject). */
  user_id: string | null;
  /** Denormalized at write time so the row stays readable after the user is gone. */
  user_email: string | null;
  /** "created" | "updated" | "deleted" | a route action such as "bulk-update". */
  verb: string;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_label?: string | null;
  meta?: Record<string, unknown> | null;
  time_created: string;
}

/**
 * The standard FastAPI list envelope (`schemas/_base.py`). Mirrored here so
 * this package does not depend on `@bcl32/data-utils`.
 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * One entry in the sidebar account dropdown. The package renders it; the app
 * owns what it does — this package never navigates and never builds URLs.
 */
export interface AccountMenuItem {
  /** Stable unique key within the menu. */
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Draw a separator above this item. */
  separatorBefore?: boolean;
}

/** Body accepted by `PATCH /auth/me`. `prefs` REPLACES the whole blob. */
export interface UpdateMePayload {
  display_name?: string | null;
  prefs?: Record<string, unknown>;
}

export type AvatarSize = "sm" | "md" | "lg";

/** Display label for a user-ish record: display name, else email, else null. */
export function resolveUserLabel(
  user?: { email?: string | null; display_name?: string | null } | null,
): string | null {
  if (!user) return null;
  const name = user.display_name?.trim();
  if (name) return name;
  const email = user.email?.trim();
  return email ? email : null;
}
