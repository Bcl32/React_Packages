import * as React from "react";
import { Check, Pencil, X } from "lucide-react";

import { Input } from "@bcl32/utils/Input";
import { Select } from "@bcl32/utils/Select";
import { Combobox } from "@bcl32/utils/Combobox";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { useNumberAdapter } from "@bcl32/utils/NumberAdapter";
import type { ModelAttribute } from "@bcl32/data-utils";
import { toNumberValue } from "@bcl32/data-utils/numbers";

import { FieldInput, type NumberFieldError } from "./FieldInput";
import { fieldErrorText } from "./numberFields";

/**
 * How much room a detail grid gives each item. `tight` (the default) is a
 * 2px label→value gap and a hover wash that bleeds 4px sideways; `comfortable`
 * is a 4px gap and a wash that bleeds 6px all round. An app picks one for
 * every item with {@link DetailDensityProvider}, or one item with `density`.
 */
export type DetailDensity = "tight" | "comfortable";

const DensityContext = React.createContext<DetailDensity>("tight");

/** Sets the density of every `EditableDetailItem` under it. Mounted once by an app. */
export function DetailDensityProvider({ density, children }: { density: DetailDensity; children?: React.ReactNode }) {
  return <DensityContext.Provider value={density}>{children}</DensityContext.Provider>;
}

const STACK: Record<DetailDensity, string> = {
  tight: "flex flex-col gap-0.5",
  comfortable: "flex flex-col gap-1",
};
const CLICKABLE: Record<DetailDensity, string> = {
  tight: "flex flex-col gap-0.5 group cursor-pointer rounded-md -mx-1 px-1 py-0.5 hover:bg-accent/50 transition-colors",
  comfortable: "flex flex-col gap-1 group cursor-pointer rounded-md -m-1.5 p-1.5 hover:bg-accent/50 transition-colors",
};

/** A lucide-style icon component: the caller passes `icon={BedDouble}`, sizing stays here. */
export type DetailIcon = React.ComponentType<{ className?: string }>;

/** What `onSave` receives: one field, `{ [field]: value }`. */
export type DetailPatch = Record<string, unknown>;

export interface EditableDetailItemProps {
  /** The small-caps label above the value. Empty = no label row. */
  label: string;
  /** The stored value. A number field takes the wire value as-is ("12.50" or 12.5). */
  value: unknown;
  /** The attribute name: looks the field up in `modelData` and keys the patch. */
  field: string;
  /**
   * Called with `{ [field]: value }` when an edit changes the value. A thrown
   * or rejected save is swallowed: the editor closes and the shown value stays
   * whatever `value` the caller passes next. Absent = read-only.
   */
  onSave?: (patch: DetailPatch) => unknown;
  /** Dims the shown value while a save is in flight. */
  saving?: boolean;
  /** `{ model_attributes }`: the field is editable only when its attribute says so. */
  modelData?: { model_attributes?: ModelAttribute[] } | null;
  /** Overrides the attribute's `type` for the editor ("date", "string", "select"…). */
  inputType?: string;
  /** What the idle field shows instead of the raw value (a badge, a formatted figure). */
  children?: React.ReactNode;
  /** Drawn before the label. */
  icon?: DetailIcon;
  /** Sizes the value only; the label keeps the grid's shared small caps. */
  valueClassName?: string;
  /** Overrides the {@link DetailDensityProvider} for this item. */
  density?: DetailDensity;
}

function getAttr(modelData: EditableDetailItemProps["modelData"], field: string): ModelAttribute | null {
  return modelData?.model_attributes?.find((a) => a.name === field) ?? null;
}

/** A save that may be sync, async, or throw: never rejects. */
async function trySave(onSave: (patch: DetailPatch) => unknown, patch: DetailPatch): Promise<void> {
  try {
    await onSave(patch);
  } catch {
    // The value prop is unchanged on failure, so the field shows the old value.
  }
}

/** A text draft as the value to save: an emptied field is null. */
const textValue = (raw: string): string | null => (raw === "" ? null : raw);

/** Whether a text-like draft differs from the shown value ("3" and 3 are the same). */
const textChanged = (next: string | null, original: unknown): boolean =>
  next !== original && String(next) !== String(original);

function FieldLabel({ label, icon: Icon }: { label: string; icon?: DetailIcon }) {
  // No label = no row: a field whose card title already names it shows the value alone.
  if (!label) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {label}
    </span>
  );
}

function PencilHint() {
  return <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />;
}

function Chips({ items }: { items: React.ReactNode[] }) {
  return (
    <>
      {items.map((item, i) => (
        <span key={`${String(item)}-${i}`} className="px-1.5 py-0.5 rounded-full text-xs bg-accent text-accent-foreground">
          {item}
        </span>
      ))}
    </>
  );
}

/**
 * One labelled value in a detail grid that edits in place.
 *
 * Click the value and it becomes its editor; blur or Enter saves through
 * `onSave({ [field]: value })`, Escape cancels, a select saves on change, and
 * nothing is sent when the value did not change. A number field edits in
 * FieldInput's number box, so it shows and reads the app's unit adapter, puts
 * money's currency inside the box, honours `min`/`max`/`decimals`/`integer`
 * and emits `number | null` — text it cannot read keeps the editor open,
 * marked invalid with the reason under it, and saves nothing. A Decimal's
 * "12.50" retyped as 12.5 is no change.
 *
 * `list` attributes edit as chips inline, `id_list` in a dialog over a
 * multi-select of `{value_key, label_key}` options (ids on the wire), and
 * `single_combobox` as a free-text combobox. A field whose attribute is not
 * `editable`, or with no `onSave`, is read-only.
 */
export function EditableDetailItem({
  label,
  value,
  field,
  onSave,
  saving,
  modelData,
  inputType: inputTypeOverride,
  children,
  icon,
  valueClassName = "text-sm",
  density: densityProp,
}: EditableDetailItemProps) {
  const contextDensity = React.useContext(DensityContext);
  const density = densityProp ?? contextDensity;
  const attr = getAttr(modelData, field);
  const canEdit = Boolean(attr?.editable && onSave);

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [numDraft, setNumDraft] = React.useState<number | null>(null);
  const [numError, setNumError] = React.useState<NumberFieldError | null>(null);
  const [listDraft, setListDraft] = React.useState<string[]>([]);
  const [listInput, setListInput] = React.useState("");
  const cancelledRef = React.useRef(false);
  const inputRef = React.useRef<HTMLInputElement & HTMLSelectElement>(null);
  const numberBoxRef = React.useRef<HTMLDivElement>(null);
  const errorId = React.useId();
  const adapterFor = useNumberAdapter();

  const resolvedType = inputTypeOverride || attr?.type || "string";
  const isNumber = resolvedType === "number";

  React.useEffect(() => {
    if (!editing) return;
    // The number box is FieldInput's; it is reached through its wrapper.
    const el = isNumber ? numberBoxRef.current?.querySelector("input") : inputRef.current;
    if (!el) return;
    el.focus();
    if (resolvedType !== "select" && resolvedType !== "list") (el as HTMLInputElement).select?.();
  }, [editing]);

  if (canEdit && attr && attr.type === "id_list") {
    // Items in `value` are {value_key, label_key} pairs: labels for the chips,
    // ids for the combobox (pairs, so two options sharing a name stay apart).
    const valueKey = attr.value_key || "value";
    const labelKey = attr.label_key || "label";
    const rawList = Array.isArray(value) ? (value as unknown[]) : [];
    const pick = (item: unknown, key: string) =>
      item && typeof item === "object" ? (item as Record<string, unknown>)[key] : item;
    const optionPairs = ((attr.options ?? []) as unknown[])
      .filter((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object")
      .map((o) => ({ value: String(o[valueKey]), label: String(o[labelKey]) }));
    return (
      <BadgeModalField
        label={label}
        icon={icon}
        currentList={rawList.map((item) => pick(item, labelKey) as React.ReactNode)}
        draftValues={rawList.map((item) => String(pick(item, valueKey)))}
        options={optionPairs}
        onSave={(ids) => trySave(onSave!, { [field]: ids })}
        saving={saving}
        valueClassName={valueClassName}
        density={density}
      >
        {children}
      </BadgeModalField>
    );
  }

  if (canEdit && attr && attr.type === "list") {
    const currentList = Array.isArray(value) ? (value as string[]) : [];
    const addItem = (item: string) => {
      if (item && !listDraft.includes(item)) setListDraft((prev) => [...prev, item]);
      setListInput("");
    };
    const saveList = async () => {
      await trySave(onSave!, { [field]: listDraft });
      setEditing(false);
    };

    if (editing) {
      const optionLabel = (o: unknown) => (typeof o === "string" ? o : String((o as { label: string }).label));
      const filteredOptions = ((attr.options ?? []) as unknown[]).map(optionLabel).filter(
        (l) => !listDraft.includes(l) && l.toLowerCase().includes(listInput.toLowerCase()),
      );
      return (
        <div className={STACK[density]}>
          <FieldLabel label={label} icon={icon} />
          <div className="flex flex-wrap gap-1 mb-1">
            {listDraft.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-accent text-accent-foreground"
              >
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() => setListDraft((prev) => prev.filter((v) => v !== item))}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Input
              ref={inputRef}
              value={listInput}
              onChange={(e) => setListInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && listInput.trim()) {
                  e.preventDefault();
                  addItem(listInput.trim());
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
              placeholder={`Add ${label.toLowerCase()}...`}
              size="sm"
              className="h-7 text-sm"
            />
            {listInput && filteredOptions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-card border rounded-md shadow-lg max-h-32 overflow-auto">
                {filteredOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => addItem(opt)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 mt-1">
            <button
              type="button"
              aria-label="Save"
              onClick={saveList}
              className="p-1 rounded hover:bg-accent transition-colors text-primary"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => setEditing(false)}
              className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className={CLICKABLE[density]}
        onClick={() => {
          setListDraft([...currentList]);
          setListInput("");
          setEditing(true);
        }}
      >
        <FieldLabel label={label} icon={icon} />
        <span className={`${valueClassName} flex items-center gap-1.5 ${saving ? "opacity-50" : ""}`}>
          {currentList.length > 0 ? (
            <span className="flex flex-wrap gap-1">{children || <Chips items={currentList} />}</span>
          ) : (
            "-"
          )}
          <PencilHint />
        </span>
      </div>
    );
  }

  if (canEdit && attr && attr.type === "single_combobox") {
    // A scalar string with a suggestion list and free text. The Combobox works
    // in array space; the wire payload stays a plain string.
    const optionLabels = ((attr.options ?? []) as unknown[]).map((o) =>
      typeof o === "string" ? o : String((o as { label?: string; value?: string }).label || (o as { value?: string }).value),
    );
    const currentValue = typeof value === "string" ? value : value != null ? String(value) : "";

    if (editing) {
      return (
        <div className={STACK[density]}>
          <FieldLabel label={label} icon={icon} />
          <Combobox
            multiple={false}
            freeSolo
            options={optionLabels}
            value={currentValue ? [currentValue] : []}
            onChange={async (next) => {
              const picked = next.length > 0 ? next[next.length - 1] : null;
              if ((picked ?? "") !== currentValue) await trySave(onSave!, { [field]: picked });
              setEditing(false);
            }}
            placeholder={`Select ${label.toLowerCase()}...`}
          />
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setEditing(false)}
            className="self-start mt-1 p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div
        className={CLICKABLE[density]}
        onClick={() => {
          cancelledRef.current = false;
          setEditing(true);
        }}
      >
        <FieldLabel label={label} icon={icon} />
        <span className={`${valueClassName} flex items-center gap-1.5 ${saving ? "opacity-50" : ""}`}>
          {currentValue || "-"}
          <PencilHint />
        </span>
      </div>
    );
  }

  if (!canEdit || !attr) {
    return (
      <div className={STACK[density]}>
        <FieldLabel label={label} icon={icon} />
        <span className={valueClassName}>{children || (value != null && value !== "" ? String(value) : "-")}</span>
      </div>
    );
  }

  const startEditing = () => {
    setDraft(value != null ? String(value) : "");
    setNumDraft(toNumberValue(value));
    setNumError(null);
    cancelledRef.current = false;
    setEditing(true);
  };

  const close = () => setEditing(false);

  const save = async () => {
    if (cancelledRef.current) return;
    if (isNumber) {
      // A number box reports "" for text it cannot read ("1e", "--"), the same
      // as for an emptied box; only its validity tells them apart.
      const badInput = numberBoxRef.current?.querySelector("input")?.validity?.badInput;
      const error = badInput ? "invalid" : numError;
      if (error) {
        setNumError(error);
        return; // the editor stays open, marked, with the reason under it
      }
      if (numDraft === toNumberValue(value)) return close();
      cancelledRef.current = true; // a blur while the save is in flight saves nothing more
      await trySave(onSave!, { [field]: numDraft });
      return close();
    }
    const next = textValue(draft);
    if (!textChanged(next, value ?? null)) return close();
    cancelledRef.current = true;
    await trySave(onSave!, { [field]: next });
    close();
  };

  const cancel = () => {
    cancelledRef.current = true;
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    const inputClass = "h-8 text-sm";

    if (resolvedType === "select" && (attr.options?.length ?? 0) > 0) {
      return (
        <div className={STACK[density]}>
          <FieldLabel label={label} icon={icon} />
          <Select
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              const next = textValue(e.target.value);
              setDraft(e.target.value);
              // A select saves on change.
              if (textChanged(next, value ?? null)) void trySave(onSave!, { [field]: next });
              close();
            }}
            onKeyDown={handleKeyDown}
            onBlur={cancel}
            className={inputClass}
          >
            {(attr.options as { value: string; label: string }[]).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      );
    }

    if (isNumber) {
      const errorText = numError ? fieldErrorText(label || field, numError, attr, adapterFor(attr)) : undefined;
      return (
        <div className={STACK[density]}>
          <FieldLabel label={label} icon={icon} />
          <div ref={numberBoxRef} onKeyDown={handleKeyDown} title={errorText}>
            <FieldInput
              attr={attr.type === "number" ? attr : { ...attr, type: "number" }}
              value={numDraft}
              onChange={(next) => setNumDraft(next as number | null)}
              onInvalid={setNumError}
              onBlur={() => void save()}
              invalid={numError !== null}
              describedBy={errorText ? errorId : undefined}
              compact
              className="px-2 py-1"
            />
          </div>
          {errorText && (
            <span id={errorId} role="alert" className="text-xs text-destructive">
              {errorText}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className={STACK[density]}>
        <FieldLabel label={label} icon={icon} />
        <Input
          ref={inputRef}
          type={resolvedType === "date" ? "date" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={handleKeyDown}
          size="sm"
          className={inputClass}
        />
      </div>
    );
  }

  return (
    <div className={CLICKABLE[density]} onClick={startEditing}>
      <FieldLabel label={label} icon={icon} />
      <span className={`${valueClassName} flex items-center gap-1.5 ${saving ? "opacity-50" : ""}`}>
        {children ?? (value != null && value !== "" ? String(value) : "-")}
        <PencilHint />
      </span>
    </div>
  );
}

interface BadgeModalFieldProps {
  label: string;
  icon?: DetailIcon;
  currentList: React.ReactNode[];
  draftValues: string[];
  options: { value: string; label: string }[];
  onSave: (values: string[]) => Promise<void>;
  saving?: boolean;
  children?: React.ReactNode;
  valueClassName: string;
  density: DetailDensity;
}

function BadgeModalField({
  label,
  icon,
  currentList,
  draftValues,
  options,
  onSave,
  saving,
  children,
  valueClassName,
  density,
}: BadgeModalFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[]>([]);

  return (
    <DialogButton
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft([...draftValues]);
        setOpen(next);
      }}
      button={
        <div className={CLICKABLE[density]}>
          <FieldLabel label={label} icon={icon} />
          <span className={`${valueClassName} flex items-center gap-1.5 ${saving ? "opacity-50" : ""}`}>
            {currentList.length > 0 ? (
              <span className="flex flex-wrap gap-1">{children || <Chips items={currentList} />}</span>
            ) : (
              "-"
            )}
            <PencilHint />
          </span>
        </div>
      }
      title={`Edit ${label}`}
      size="medium"
    >
      <div className="space-y-4">
        <Combobox
          multiple
          freeSolo
          showBadges
          options={options}
          value={draft}
          onChange={setDraft}
          placeholder={`Search ${label.toLowerCase()}...`}
        />
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-sm rounded-md border border-border text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await onSave(draft);
              setOpen(false);
            }}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </DialogButton>
  );
}
