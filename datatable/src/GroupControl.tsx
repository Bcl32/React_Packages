import { Select } from "@bcl32/utils/Select";

/**
 * Which attribute the board lanes by, shown in the toolbar beside the layout
 * toggle.
 *
 * It lives here rather than in each consuming page for the same reason
 * `SortControl` does: the control belongs with the layout it governs, and a
 * board is useless without a way to say what its lanes mean. A page only has to
 * hand `BoardConfig` a list of options and a setter.
 *
 * Stateless — the value and the lanes both come from the caller, so the picker
 * and the board cannot disagree.
 */
export function GroupControl(props: {
  value?: string;
  options: { value: string; label: string }[];
  onChange: (attrName: string) => void;
}): JSX.Element {
  return (
    <Select
      aria-label="Group by"
      title="Group by"
      className="h-8 w-[140px] px-2 py-0 text-xs"
      value={props.value ?? ""}
      onChange={(e) => {
        if (e.target.value) props.onChange(e.target.value);
      }}
    >
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
