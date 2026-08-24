import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@bcl32/hooks/apiFetch";

import type {
  AccountUser,
  DirectoryUser,
  ListResponse,
  UpdateMePayload,
} from "./types";
import { resolveUserLabel } from "./types";

export interface UserContextValue {
  /** The signed-in user, or `null` when identity is unavailable. */
  user: AccountUser | null;
  /** True while the first `/auth/me` probe is in flight. */
  isLoading: boolean;
  /**
   * True once the probe has settled with no user — 401, a network failure, or
   * an API that has no auth wired at all. The app is expected to keep working:
   * this is a *degrade* signal, not an error.
   */
  isUnauthenticated: boolean;
  /**
   * PATCH `/auth/me`. Resolves to the updated user, or `null` when the write
   * failed — failures are deliberately silent (no throw, no toast) so a
   * preference sync can never interrupt what the user was doing.
   */
  updateMe: (patch: UpdateMePayload) => Promise<AccountUser | null>;
  isUpdating: boolean;
  /** The attribution directory, empty until `usersUrl` resolves. */
  directory: Map<string, DirectoryUser>;
  isDirectoryLoading: boolean;
  /** Display name → email → `null` for an unknown id. */
  resolveName: (userId?: string | null) => string | null;
  /** The raw directory row, for callers that want the email separately. */
  resolveUser: (userId?: string | null) => DirectoryUser | null;
}

const EMPTY_DIRECTORY: Map<string, DirectoryUser> = new Map();

/**
 * Default value rather than a throw-on-missing-provider guard.
 *
 * `UserBadge` is rendered from inside `@bcl32/datatable` cells through
 * `AttributionProvider`, which an app can compose anywhere; a hard throw would
 * turn "identity not wired yet" into a white screen. Every consumer degrades to
 * "no user, empty directory" instead.
 */
const DEFAULT_CONTEXT: UserContextValue = {
  user: null,
  isLoading: false,
  isUnauthenticated: true,
  updateMe: async () => null,
  isUpdating: false,
  directory: EMPTY_DIRECTORY,
  isDirectoryLoading: false,
  resolveName: () => null,
  resolveUser: () => null,
};

const UserContext = React.createContext<UserContextValue>(DEFAULT_CONTEXT);

export interface UserProviderProps {
  /**
   * Absolute URL of `GET`/`PATCH` `/auth/me`, built by the app
   * (`apiUrl("auth/me")`). This package never constructs URLs.
   */
  meUrl: string;
  /**
   * Absolute URL of `GET /auth/users` — the attribution directory. Omit to
   * disable directory lookups (`resolveName` then always returns `null`).
   */
  usersUrl?: string;
  /** How long `/auth/me` stays fresh. Default 5 minutes. */
  staleTime?: number;
  children: React.ReactNode;
}

export function UserProvider({ meUrl, usersUrl, staleTime, children }: UserProviderProps) {
  const queryClient = useQueryClient();

  // Errors are swallowed inside the queryFn rather than surfaced as a query
  // error: a 401 is the normal state for a LAN client or an expired Access
  // session, and every consumer of this context treats "no user" the same way.
  // `retry: false` because none of the failure modes get better by asking again.
  const meQuery = useQuery<AccountUser | null>({
    queryKey: ["account", "me", meUrl],
    queryFn: async () => {
      try {
        const res = await apiFetch(meUrl, { timeoutMs: 15_000 });
        return (await res.json()) as AccountUser;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: staleTime ?? 5 * 60 * 1000,
  });

  const user = meQuery.data ?? null;

  const directoryQuery = useQuery<DirectoryUser[]>({
    queryKey: ["account", "users", usersUrl ?? ""],
    queryFn: async () => {
      try {
        const res = await apiFetch(usersUrl as string, { timeoutMs: 15_000 });
        const body = (await res.json()) as ListResponse<DirectoryUser> | DirectoryUser[];
        return Array.isArray(body) ? body : (body.items ?? []);
      } catch {
        return [];
      }
    },
    // No point asking for the directory while nobody is signed in — the same
    // middleware that answered `/auth/me` with a 401 will answer this one too.
    enabled: Boolean(usersUrl) && Boolean(user),
    retry: false,
    staleTime: staleTime ?? 5 * 60 * 1000,
  });

  const directory = React.useMemo(() => {
    const map = new Map<string, DirectoryUser>();
    for (const row of directoryQuery.data ?? []) {
      if (row?.id) map.set(String(row.id), row);
    }
    // The signed-in user is always resolvable even before the directory lands
    // (and on an API that serves no `/auth/users` at all).
    if (user?.id && !map.has(String(user.id))) {
      map.set(String(user.id), {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      });
    }
    return map;
  }, [directoryQuery.data, user]);

  const mutation = useMutation<AccountUser, unknown, UpdateMePayload>({
    mutationFn: async (patch: UpdateMePayload) => {
      const res = await apiFetch(meUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      return (await res.json()) as AccountUser;
    },
    // Present so an app-wide `MutationCache.onError` default toast opts out —
    // global handlers check `mutation.options.onError`. A failed preference
    // sync must stay invisible.
    onError: () => undefined,
    meta: { silenceErrorToast: true },
    onSuccess: (data) => {
      queryClient.setQueryData(["account", "me", meUrl], data);
    },
  });

  const { mutateAsync } = mutation;
  const updateMe = React.useCallback(
    async (patch: UpdateMePayload): Promise<AccountUser | null> => {
      try {
        return await mutateAsync(patch);
      } catch {
        return null;
      }
    },
    [mutateAsync]
  );

  const resolveUser = React.useCallback(
    (userId?: string | null): DirectoryUser | null =>
      userId ? (directory.get(String(userId)) ?? null) : null,
    [directory]
  );

  const resolveName = React.useCallback(
    (userId?: string | null): string | null => resolveUserLabel(resolveUser(userId)),
    [resolveUser]
  );

  const value = React.useMemo<UserContextValue>(
    () => ({
      user,
      isLoading: meQuery.isLoading,
      isUnauthenticated: !meQuery.isLoading && user === null,
      updateMe,
      isUpdating: mutation.isPending,
      directory,
      isDirectoryLoading: directoryQuery.isLoading,
      resolveName,
      resolveUser,
    }),
    [
      user,
      meQuery.isLoading,
      updateMe,
      mutation.isPending,
      directory,
      directoryQuery.isLoading,
      resolveName,
      resolveUser,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/** The signed-in user plus `updateMe`. Safe outside a provider (user = null). */
export function useCurrentUser(): UserContextValue {
  return React.useContext(UserContext);
}

/** The id → user directory used to resolve `created_by` / `updated_by`. */
export function useUserDirectory(): Pick<
  UserContextValue,
  "directory" | "isDirectoryLoading" | "resolveName" | "resolveUser"
> {
  const { directory, isDirectoryLoading, resolveName, resolveUser } =
    React.useContext(UserContext);
  return { directory, isDirectoryLoading, resolveName, resolveUser };
}
