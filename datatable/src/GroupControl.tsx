import { Layers3 } from "lucide-react";

import { Button } from "@bcl32/utils/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bcl32/utils/Dropdown";

/**
 * Which attribute the grouped layouts group by, shown in the toolbar beside
 * the layout toggle.
 *
 * It lives here rather than in each consuming page for the same reason
 * `SortControl` does: the control belongs with the layout it governs, and a
 * board is useless without a way to say what its lanes mean. A page only has to
 * hand `BoardConfig` a list of options and a setter.
 *
 * A chip-plus-menu rather than the bare `<select>` it used to be, for two
 * reasons: the trigger now *states* the current arrangement ("Status › Material")
 * instead of hiding it until opened, and a second question fits — supplying
 * `onSubChange` adds a "then by" section that drives the sections layout's
 * nesting. The board never passes it; one axis is all its geometry has.
 *
 * Stateless — value and lanes both come from the caller, so the picker and the
 * layout cannot disagree.
 */
export function GroupControl(props: {
  value?: string;
  options: { value: string; label: string }[];
  onChange: (attrName: string) => void;
  /** The nested level's attribute, or null/undefined for none. */
  subValue?: string | null;
  /** Supplying this is what draws the "then by" half. Called with null when
   *  the user picks "None". */
  onSubChange?: (attrName: string | null) => void;
}): JSX.Element {
  const current = props.options.find((o) => o.value === props.value);
  const sub = props.options.find((o) => o.value === props.subValue);

  // "Then by the same attribute" would draw every row inside the one sub-group
  // that matches its parent — true, and useless. Offer the rest.
  const subOptions = props.options.filter((o) => o.value !== props.value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs font-normal"
          title="Group by"
        >
          <Layers3 size={14} />
          <span className="max-w-[180px] truncate">
            {current?.label ?? "Group"}
            {props.onSubChange && sub ? ` › ${sub.label}` : ""}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Group by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={props.value ?? ""}
          onValueChange={(v) => {
            if (!v) return;
            // Re-picking the nested attribute as the top level would group by
            // the same thing twice; hand the vacated slot's clear to the
            // consumer rather than render an empty second level.
            if (v === props.subValue) props.onSubChange?.(null);
            props.onChange(v);
          }}
        >
          {props.options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {props.onSubChange && subOptions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Then by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              // The empty string is the "None" sentinel — Radix radio items
              // need a string value, and no attribute is named "".
              value={props.subValue ?? ""}
              onValueChange={(v) => props.onSubChange!(v === "" ? null : v)}
            >
              <DropdownMenuRadioItem value="">None</DropdownMenuRadioItem>
              {subOptions.map((o) => (
                <DropdownMenuRadioItem key={o.value} value={o.value}>
                  {o.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
