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
  Upload,
  RefreshCw,
  X,
  Loader2,
} from "lucide-react";
import { apiFetch, useGetRequest } from "@bcl32/hooks";
import type { ModelAttribute } from "@bcl32/data-utils";

import { FieldInput } from "./FieldInput";
import { useDebouncedCallback } from "./useDebouncedCallback";
import type { FormData } from "./FormElement";

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
  resolveAssetUrl = (path: string) => path,
}: {
  entry_data: ModelAttribute;
  baseUrl?: string;
  entityLabel?: string;
  // Resolves a relative `media/...` asset URL to a full URL (the consumer wires
  // its API-base helper in). Defaults to identity so the shared package stays
  // framework-agnostic.
  resolveAssetUrl?: (path: string) => string;
  // Accepted for FormElement compatibility; unused (live editing is per-row).
  formData?: FormData;
  setFormData?: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const attr = entry_data as unknown as {
    title?: string;
    name: string;
    sortable?: boolean;
    thumbnail?: boolean;
    sub_fields?: ModelAttribute[];
  };
  const title = attr.title || attr.name;
  const subFields = attr.sub_fields ?? [];
  const sortable = !!attr.sortable;
  // When the collection declares `thumbnail`, each row gets a left-side cached
  // thumbnail (uploaded, or fetched from its link's og:image).
  const showThumbnail = !!attr.thumbnail;

  const categoryField = subFields.find((f) => f.name === "category");
  const categoryOptions =
    (categoryField?.options as { value: string; label: string }[]) ?? [];
  const defaultCategory = categoryOptions[0]?.value ?? "note";
  const categoryLabel = (value: string) =>
    categoryOptions.find((o) => o.value === value)?.label ?? value;

  const [editing, setEditing] = React.useState(false);
  // Per-row thumbnail action state (keyed by row id).
  const [thumbBusy, setThumbBusy] = React.useState<Record<string, boolean>>({});
  const [thumbError, setThumbError] = React.useState<Record<string, string>>({});

  // Fields shown stacked full-width (multi-line text + the URL line); the rest
  // sit inline on the card header next to the controls.
  const isBlockField = (f: ModelAttribute) => f.type === "textarea" || f.name === "url";
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

  // One field's compact input, wired to the per-row debounced editField. The
  // type→widget mapping lives in the shared FieldInput — no bespoke switch here.
  const fieldFor = (row: ResourceRow, f: ModelAttribute) => {
    const isSelect = f.type === "select";
    const value = isSelect
      ? ((row[f.name] as string) || defaultCategory)
      : ((row[f.name] as string) ?? "");
    const placeholder =
      f.type === "textarea"
        ? "Add a note…"
        : f.name === "url"
          ? "https://…"
          : f.type === "string"
            ? f.name[0].toUpperCase() + f.name.slice(1)
            : undefined;
    return (
      <FieldInput
        attr={f}
        compact
        value={value}
        onChange={(v) => editField(row.id, f.name, v)}
        onBlur={flush}
        inputType={f.name === "url" ? "url" : "text"}
        placeholder={placeholder}
        className={isSelect ? "w-40" : ""}
      />
    );
  };

  const thumbSrc = (row: ResourceRow) => {
    const url = (row.thumbnail_url as string) || "";
    return url ? resolveAssetUrl(url) : "";
  };

  // Only the thumbnail fields are taken from the server response, so an in-flight
  // (debounced) text edit on the same row isn't clobbered by a stale value.
  const applyThumb = (rowId: string, updated: ResourceRow) =>
    setRows((rs) =>
      rs.map((r) =>
        r.id === rowId
          ? {
              ...r,
              thumbnail_url: updated.thumbnail_url,
              thumbnail_source: updated.thumbnail_source,
            }
          : r,
      ),
    );

  const runThumbAction = async (rowId: string, req: () => Promise<Response>) => {
    if (!baseUrl) return;
    setThumbError((e) => ({ ...e, [rowId]: "" }));
    setThumbBusy((b) => ({ ...b, [rowId]: true }));
    try {
      const res = await req();
      applyThumb(rowId, (await res.json()) as ResourceRow);
    } catch (err) {
      const msg =
        (err as { message?: string })?.message || "Could not update thumbnail";
      setThumbError((e) => ({ ...e, [rowId]: msg }));
      console.error("Thumbnail action failed:", err);
    } finally {
      setThumbBusy((b) => ({ ...b, [rowId]: false }));
    }
  };

  const fetchThumb = (rowId: string) =>
    runThumbAction(rowId, () =>
      apiFetch(`${baseUrl}/${rowId}/thumbnail/fetch`, { method: "POST" }),
    );

  const clearThumb = (rowId: string) =>
    runThumbAction(rowId, () =>
      apiFetch(`${baseUrl}/${rowId}/thumbnail`, { method: "DELETE" }),
    );

  const uploadThumb = (rowId: string, file: File) =>
    runThumbAction(rowId, async () => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      return apiFetch(`${baseUrl}/${rowId}/thumbnail`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ thumbnail_b64: dataUrl }),
      });
    });

  // Left-side thumbnail cell: the cached image, else the category icon as a
  // placeholder. In edit mode it carries Fetch / Upload / Clear controls — Fetch
  // is hidden once an upload owns the slot ("upload locks it").
  const renderThumb = (
    row: ResourceRow,
    Icon: React.ComponentType<{ className?: string }>,
    editable: boolean,
  ) => {
    const src = thumbSrc(row);
    const source = (row.thumbnail_source as string) || "";
    const rowUrl = (row.url as string) || "";
    const busy = !!thumbBusy[row.id];
    const err = thumbError[row.id];
    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative w-20 h-20">
          {src ? (
            <img
              src={src}
              alt=""
              className="w-20 h-20 rounded object-cover border"
            />
          ) : (
            <div className="w-20 h-20 rounded border bg-muted/40 flex items-center justify-center">
              <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 rounded bg-background/60 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        {editable && (
          <div className="flex items-center gap-0.5">
            {rowUrl && source !== "upload" && (
              <button
                type="button"
                onClick={() => fetchThumb(row.id)}
                disabled={busy}
                className="p-1 rounded hover:bg-accent disabled:opacity-40"
                title="Fetch image from link"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <label
              className="p-1 rounded hover:bg-accent cursor-pointer"
              title="Upload image"
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) uploadThumb(row.id, f);
                }}
              />
            </label>
            {src && (
              <button
                type="button"
                onClick={() => clearThumb(row.id)}
                disabled={busy}
                className="p-1 rounded hover:bg-destructive/10 text-destructive disabled:opacity-40"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {err && (
          <span className="text-[10px] text-destructive text-center leading-tight max-w-[6rem]">
            {err}
          </span>
        )}
      </div>
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
                <div key={row.id} className="bg-card rounded-lg border p-3">
                  <div className="flex gap-3">
                    {showThumbnail && renderThumb(row, Icon, true)}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {!showThumbnail && (
                          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        {inlineFields.map((f) => (
                          <div
                            key={f.name}
                            className={f.name === "title" ? "flex-1" : "shrink-0"}
                          >
                            {fieldFor(row, f)}
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
                              <div className="flex-1">{fieldFor(row, f)}</div>
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
                            fieldFor(row, f)
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
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
                className="bg-card rounded-lg border p-3 flex gap-3"
              >
                {showThumbnail && renderThumb(row, Icon, false)}
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!showThumbnail && (
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-lg text-primary hover:underline truncate"
                      >
                        {titleText || url}
                      </a>
                    ) : (
                      <span className="font-medium text-lg truncate">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
