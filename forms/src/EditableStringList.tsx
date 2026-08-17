import * as React from "react";
import { Plus, X } from "lucide-react";
import type { ModelData } from "@bcl32/data-utils";

export interface EditableStringListProps {
  /** Current array value; null/undefined render as an empty list. */
  items: string[] | null | undefined;
  /** Field name — commits call onSave({ [field]: string[] }). */
  field: string;
  /**
   * Persist one commit. Omit entirely for a read-only list. Rejections are
   * swallowed — the items prop is expected to revert on failure.
   */
  onSave?: (updates: Record<string, string[]>) => Promise<unknown> | void;
  /** Dims the list while a save is in flight. */
  saving?: boolean;
  /**
   * Generated ModelData for the parent model; when the field's attribute has
   * editable === false the list renders read-only, so server-side gating
   * reaches the UI with no extra prop.
   */
  modelData?: ModelData;
  placeholder?: string;
  /**
   * Class for the bullet marker span (e.g. "text-success") so the list can
   * carry its section's tone without restyling the text.
   */
  markerClass?: string;
}

/**
 * Inline click-to-edit for an array-of-strings field rendered as bullet
 * points (ModelData type "list" — e.g. a Listing's likes / dislikes). Each
 * bullet is one array element: clicking a row edits that row in place, a
 * trailing ghost row appends, Enter while adding chains straight into the
 * next item, and committing a row as empty text deletes it. Every commit
 * PATCHes the whole array via onSave({ [field]: string[] }).
 */
export function EditableStringList({
  items,
  field,
  onSave,
  saving,
  modelData,
  placeholder = "Add an item…",
  markerClass = "text-muted-foreground",
}: EditableStringListProps) {
  // null = read view; a number = editing that row; "new" = the append row.
  const [editing, setEditing] = React.useState<number | "new" | null>(null);
  const [draft, setDraft] = React.useState("");
  const cancelledRef = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const rows = Array.isArray(items) ? items : [];

  React.useEffect(() => {
    if (editing !== null && inputRef.current) {
      inputRef.current.focus();
      // Caret at the end — rows are tweaked more often than retyped.
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange?.(len, len);
    }
  }, [editing]);

  const attr = modelData?.model_attributes?.find((a) => a.name === field);
  const gatedReadOnly = attr && attr.editable === false;
  const readOnly = !onSave || gatedReadOnly;

  const marker = (
    <span className={`select-none leading-5 ${markerClass}`}>•</span>
  );

  // Read-only: render the bullets (or nothing) with no edit affordance.
  if (readOnly) {
    return rows.length ? (
      <ul className="space-y-1">
        {rows.map((text, i) => (
          <li key={i} className="flex items-start gap-2">
            {marker}
            <span className="text-sm text-muted-foreground whitespace-pre-wrap">
              {text}
            </span>
          </li>
        ))}
      </ul>
    ) : null;
  }

  const startEditing = (index: number | "new") => {
    setDraft(index === "new" ? "" : rows[index]);
    cancelledRef.current = false;
    setEditing(index);
  };

  const commit = async (next: string[]) => {
    try {
      await onSave?.({ [field]: next });
    } catch {
      // reverts — items prop unchanged on failure
    }
  };

  // chain: reopen the append row after saving (Enter on the ghost row), so a
  // run of bullets can be typed without re-clicking between them.
  const save = async (chain = false) => {
    if (cancelledRef.current) return;
    const trimmed = draft.trim();

    if (editing === "new") {
      if (trimmed) await commit([...rows, trimmed]);
      if (chain && trimmed) {
        setDraft("");
        cancelledRef.current = false;
        inputRef.current?.focus();
      } else {
        setEditing(null);
      }
      return;
    }

    if (editing === null) return;
    if (trimmed === rows[editing]) {
      setEditing(null);
      return;
    }
    await commit(
      trimmed
        ? rows.map((r, i) => (i === editing ? trimmed : r))
        : rows.filter((_, i) => i !== editing)
    );
    setEditing(null);
  };

  const cancel = () => {
    cancelledRef.current = true;
    setEditing(null);
  };

  const removeRow = (index: number) =>
    commit(rows.filter((_, i) => i !== index));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      save(editing === "new");
    }
  };

  const editInput = (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => save(false)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="w-full rounded-md border bg-background px-2 py-0.5 text-sm"
    />
  );

  return (
    <ul className={`space-y-1 ${saving ? "opacity-50" : ""}`}>
      {rows.map((text, i) =>
        editing === i ? (
          <li key={i} className="flex items-start gap-2">
            {marker}
            {editInput}
          </li>
        ) : (
          <li
            key={i}
            className="group/row flex items-start gap-2 rounded-md -mx-1.5 px-1.5 py-0.5 hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => startEditing(i)}
          >
            {marker}
            <span className="flex-1 text-sm text-muted-foreground whitespace-pre-wrap">
              {text}
            </span>
            <button
              type="button"
              aria-label="Remove item"
              className="mt-0.5 shrink-0 opacity-0 group-hover/row:opacity-60 hover:!opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                removeRow(i);
              }}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </li>
        )
      )}
      {editing === "new" ? (
        <li className="flex items-start gap-2">
          {marker}
          {editInput}
        </li>
      ) : (
        <li
          className="group/add flex items-center gap-2 rounded-md -mx-1.5 px-1.5 py-0.5 hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => startEditing("new")}
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover/add:opacity-100 transition-opacity" />
          <span className="text-sm italic text-muted-foreground/50">
            {placeholder}
          </span>
        </li>
      )}
    </ul>
  );
}
