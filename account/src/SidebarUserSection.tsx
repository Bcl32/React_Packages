import { Fragment } from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bcl32/utils/Dropdown";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@bcl32/utils/Sidebar";

import { Avatar } from "./Avatar";
import type { AccountMenuItem } from "./types";
import { useCurrentUser } from "./UserProvider";

export interface SidebarUserSectionProps {
  /**
   * Where "Sign out" points. The app supplies it — for Cloudflare Access that
   * is `/cdn-cgi/access/logout`. Rendered as a plain `<a href>` because signing
   * out is a full navigation to the identity provider, not a fetch.
   */
  logoutUrl: string;
  /** Menu entries above the sign-out row. The app owns what each one does. */
  items?: AccountMenuItem[];
  /** Label shown when nobody is signed in. Default "Not signed in". */
  signedOutLabel?: string;
  signOutLabel?: string;
  className?: string;
}

/**
 * The sidebar footer identity block: avatar + name + a dropdown.
 *
 * Must be rendered inside a `SidebarProvider` (it reads the collapse state) and
 * a `UserProvider`. Collapse-safe: at `state === "collapsed"` the text column
 * and chevron are dropped so only the avatar remains inside the icon rail, the
 * button carries a tooltip with the full label, and the dropdown flips to the
 * right-hand side.
 */
export function SidebarUserSection({
  logoutUrl,
  items = [],
  signedOutLabel = "Not signed in",
  signOutLabel = "Sign out",
  className,
}: SidebarUserSectionProps) {
  const { user } = useCurrentUser();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  const name = user?.display_name?.trim() || user?.email || signedOutLabel;
  const email = user?.email ?? null;

  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={name}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar
                email={email}
                displayName={user?.display_name}
                size="md"
                className="shrink-0 rounded-lg"
              />
              {collapsed ? null : (
                <>
                  <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{name}</span>
                    {email ? (
                      <span className="truncate text-xs text-muted-foreground">{email}</span>
                    ) : null}
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={collapsed ? "right" : "top"}
            align="end"
            sideOffset={4}
            // Menu items here open modal dialogs that live outside the menu.
            // On close Radix returns focus to the trigger, and that focus
            // restore lands outside the just-opened dialog, dismissing it
            // instantly. The dialog takes focus itself, so skip the restore.
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                <Avatar
                  email={email}
                  displayName={user?.display_name}
                  size="md"
                  className="rounded-lg"
                />
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm font-medium">{name}</span>
                  {email ? (
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>

            {items.map((item) => {
              const Icon = item.icon;
              return (
                // Fragment, not a wrapper element: Radix's roving focus walks
                // the rendered DOM, so an extra box around menu items changes
                // keyboard navigation.
                <Fragment key={item.id}>
                  {item.separatorBefore ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem className="cursor-pointer" onSelect={() => item.onSelect()}>
                    {Icon ? <Icon className="size-4 shrink-0" /> : null}
                    <span className="truncate">{item.label}</span>
                  </DropdownMenuItem>
                </Fragment>
              );
            })}

            {/* Sign-out is always last, and always a real link: the browser has
                to navigate to the identity provider to drop the session. */}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={logoutUrl} className="cursor-pointer">
                <LogOut className="size-4 shrink-0" />
                <span className="truncate">{signOutLabel}</span>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
