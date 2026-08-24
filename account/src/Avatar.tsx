import { cn } from "@bcl32/utils/cn";

import type { AvatarSize } from "./types";

export interface AvatarProps {
  email?: string | null;
  displayName?: string | null;
  /** sm = 24px, md = 32px, lg = 36px. Default "md". */
  size?: AvatarSize;
  className?: string;
  title?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-9 w-9 text-sm",
};

/**
 * Initials for the badge: up to two letters.
 *
 * `display_name` wins when set ("Brandon Laughlin" → "BL"); otherwise the
 * email's local part is used ("brandon.bcl@…" → "BB", splitting on the
 * separators people actually put in addresses). Falls back to "?" so the
 * circle is never empty.
 */
export function initialsFor(displayName?: string | null, email?: string | null): string {
  const name = displayName?.trim();
  const source = name || (email ?? "").split("@")[0]?.replace(/[._+-]+/g, " ").trim();
  if (!source) return "?";
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Stable hue in [0, 360) from a string — djb2, which is cheap, has no
 * dependencies and spreads short strings well enough for a colour wheel.
 *
 * Keyed on the **email**, not the display name, so renaming yourself does not
 * change your colour (the email is the identity; the name is a label).
 */
export function hueFor(seed?: string | null): number {
  const value = (seed ?? "").trim().toLowerCase();
  if (!value) return 210;
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * A round, initials-only avatar with a deterministic per-user colour.
 *
 * No image support on purpose: there is no avatar upload anywhere in the fleet
 * and adding one here would put a URL contract inside a package that is not
 * allowed to build URLs.
 */
export function Avatar({ email, displayName, size = "md", className, title }: AvatarProps) {
  const hue = hueFor(email);
  return (
    <span
      aria-hidden="true"
      title={title}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase leading-none text-white",
        SIZE_CLASSES[size],
        className
      )}
      // Inline because the hue is data, not a design token — Tailwind cannot
      // generate an arbitrary class per user at build time.
      style={{ backgroundColor: `hsl(${hue} 52% 42%)` }}
    >
      {initialsFor(displayName, email)}
    </span>
  );
}
