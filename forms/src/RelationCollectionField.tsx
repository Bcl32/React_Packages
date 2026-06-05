import * as React from "react";
import {
  FileText,
  Link as LinkIcon,
  StickyNote,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Pencil,
  Check,
} from "lucide-react";
import { apiFetch, useGetRequest } from "@bcl32/hooks";
import { Input } from "@bcl32/utils/Input";
import { Select } from "@bcl32/utils/Select";
import type { ModelAttribute } from "@bcl32/data-utils";

import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { useDebouncedCallback } from "./useDebouncedCallback";
import type { FormData } from "./FormElement";

interface SubField {
  name: string;
  type: string;
  options?: { value: string; label: string }[];
}

interface ResourceRow {
  id: string;
  [key: string]: unknown;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: StickyNote,
  link: LinkIcon,
  documentation: FileText,
};

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Generic, inline-editable child-collection field (a `relation_collection`).
 *
 * In **live mode** (`baseUrl` present, i.e. the parent already exists) it loads
 * the collection from `baseUrl`, renders each row as an auto-resizing card, and
 * persists edits per-row — a debounced PATCH sends only the changed field(s) of
 * the single edited row, so large notes on other rows are never re-sent. Add and
 * delete hit the same endpoint. Sub-fields are rendered with the same input
 * primitives the rest of the form system uses.
 *
 * In **create mode** (no `baseUrl`, e.g. inside an Add modal where the parent
 * doesn't exist yet) it renders a disabled notice — resources are added from the
 * detail page once the parent is saved.
 */
export function RelationCollectionField({
  entry_data,
  baseUrl,
  entityLabel = "record",
}: {
  entry_data: ModelAttribute;
  baseUrl?: string;
  entityLabel?: string;
  // Accepted for FormElement compatibility; unused (live editing is per-row).
  formData?: FormData;
  setFormData?: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const attr = entry_data as unknown as {
    title?: string;
    name: string;
    sortable?: boolean;
    sub_fields?: SubField[];
  };
  const title = attr.title || attr.name;
  const subFields = attr.sub_fields ?? [];
  const sortable = !!attr.sortable;

  const categoryField = subFields.find((f) => f.name === "category");
  const categoryOptions = categoryField?.options ?? [];
  const defaultCategory = categoryOptions[0]?.value ?? "note";
  const categoryLabel = (value: string) =>
    categoryOptions.find((o) => o.value === value)?.label ?? value;

  const [editing, setEditing] = React.useState(false);

  // Fields shown stacked full-width (multi-line text + the URL line); the rest
  // sit inline on the card header next to the controls.
  const isBlockField = (f: SubField) => f.type === "textarea" || f.name === "url";
  const inlineFields = subFields.filter((f) => !isBlockField(f));
  const blockFields = subFields.filter(isBlockField);

  const [rows, setRows] = React.useState<ResourceRow[]>([]);
  const pending = React.useRef<Record<string, Record<string, unknown>>>({});
  const seeded = React.useRef(false);

  const { data, isSuccess } = useGetRequest<ResourceRow[]>(baseUrl ?? "", {
    enabled: !!baseUrl,
    queryKey: baseUrl ? [baseUrl] : undefined,
  });

  React.useEffect(() => {
    seeded.current = false;
  }, [baseUrl]);
  React.useEffect(() => {
    if (isSuccess && data && !seeded.current) {
      setRows(data);
      seeded.current = true;
    }
  }, [isSuccess, data]);

  const doFlush = React.useCallback(async () => {
    if (!baseUrl) return;
    const batch = pending.current;
    pending.current = {};
    await Promise.all(
      Object.entries(batch).map(([id, patch]) =>
        apiFetch(`${baseUrl}/${id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(patch),
        }).catch((err) => console.error("Failed to save resource:", err)),
      ),
    );
  }, [baseUrl]);

  const { debounced: scheduleFlush, flush } = useDebouncedCallback(() => {
    void doFlush();
  }, 500);

  const editField = (id: string, field: string, value: unknown) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    pending.current[id] = { ...(pending.current[id] || {}), [field]: value };
    scheduleFlush();
  };

  const addRow = async () => {
    if (!baseUrl) return;
    flush();
    try {
      const res = await apiFetch(baseUrl, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ category: defaultCategory }),
      });
      const created = (await res.json()) as ResourceRow;
      setRows((rs) => [...rs, created]);
    } catch (err) {
      console.error("Failed to add resource:", err);
    }
  };

  const deleteRow = async (id: string) => {
    if (!baseUrl) return;
    flush();
    delete pending.current[id];
    try {
      await apiFetch(`${baseUrl}/${id}`, { method: "DELETE" });
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete resource:", err);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!baseUrl) return;
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[index], next[j]] = [next[j], next[index]];
    setRows(next);
    flush();
    try {
      await apiFetch(`${baseUrl}/reorder`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ ordered_ids: next.map((r) => r.id) }),
      });
    } catch (err) {
      console.error("Failed to reorder resources:", err);
    }
  };

  const renderControl = (row: ResourceRow, f: SubField) => {
    const value = (row[f.name] as string) ?? "";
    const common = {
      onBlur: () => flush(),
    };
    if (f.type === "textarea") {
      return (
        <AutoGrowTextarea
          value={value}
          placeholder="Add a note…"
          onChange={(e) => editField(row.id, f.name, e.target.value)}
          {...common}
        />
      );
    }
    if (f.type === "select") {
      return (
        <Select
          value={value || defaultCategory}
          onChange={(e) => editField(row.id, f.name, e.target.value)}
          className="h-8 w-40 text-sm"
        >
          {(f.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    }
    // string (incl. url)
    const isUrl = f.name === "url";
    return (
      <Input
        type={isUrl ? "url" : "text"}
        value={value}
        placeholder={isUrl ? "https://…" : f.name[0].toUpperCase() + f.name.slice(1)}
        onChange={(e) => editField(row.id, f.name, e.target.value)}
        className="h-8 text-sm"
        {...common}
      />
    );
  };

  if (!baseUrl) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="bg-card rounded-lg border p-4 text-sm text-muted-foreground">
          Save the {entityLabel} first to add notes &amp; resources.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-primary text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4" />
              Add resource
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              flush();
              setEditing((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border text-foreground hover:bg-accent"
          >
            {editing ? (
              <>
                <Check className="w-4 h-4" /> Done
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" /> Edit
              </>
            )}
          </button>
        </div>
      </div>

      {editing ? (
        rows.length === 0 ? (
          <div className="bg-card rounded-lg border p-6 text-center text-muted-foreground">
            No notes yet. Click “Add resource” to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const cat = (row.category as string) || defaultCategory;
              const Icon = CATEGORY_ICONS[cat] || StickyNote;
              const url = (row.url as string) || "";
              return (
                <div key={row.id} className="bg-card rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    {inlineFields.map((f) => (
                      <div
                        key={f.name}
                        className={f.name === "title" ? "flex-1" : "shrink-0"}
                      >
                        {renderControl(row, f)}
                      </div>
                    ))}
                    {sortable && (
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === rows.length - 1}
                          className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteRow(row.id)}
                      className="p-1 rounded hover:bg-destructive/10 shrink-0"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>

                  {blockFields.map((f) => (
                    <div key={f.name}>
                      {f.name === "url" ? (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1">{renderControl(row, f)}</div>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-accent text-primary shrink-0"
                              title="Open link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        renderControl(row, f)
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )
      ) : rows.length === 0 ? (
        <div className="bg-card rounded-lg border p-6 text-center text-muted-foreground">
          No notes yet. Click “Edit” to add assembly comments, links, and documentation.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((row) => {
            const cat = (row.category as string) || defaultCategory;
            const Icon = CATEGORY_ICONS[cat] || StickyNote;
            const url = (row.url as string) || "";
            const titleText = (row.title as string) || "";
            const note = (row.note as string) || "";
            return (
              <div
                key={row.id}
                className="bg-card rounded-lg border p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sm text-primary hover:underline truncate"
                    >
                      {titleText || url}
                    </a>
                  ) : (
                    <span className="font-medium text-sm truncate">
                      {titleText || "Untitled"}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                    {categoryLabel(cat)}
                  </span>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary shrink-0"
                      title="Open link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                {note && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
