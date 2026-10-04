import * as React from "react";
import {
  FileText,
  Link as LinkIcon,
  StickyNote,
  Plus,
  Trash2,
  ExternalLink,
  Pencil,
  Check,
  Upload,
  RefreshCw,
  X,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, useGetRequest } from "@bcl32/hooks";
import { Input } from "@bcl32/utils/Input";
import type { ModelAttribute } from "@bcl32/data-utils";

import { FieldInput } from "./FieldInput";
import { NoteMarkdown, isLongNote } from "./NoteMarkdown";
import { useDebouncedCallback } from "./useDebouncedCallback";
import { type Group, flatten, groupRows, moveGroup, moveRow, sectionOf } from "./resourceSections";
import type { FormData } from "./FormElement";

interface ResourceRow {
  id: string;
  [key: string]: unknown;
}

/** Which box a row is drawn in: anything with a URL is a link. */
type Box = "link" | "note";

interface Editing {
  id: string;
  // Captured when editing starts, so typing a URL into a note (or a new section
  // name) doesn't move the card mid-keystroke; it moves when editing finishes.
  box: Box;
  section: string;
  focus: "title" | "note";
}

// A heading being named: an existing group (`from`) or a new one (`from: null`).
interface Renaming {
  box: Box;
  from: string | null;
  value: string;
}

type Drag = { kind: "row"; id: string; box: Box } | { kind: "group"; name: string; box: Box };

interface Doomed {
  row: ResourceRow;
  index: number;
  url: string;
  timer: ReturnType<typeof setTimeout>;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: StickyNote,
  link: LinkIcon,
  documentation: FileText,
};

// The fields the two boxes lay out themselves; any other sub-field is shown in
// the editor below them, so a collection with extra columns still edits.
const LAID_OUT = new Set(["title", "note", "category", "url", "section"]);

// Which headings a viewer has folded is theirs, kept per collection in this
// browser — never written to the server.
const FOLD_KEY = (baseUrl: string) => `bcl32-forms.sections:${baseUrl}`;
const foldId = (box: Box, name: string) => `${box}\u0000${name}`;

function readFolded(baseUrl?: string): Set<string> {
  if (!baseUrl) return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(FOLD_KEY(baseUrl)) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// How long a deleted row can be brought back before the DELETE is sent.
const UNDO_MS = 6000;

// Controls that appear on hover (always, on touch screens). FADE keeps their
// room so nothing shifts; SHOW takes none until they appear, for tight rows.
const HOVER_FADE =
  "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";
const HOVER_SHOW =
  "hidden group-hover:flex group-focus-within:flex [@media(hover:none)]:flex";

const ICON_BUTTON =
  "p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const urlOf = (row: ResourceRow) => ((row.url as string) || "").trim();

const isBlank = (row: ResourceRow) =>
  !((row.title as string) || "").trim() &&
  !((row.note as string) || "").trim() &&
  !urlOf(row) &&
  !row.thumbnail_url;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** The part of a URL after its host, trimmed for a subtitle line. */
function pathOf(url: string): string {
  try {
    const u = new URL(url);
    const path = `${u.pathname}${u.search}`.replace(/\/$/, "");
    return path.length > 48 ? `${path.slice(0, 47)}…` : path;
  } catch {
    return "";
  }
}

/** What was typed or pasted, as an absolute http(s) URL — or null if it isn't one. */
function normalizeLink(raw: string): string | null {
  const text = raw.trim();
  if (!text || /\s/.test(text)) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const u = new URL(withScheme);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return u.href;
  } catch {
    return null;
  }
}

// A folded note shows this much before "Show more" (Tailwind's max-h-40).
const FOLD_PX = 160;

/**
 * A note's Markdown, folded behind "Show more" only when it is actually taller
 * than the fold — measured, since a short note with a blank line or a table is
 * not long just because `isLongNote` would give it the whole row.
 */
function FoldedNote({ note }: { note: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollHeight > FOLD_PX + 8);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [note]);

  const folded = overflows && !open;
  return (
    <>
      <div className="relative">
        <div ref={ref} className={folded ? "max-h-40 overflow-hidden" : ""}>
          <NoteMarkdown className="text-sm text-muted-foreground break-words">{note}</NoteMarkdown>
        </div>
        {folded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}

/**
 * Generic, inline-editable child-collection field (a `relation_collection`).
 *
 * In **live mode** (`baseUrl` present, i.e. the parent already exists) it loads
 * the collection from `baseUrl` and draws it as two boxes: **Links** (rows with a
 * URL, a compact list) and **Notes** (everything else, Markdown cards). One item
 * is edited at a time, in place — click a note, or a link's pencil — and edits
 * persist per row: a debounced PATCH sends only the changed field(s) of that one
 * row. Pasting a web address into the Links box creates the row; a deleted row
 * can be undone from the toast for a few seconds before the DELETE is sent.
 * Drag (when the collection is `sortable`) reorders within a box. When the
 * collection carries a `section` field, each box also folds into named
 * sections — the name its rows share — which drag, rename and ungroup.
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
  linkIcon,
}: {
  entry_data: ModelAttribute;
  baseUrl?: string;
  entityLabel?: string;
  // Resolves a relative `media/...` asset URL to a full URL (the consumer wires
  // its API-base helper in). Defaults to identity so the shared package stays
  // framework-agnostic.
  resolveAssetUrl?: (path: string) => string;
  // Optional mark for a link with no thumbnail (a site's logo, say). Return
  // null to fall back to the category icon. Keeps brands out of this package.
  linkIcon?: (url: URL) => React.ReactNode;
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
  // When the collection declares `thumbnail`, rows carry a cached thumbnail
  // (uploaded, or fetched from the link's og:image).
  const showThumbnail = !!attr.thumbnail;

  const fieldNamed = (name: string) => subFields.find((f) => f.name === name);
  const extraFields = subFields.filter((f) => !LAID_OUT.has(f.name));
  const categoryField = fieldNamed("category");
  const categoryOptions =
    (categoryField?.options as { value: string; label: string }[]) ?? [];
  const defaultCategory = categoryOptions[0]?.value ?? "note";
  const hasCategory = (value: string) => categoryOptions.some((o) => o.value === value);
  const linkCategory = hasCategory("link") ? "link" : defaultCategory;
  const noteCategory = hasCategory("note") ? "note" : defaultCategory;
  const categoryLabel = (value: string) =>
    categoryOptions.find((o) => o.value === value)?.label ?? value;
  // Sections are offered only to a collection that stores them.
  const hasSections = !!fieldNamed("section");

  const [rows, setRows] = React.useState<ResourceRow[]>([]);
  const [editing, setEditing] = React.useState<Editing | null>(null);
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved">("idle");
  const [draft, setDraft] = React.useState("");
  const [draftError, setDraftError] = React.useState("");
  // Drag state: `armed` is the row whose grip is pressed (only it is draggable,
  // so text in a card stays selectable); `drag` is the row in flight.
  const [armed, setArmed] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  // Per-row thumbnail action state (keyed by row id).
  const [thumbBusy, setThumbBusy] = React.useState<Record<string, boolean>>({});
  const [thumbError, setThumbError] = React.useState<Record<string, string>>({});
  // Sections: headings added but still empty (they exist only here until an
  // item lands in one), the heading being named, what this viewer has folded,
  // and which section a pasted link goes into.
  const [drafts, setDrafts] = React.useState<Record<Box, string[]>>({ link: [], note: [] });
  const [renaming, setRenaming] = React.useState<Renaming | null>(null);
  const [folded, setFolded] = React.useState<Set<string>>(() => readFolded(baseUrl));
  const [pasteSection, setPasteSection] = React.useState("");

  const pending = React.useRef<Record<string, Record<string, unknown>>>({});
  const doomed = React.useRef(new Map<string, Doomed>());
  const seeded = React.useRef(false);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const pasteRef = React.useRef<HTMLInputElement | null>(null);
  // Latest values for the document listeners and timers, which outlive a render.
  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;
  const editingRef = React.useRef(editing);
  editingRef.current = editing;

  const { data, isSuccess } = useGetRequest<ResourceRow[]>(baseUrl ?? "", {
    enabled: !!baseUrl,
    queryKey: baseUrl ? [baseUrl] : undefined,
  });

  React.useEffect(() => {
    seeded.current = false;
    setEditing(null);
    setDrafts({ link: [], note: [] });
    setRenaming(null);
    setPasteSection("");
    setFolded(readFolded(baseUrl));
  }, [baseUrl]);

  const setFold = (box: Box, name: string, fold: boolean) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (fold) next.add(foldId(box, name));
      else next.delete(foldId(box, name));
      try {
        if (baseUrl) localStorage.setItem(FOLD_KEY(baseUrl), JSON.stringify([...next]));
      } catch {
        // Storage can be unavailable (private window); folding still works for this visit.
      }
      return next;
    });
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
    if (!Object.keys(batch).length) return;
    await Promise.all(
      Object.entries(batch).map(([id, patch]) =>
        apiFetch(`${baseUrl}/${id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(patch),
        }).catch((err: unknown) => console.error("Failed to save resource:", err)),
      ),
    );
    if (!Object.keys(pending.current).length) setSaveState("saved");
  }, [baseUrl]);

  const { debounced: scheduleFlush, flush } = useDebouncedCallback(() => {
    void doFlush();
  }, 500);

  const editField = (id: string, field: string, value: unknown) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    pending.current[id] = { ...(pending.current[id] || {}), [field]: value };
    setSaveState("saving");
    scheduleFlush();
  };

  const createRow = async (body: Record<string, unknown>) => {
    if (!baseUrl) return null;
    flush();
    try {
      const res = await apiFetch(baseUrl, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
      });
      const created = (await res.json()) as ResourceRow;
      setRows((rs) => [...rs, created]);
      return created;
    } catch (err) {
      console.error("Failed to add resource:", err);
      toast.error("Couldn't add that — try again.");
      return null;
    }
  };

  // ── delete, with undo ────────────────────────────────────────────────────

  const restoreRow = (id: string) => {
    const d = doomed.current.get(id);
    if (!d) return;
    clearTimeout(d.timer);
    doomed.current.delete(id);
    setRows((rs) => {
      const next = [...rs];
      next.splice(Math.min(d.index, next.length), 0, d.row);
      return next;
    });
  };

  const commitDelete = React.useCallback((id: string) => {
    const d = doomed.current.get(id);
    if (!d) return;
    clearTimeout(d.timer);
    doomed.current.delete(id);
    apiFetch(d.url, { method: "DELETE" }).catch((err: unknown) => {
      console.error("Failed to delete resource:", err);
      setRows((rs) => [...rs.slice(0, d.index), d.row, ...rs.slice(d.index)]);
      toast.error("Couldn't delete that — it's back.");
    });
  }, []);

  // Leaving the page sends the deletes still waiting on their undo window.
  React.useEffect(() => {
    const commitAll = () => [...doomed.current.keys()].forEach(commitDelete);
    window.addEventListener("pagehide", commitAll);
    return () => {
      window.removeEventListener("pagehide", commitAll);
      commitAll();
    };
  }, [commitDelete]);

  const removeRow = (id: string, undoable = true) => {
    if (!baseUrl) return;
    flush();
    delete pending.current[id];
    const index = rowsRef.current.findIndex((r) => r.id === id);
    if (index < 0) return;
    const row = rowsRef.current[index];
    setRows((rs) => rs.filter((r) => r.id !== id));
    if (editingRef.current?.id === id) setEditing(null);
    if (!undoable) {
      apiFetch(`${baseUrl}/${id}`, { method: "DELETE" }).catch((err: unknown) =>
        console.error("Failed to delete resource:", err),
      );
      return;
    }
    const timer = setTimeout(() => commitDelete(id), UNDO_MS);
    doomed.current.set(id, { row, index, url: `${baseUrl}/${id}`, timer });
    const label = ((row.title as string) || "").trim() || hostOf(urlOf(row));
    toast(label ? `Deleted “${label}”` : "Deleted", {
      duration: UNDO_MS,
      action: { label: "Undo", onClick: () => restoreRow(id) },
    });
  };

  // ── editing one item in place ────────────────────────────────────────────

  const boxOf = (row: ResourceRow): Box =>
    editing?.id === row.id ? editing.box : urlOf(row) ? "link" : "note";

  const finishEditing = () => {
    const current = editingRef.current;
    if (!current) return;
    flush();
    setEditing(null);
    const row = rowsRef.current.find((r) => r.id === current.id);
    // A note opened and left empty is a slip, not a record.
    if (row && isBlank(row)) removeRow(row.id, false);
  };
  const finishRef = React.useRef(finishEditing);
  finishRef.current = finishEditing;

  const startEditing = (row: ResourceRow, focus: Editing["focus"]) => {
    if (editingRef.current?.id === row.id) return;
    finishEditing();
    setSaveState("idle");
    setEditing({ id: row.id, box: urlOf(row) ? "link" : "note", section: sectionOf(row), focus });
  };

  // Click anywhere outside the open editor to finish it.
  React.useEffect(() => {
    if (!editing) return;
    const onDown = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        finishRef.current();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [editing]);

  // Put the caret where the person meant to type.
  React.useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => {
      const el = editorRef.current?.querySelector<HTMLElement>(
        editing.focus === "note" ? "textarea" : "input:not([type=file])",
      );
      el?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  const addNote = async (section = "") => {
    const created = await createRow({
      category: noteCategory,
      ...(hasSections && section ? { section } : {}),
    });
    if (created) {
      settleDraft("note", section);
      if (section) setFold("note", section, false);
      setSaveState("idle");
      setEditing({ id: created.id, box: "note", section, focus: "title" });
    }
  };

  const submitLink = async (raw: string) => {
    const url = normalizeLink(raw);
    if (!url) {
      setDraftError("That doesn't look like a web address.");
      return;
    }
    setDraftError("");
    setDraft("");
    const section = hasSections ? pasteSection : "";
    const created = await createRow({ category: linkCategory, url, ...(section ? { section } : {}) });
    if (created && section) {
      settleDraft("link", section);
      setFold("link", section, false);
    }
    if (created && showThumbnail) {
      // Most pages offer a preview image; one that doesn't simply keeps its icon.
      void runThumbAction(
        created.id,
        () => apiFetch(`${baseUrl}/${created.id}/thumbnail/fetch`, { method: "POST" }),
        true,
      );
    }
  };

  // ── order ────────────────────────────────────────────────────────────────

  const commitOrder = async (next: ResourceRow[]) => {
    if (!baseUrl) return;
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

  // ── sections ─────────────────────────────────────────────────────────────

  const sectionKey = (row: ResourceRow) =>
    !hasSections ? "" : editing?.id === row.id ? editing.section : sectionOf(row);

  const groupsFor = (box: Box): Group<ResourceRow>[] =>
    groupRows(
      rows.filter((r) => boxOf(r) === box),
      sectionKey,
      hasSections ? drafts[box] : [],
    );

  // A draft heading becomes real the moment something is in it.
  const settleDraft = (box: Box, name: string) =>
    name && setDrafts((d) => ({ ...d, [box]: d[box].filter((n) => n !== name) }));

  // The two boxes share one stored order; a box's groups are flattened, any
  // row whose section changed is patched, and the boxes are written back
  // links-first (their interleaving is never shown).
  const commitGroups = (box: Box, groups: Group<ResourceRow>[]) => {
    const changed = new Map<string, string>();
    for (const g of groups) {
      for (const r of g.rows) if (sectionOf(r) !== g.name) changed.set(r.id, g.name);
    }
    for (const [id, name] of changed) editField(id, "section", name || null);
    const list = flatten(groups).map((r) =>
      changed.has(r.id) ? { ...r, section: changed.get(r.id) || null } : r,
    );
    const other = rows.filter((r) => boxOf(r) !== box);
    for (const g of groups) if (g.rows.length) settleDraft(box, g.name);
    void commitOrder(box === "link" ? [...list, ...other] : [...other, ...list]);
  };

  const moveRowTo = (box: Box, id: string, to: string, index: number) =>
    commitGroups(box, moveRow(groupsFor(box), id, to, index));

  const renameSection = (box: Box, from: string | null, raw: string) => {
    setRenaming(null);
    const name = raw.trim().slice(0, 80);
    if (!name || name === from) return;
    if (from === null) {
      // A new, empty heading: drawn now, stored once an item goes in.
      if (!groupsFor(box).some((g) => g.name === name)) {
        setDrafts((d) => ({ ...d, [box]: [...d[box], name] }));
      }
      return;
    }
    if (folded.has(foldId(box, from))) {
      setFold(box, from, false);
      setFold(box, name, true);
    }
    setDrafts((d) => ({ ...d, [box]: d[box].map((n) => (n === from ? name : n)) }));
    const groups = groupsFor(box).map((g) => (g.name === from ? { ...g, name } : g));
    // Renaming onto an existing name merges the two.
    const merged: Group<ResourceRow>[] = [];
    for (const g of groups) {
      const seen = merged.find((m) => m.name === g.name);
      if (seen) seen.rows.push(...g.rows);
      else merged.push({ name: g.name, rows: [...g.rows] });
    }
    commitGroups(box, merged);
  };

  // Ungroup: the heading goes, its items join the unnamed group at its end.
  const ungroupSection = (box: Box, name: string) => {
    setDrafts((d) => ({ ...d, [box]: d[box].filter((n) => n !== name) }));
    if (pasteSection === name) setPasteSection("");
    const groups = groupsFor(box);
    const leaving = groups.find((g) => g.name === name)?.rows ?? [];
    if (!leaving.length) return;
    commitGroups(
      box,
      groups
        .filter((g) => g.name !== name)
        .map((g) => (g.name === "" ? { ...g, rows: [...g.rows, ...leaving] } : g)),
    );
  };

  const endDrag = () => {
    setDrag(null);
    setOverId(null);
    setArmed(null);
  };

  const dragProps = (row: ResourceRow, box: Box, group: Group<ResourceRow>, index: number) =>
    sortable
      ? {
          draggable: armed === row.id,
          onDragStart: (e: React.DragEvent) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", row.id);
            setDrag({ kind: "row", id: row.id, box });
          },
          onDragOver: (e: React.DragEvent) => {
            if (drag?.kind === "row" && drag.box === box && drag.id !== row.id) {
              e.preventDefault();
              setOverId(row.id);
            }
          },
          onDragLeave: () => setOverId((o) => (o === row.id ? null : o)),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (drag?.kind === "row" && drag.box === box) moveRowTo(box, drag.id, group.name, index);
            endDrag();
          },
          onDragEnd: endDrag,
        }
      : {};

  // A heading takes a dropped item (into the end of its section) and a dropped
  // heading (the sections swap places).
  const headerDropId = (box: Box, name: string) => `hdr:${box}:${name}`;
  const headerDragProps = (box: Box, group: Group<ResourceRow>) =>
    sortable
      ? {
          draggable: armed === headerDropId(box, group.name),
          onDragStart: (e: React.DragEvent) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", group.name);
            setDrag({ kind: "group", name: group.name, box });
          },
          onDragOver: (e: React.DragEvent) => {
            if (!drag || drag.box !== box) return;
            if (drag.kind === "group" && drag.name === group.name) return;
            e.preventDefault();
            setOverId(headerDropId(box, group.name));
          },
          onDragLeave: () =>
            setOverId((o) => (o === headerDropId(box, group.name) ? null : o)),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            if (drag?.box === box) {
              if (drag.kind === "row") moveRowTo(box, drag.id, group.name, group.rows.length);
              else commitGroups(box, moveGroup(groupsFor(box), drag.name, group.name));
              if (drag.kind === "row") setFold(box, group.name, false);
            }
            endDrag();
          },
          onDragEnd: endDrag,
        }
      : {};

  const dragClass = (row: ResourceRow) =>
    drag?.kind === "row" && drag.id === row.id
      ? " opacity-40"
      : overId === row.id
        ? " ring-2 ring-primary/60"
        : "";

  const grip = (
    row: ResourceRow,
    box: Box,
    group: Group<ResourceRow>,
    index: number,
    extra = "",
  ) =>
    sortable && (
      <button
        type="button"
        aria-label="Drag to reorder (Alt+↑/↓ to move)"
        title="Drag to reorder"
        onPointerDown={() => setArmed(row.id)}
        onPointerUp={() => setArmed(null)}
        onKeyDown={(e) => {
          if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
          e.preventDefault();
          const to = index + (e.key === "ArrowUp" ? -1 : 1);
          if (to >= 0 && to < group.rows.length) moveRowTo(box, row.id, group.name, to);
        }}
        className={`${ICON_BUTTON} cursor-grab active:cursor-grabbing shrink-0 ${HOVER_FADE} ${extra}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>
    );

  // ── fields and thumbnails ────────────────────────────────────────────────

  // One field's compact input, wired to the per-row debounced editField. The
  // type→widget mapping lives in the shared FieldInput — no bespoke switch here.
  const fieldFor = (row: ResourceRow, f: ModelAttribute) => {
    const isSelect = f.type === "select";
    const value = isSelect
      ? ((row[f.name] as string) || defaultCategory)
      : ((row[f.name] as string) ?? "");
    const placeholder =
      f.type === "textarea"
        ? "Write a note… (Markdown supported)"
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
        className={isSelect ? "w-36" : ""}
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

  const runThumbAction = async (
    rowId: string,
    req: () => Promise<Response>,
    quiet = false,
  ) => {
    if (!baseUrl) return;
    setThumbError((e) => ({ ...e, [rowId]: "" }));
    setThumbBusy((b) => ({ ...b, [rowId]: true }));
    try {
      const res = await req();
      applyThumb(rowId, (await res.json()) as ResourceRow);
    } catch (err) {
      if (!quiet) {
        const msg =
          (err as { message?: string })?.message || "Could not update thumbnail";
        setThumbError((e) => ({ ...e, [rowId]: msg }));
        console.error("Thumbnail action failed:", err);
      }
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

  const uploadControl = (row: ResourceRow, label = "") => (
    <label className={`${ICON_BUTTON} inline-flex items-center gap-1 cursor-pointer`} title="Upload image">
      <Upload className="w-3.5 h-3.5" />
      {label && <span className="text-xs">{label}</span>}
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
  );

  // The thumbnail cell: the cached image, else the category icon. In the editor
  // it carries Fetch / Upload / Clear — Fetch is hidden once an upload owns the
  // slot ("upload locks it").
  const renderThumb = (
    row: ResourceRow,
    Icon: React.ComponentType<{ className?: string }>,
    editable: boolean,
  ) => {
    const src = thumbSrc(row);
    const source = (row.thumbnail_source as string) || "";
    const busy = !!thumbBusy[row.id];
    const err = thumbError[row.id];
    return (
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative w-20 h-20">
          {src ? (
            <img src={src} alt="" className="w-20 h-20 rounded-md object-cover border" />
          ) : (
            <div className="w-20 h-20 rounded-md border bg-muted/40 flex items-center justify-center">
              <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 rounded-md bg-background/60 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        {editable && (
          <div className="flex items-center gap-0.5">
            {urlOf(row) && source !== "upload" && (
              <button
                type="button"
                onClick={() => fetchThumb(row.id)}
                disabled={busy}
                className={`${ICON_BUTTON} disabled:opacity-40`}
                title="Fetch image from link"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            {uploadControl(row)}
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

  const deleteButton = (row: ResourceRow, extra = "") => (
    <button
      type="button"
      onClick={() => removeRow(row.id)}
      className={`p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 ${extra}`}
      title="Delete"
      aria-label="Delete"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );

  // ── the editor (one item at a time) ──────────────────────────────────────

  const renderEditor = (row: ResourceRow, box: Box) => {
    const cat = (row.category as string) || defaultCategory;
    const Icon = CATEGORY_ICONS[cat] || StickyNote;
    const titleField = fieldNamed("title");
    const urlField = fieldNamed("url");
    const noteField = fieldNamed("note");
    return (
      <div
        key={row.id}
        ref={editorRef}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            finishEditing();
          }
        }}
        className={`rounded-lg border border-primary/50 bg-background p-3 shadow-sm ring-2 ring-primary/10${
          box === "note" ? " col-span-full" : ""
        }`}
      >
        <div className="flex gap-3">
          {/* A link's picture is its preview, worth the room; a note shows one only once it has it. */}
          {showThumbnail && (box === "link" || !!row.thumbnail_url) && renderThumb(row, Icon, true)}
          <div className="flex-1 min-w-0 space-y-2">
            {titleField && fieldFor(row, titleField)}
            {box === "link" && urlField && (
              <div className="flex items-center gap-2">
                <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">{fieldFor(row, urlField)}</div>
              </div>
            )}
            {extraFields.map((f) => (
              <div key={f.name}>{fieldFor(row, f)}</div>
            ))}
            {noteField && fieldFor(row, noteField)}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {categoryField && categoryOptions.length > 1 && (
                <div className="shrink-0">{fieldFor(row, categoryField)}</div>
              )}
              {hasSections && (
                <>
                  <Input
                    size="sm"
                    variant="background"
                    className="w-36 shrink-0"
                    list={`sections-${row.id}`}
                    value={(row.section as string) ?? ""}
                    placeholder="Section"
                    aria-label="Section"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      editField(row.id, "section", e.target.value)
                    }
                    onBlur={flush}
                  />
                  <datalist id={`sections-${row.id}`}>
                    {groupsFor(box)
                      .filter((g) => g.name)
                      .map((g) => (
                        <option key={g.name} value={g.name} />
                      ))}
                  </datalist>
                </>
              )}
              {showThumbnail && box === "note" && !row.thumbnail_url && uploadControl(row)}
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" aria-live="polite">
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : "Esc to finish"}
              </span>
              {deleteButton(row)}
              <button
                type="button"
                onClick={finishEditing}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border hover:bg-accent shrink-0"
              >
                <Check className="w-3.5 h-3.5" /> Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── the two boxes ────────────────────────────────────────────────────────

  const renderLink = (group: Group<ResourceRow>) => (row: ResourceRow, index: number) => {
    if (editing?.id === row.id) return renderEditor(row, "link");
    const url = urlOf(row);
    const cat = (row.category as string) || defaultCategory;
    const Icon = CATEGORY_ICONS[cat] || LinkIcon;
    const titleText = ((row.title as string) || "").trim();
    const host = hostOf(url);
    const note = ((row.note as string) || "").trim();
    const src = thumbSrc(row);
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      parsed = null;
    }
    const custom = !src && parsed && linkIcon ? linkIcon(parsed) : null;
    return (
      <li
        key={row.id}
        {...dragProps(row, "link", group, index)}
        className={`group relative flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-accent/50${dragClass(row)}`}
      >
        {/* In the box's left margin, so the list isn't indented for it. */}
        {grip(row, "link", group, index, "absolute -left-[18px] top-1/2 -translate-y-1/2 px-0")}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
          {src ? (
            <img src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            custom ?? <Icon className="h-5 w-5 text-primary" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
          >
            {titleText || host || url}
          </a>
          <div className="truncate text-xs text-muted-foreground">
            {titleText ? host : pathOf(url) || host}
            {cat !== linkCategory && ` · ${categoryLabel(cat)}`}
          </div>
          {note && <div className="truncate text-xs text-muted-foreground/80">{note}</div>}
        </div>
        <div className={`items-center ${HOVER_SHOW}`}>
          <button
            type="button"
            onClick={() => startEditing(row, "title")}
            className={ICON_BUTTON}
            title="Edit"
            aria-label="Edit link"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {/* On a touch screen the row keeps only the pencil; delete is in the editor. */}
          {deleteButton(row, "[@media(hover:none)]:hidden")}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${ICON_BUTTON} text-primary`}
          title="Open link"
          aria-hidden="true"
          tabIndex={-1}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </li>
    );
  };

  const renderNote = (group: Group<ResourceRow>) => (row: ResourceRow, index: number) => {
    if (editing?.id === row.id) return renderEditor(row, "note");
    const cat = (row.category as string) || defaultCategory;
    const Icon = CATEGORY_ICONS[cat] || StickyNote;
    const titleText = ((row.title as string) || "").trim();
    const note = (row.note as string) || "";
    const long = isLongNote(note);
    const edit = (e: React.MouseEvent) => {
      // Links inside the note, the card's buttons and a text selection keep
      // their own meaning; any other click opens the note for editing.
      if ((e.target as Element).closest("a,button,input,textarea,select,label")) return;
      if (window.getSelection()?.toString()) return;
      startEditing(row, "note");
    };
    return (
      <div
        key={row.id}
        {...dragProps(row, "note", group, index)}
        onClick={edit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target === e.currentTarget) startEditing(row, "note");
        }}
        tabIndex={0}
        aria-label={`Edit note${titleText ? `: ${titleText}` : ""}`}
        className={`group relative min-w-0 cursor-text rounded-lg border bg-background p-3 transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring${
          long ? " col-span-full" : ""
        }${dragClass(row)}`}
      >
        {/* Floated over the corner, so a note's text uses the card's full width. */}
        <div className={`absolute right-1.5 top-1.5 items-center rounded-md bg-background ${HOVER_SHOW}`}>
          {grip(row, "note", group, index)}
          {deleteButton(row)}
        </div>
        <div>
          <div className="min-w-0">
            {(titleText || cat !== noteCategory) && (
              <div className="mb-1 flex items-center gap-2 pr-14">
                {titleText && <span className="truncate font-medium">{titleText}</span>}
                {cat !== noteCategory && (
                  <span className="shrink-0 rounded-full border px-1.5 py-px text-[10px] uppercase tracking-wide text-muted-foreground">
                    {categoryLabel(cat)}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-3">
              {showThumbnail && !!row.thumbnail_url && renderThumb(row, Icon, false)}
              <div className="min-w-0 flex-1">
                {note ? (
                  <FoldedNote note={note} />
                ) : (
                  !titleText && <span className="text-sm italic text-muted-foreground">Empty note</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!baseUrl) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="bg-card rounded-lg border p-4 text-sm text-muted-foreground">
          Save the {entityLabel} first to add notes &amp; links.
        </div>
      </div>
    );
  }

  const linkGroups = groupsFor("link");
  const noteGroups = groupsFor("note");
  const linkCount = linkGroups.reduce((n, g) => n + g.rows.length, 0);
  const noteCount = noteGroups.reduce((n, g) => n + g.rows.length, 0);

  const boxHeader = (
    Icon: React.ComponentType<{ className?: string }>,
    label: string,
    count: number,
    onAdd: () => void,
    addLabel: string,
  ) => (
    <div className="mb-2 flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h4 className="text-sm font-semibold">{label}</h4>
      {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
      <button
        type="button"
        onClick={onAdd}
        className={`${ICON_BUTTON} ml-auto`}
        title={addLabel}
        aria-label={addLabel}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );

  const nameInput = (r: Renaming) => (
    <input
      autoFocus
      value={r.value}
      maxLength={80}
      placeholder="Section name"
      aria-label="Section name"
      onChange={(e) => setRenaming({ ...r, value: e.target.value })}
      onBlur={() => renameSection(r.box, r.from, r.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") renameSection(r.box, r.from, r.value);
        if (e.key === "Escape") setRenaming(null);
      }}
      className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );

  // One section's heading: fold toggle, name, count, and on hover add-into,
  // rename, ungroup and a grip to move the whole section.
  const sectionHeader = (box: Box, group: Group<ResourceRow>) => {
    const isFolded = folded.has(foldId(box, group.name));
    const naming = renaming && renaming.box === box && renaming.from === group.name ? renaming : null;
    const dropId = headerDropId(box, group.name);
    return (
      <div
        {...headerDragProps(box, group)}
        className={`group flex items-center gap-1 rounded-md py-1 pr-1 transition-colors${
          overId === dropId ? " bg-accent/50 ring-2 ring-primary/60" : ""
        }${drag?.kind === "group" && drag.box === box && drag.name === group.name ? " opacity-40" : ""}`}
      >
        <button
          type="button"
          onClick={() => setFold(box, group.name, !isFolded)}
          aria-expanded={!isFolded}
          aria-label={`${isFolded ? "Expand" : "Collapse"} ${group.name}`}
          className="flex min-w-0 items-center gap-1 rounded text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isFolded ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          {!naming && <span className="truncate">{group.name}</span>}
        </button>
        {naming ? nameInput(naming) : <span className="text-xs text-muted-foreground">{group.rows.length}</span>}
        {!naming && (
          <div className={`ml-auto items-center ${HOVER_SHOW}`}>
            <button
              type="button"
              onClick={() => {
                if (box === "note") void addNote(group.name);
                else {
                  setPasteSection(group.name);
                  pasteRef.current?.focus();
                }
              }}
              className={ICON_BUTTON}
              title={box === "note" ? `Add a note to ${group.name}` : `Add a link to ${group.name}`}
              aria-label={box === "note" ? `Add a note to ${group.name}` : `Add a link to ${group.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setRenaming({ box, from: group.name, value: group.name })}
              className={ICON_BUTTON}
              title="Rename section"
              aria-label={`Rename ${group.name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => ungroupSection(box, group.name)}
              className={ICON_BUTTON}
              title="Remove the heading (its items stay)"
              aria-label={`Ungroup ${group.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {sortable && (
              <button
                type="button"
                onPointerDown={() => setArmed(dropId)}
                onPointerUp={() => setArmed(null)}
                className={`${ICON_BUTTON} cursor-grab active:cursor-grabbing`}
                title="Drag to move this section"
                aria-label={`Move ${group.name}`}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // The "+ Section" control at the foot of a box, or the box's new-heading input.
  const addSection = (box: Box) =>
    hasSections &&
    (renaming && renaming.box === box && renaming.from === null ? (
      <div className="mt-2 flex items-center gap-1">
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        {nameInput(renaming)}
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setRenaming({ box, from: null, value: "" })}
        className="mt-2 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Section
      </button>
    ));

  const emptySection = (what: string) => (
    <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
      Drag {what} here, or use + on the heading.
    </p>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-label="Links" className="min-w-0 rounded-xl border bg-card p-4 pl-5">
          {boxHeader(LinkIcon, "Links", linkCount, () => pasteRef.current?.focus(), "Add a link")}
          <div className="mb-2 space-y-1">
            {linkGroups.map((g) => {
              const open = !g.name || !folded.has(foldId("link", g.name));
              return (
                <div key={g.name || "\u0000"}>
                  {g.name && sectionHeader("link", g)}
                  {open && g.rows.length > 0 && (
                    <ul className={`-mr-1.5 space-y-0.5${g.name ? " pl-2" : ""}`}>
                      {g.rows.map(renderLink(g))}
                    </ul>
                  )}
                  {open && g.name && !g.rows.length && emptySection("links")}
                </div>
              );
            })}
          </div>
          {hasSections && pasteSection && (
            <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
              Adding to <span className="font-medium text-foreground">{pasteSection}</span>
              <button
                type="button"
                onClick={() => setPasteSection("")}
                className={ICON_BUTTON}
                title="Add to no section"
                aria-label="Add to no section"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitLink(draft);
            }}
          >
            <Input
              ref={pasteRef}
              size="sm"
              variant="background"
              type="text"
              inputMode="url"
              value={draft}
              placeholder="Paste a link to add it, or type one and press Enter"
              aria-label="Add a link"
              aria-invalid={!!draftError}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setDraft(e.target.value);
                if (draftError) setDraftError("");
              }}
              onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                // A clean paste into an empty box is the whole gesture.
                const text = e.clipboardData.getData("text");
                if (!draft && normalizeLink(text)) {
                  e.preventDefault();
                  void submitLink(text);
                }
              }}
            />
            {draftError && <p className="mt-1 text-xs text-destructive">{draftError}</p>}
          </form>
          {addSection("link")}
        </section>

        <section aria-label="Notes" className="min-w-0 rounded-xl border bg-card p-4">
          {boxHeader(StickyNote, "Notes", noteCount, () => void addNote(), "Add a note")}
          {noteGroups.some((g) => g.rows.length || g.name) ? (
            <div className="space-y-3">
              {noteGroups.map((g) => {
                const open = !g.name || !folded.has(foldId("note", g.name));
                if (!g.name && !g.rows.length) return null;
                return (
                  <div key={g.name || "\u0000"} className="space-y-2">
                    {g.name && sectionHeader("note", g)}
                    {open && g.rows.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        {g.rows.map(renderNote(g))}
                      </div>
                    )}
                    {open && g.name && !g.rows.length && emptySection("notes")}
                  </div>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void addNote()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add a note
            </button>
          )}
          {addSection("note")}
        </section>
      </div>
    </div>
  );
}
