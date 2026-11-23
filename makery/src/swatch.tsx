/**
 * @bcl32/makery/swatch: the 2D finish-aware swatch.
 *
 * Silk sheens, sparkle flecks, marble, wood grain, metallic banding, glow
 * halo, translucency, driven by the filament's finish name. Scale-independent,
 * so it doubles as a spool icon. Ported from Print-Tracker's FilamentSwatch;
 * the look is swatch.css, which the caller imports once:
 *
 *   import { FilamentSwatch } from "@bcl32/makery/swatch";
 *   import "@bcl32/makery/swatch.css";
 *   <FilamentSwatch {...swatchProps(filament)} size="2rem" />
 *
 * Server-safe: no theme provider, no router, no context, nothing read from
 * window or document; the same props give the same markup in Node and in the
 * browser (all the maths is swatchLook in `/finishes`).
 */
import type { CSSProperties, ElementType, ReactNode } from "react";

import { swatchLook } from "./finishes";

export interface FilamentSwatchProps {
  /** The finish name (Bambu sub-type): "Silk+", "Matte", ... */
  subType?: string | null;
  /** "#RRGGBB" or "#RRGGBBAA" (alpha < 0.95 renders as translucent). */
  hex?: string | null;
  /** 2+ entries render a multi-colour gradient (dual-colour silks). */
  colours?: readonly string[] | null;
  /** CSS width and height. */
  size?: string;
  /** CSS border-radius (a spool is always round). */
  rounded?: string;
  /** "spool" renders a round donut with a punched hub (spool icon). */
  shape?: "square" | "spool";
  /** false suppresses the glow ☾ marker (needed below ~2rem). */
  badge?: boolean;
  /** Ambient finish motion (drifting sheens, twinkle, glow pulse). Honours prefers-reduced-motion. */
  animated?: boolean;
  className?: string;
  title?: string;
  /** The element to render (default "div"; "span" inside phrasing content). */
  as?: ElementType;
  /** Extra inline style, merged under the swatch's own variables and size. */
  style?: CSSProperties;
  children?: ReactNode;
}

export function FilamentSwatch({
  subType,
  hex,
  colours,
  size = "5.5rem",
  rounded = "14%",
  shape = "square",
  badge = true,
  animated = false,
  className = "",
  title,
  as: Tag = "div",
  style: extraStyle,
  children,
}: FilamentSwatchProps) {
  const look = swatchLook({ subType, hex, colours });
  const isSpool = shape === "spool";

  // Property order as Print-Tracker's (so the markup is byte-identical).
  const { "--grad": grad, ...vars } = look.vars;
  const style: Record<string, string | number | undefined> = {
    ...(extraStyle as Record<string, string | number | undefined>),
    ...vars,
    width: size,
    height: size,
    borderRadius: isSpool ? "50%" : rounded,
  };
  if (grad) style["--grad"] = grad;

  return (
    <Tag
      className={`filament-swatch ${isSpool ? "filament-swatch-spool" : ""} ${
        animated ? "filament-swatch-animated" : ""
      } ${className}`}
      data-finish={look.dataFinish}
      style={style as CSSProperties}
      title={title}
    >
      {look.finish === "glow" && badge && !isSpool && (
        <span className="filament-swatch-glow-badge" aria-hidden="true">
          ☾
        </span>
      )}
      {children}
    </Tag>
  );
}
