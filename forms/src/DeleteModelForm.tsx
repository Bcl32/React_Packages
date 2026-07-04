import * as React from "react";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@bcl32/hooks/ApiError";
import { apiFetch } from "@bcl32/hooks/apiFetch";
import { Trash2 } from "lucide-react";
import { Button } from "@bcl32/utils/Button";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";

interface RowSelection {
  [key: string]: boolean;
}

interface DeleteModelFormProps {
  delete_api_url: string;
  query_invalidation: string[];
  rowSelection: RowSelection;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelection>>;
  onClose?: () => void;
  onSuccess?: () => void;
}

/** A row that the API refused to delete because of referencing rows.
 *
 * The `links` array is the schema-agnostic blocker description: each entry
 * names a relation type and its row count. The backend chooses the labels
 * (e.g. "project items", "plate items", "subscriptions"); this component
 * just renders them. Any consumer of this form can adopt the conflict UX
 * without changing the shared package. */
interface BlockedEntry {
  id: string;
  name?: string | null;
  links?: Array<{ label: string; count: number }>;
  [key: string]: unknown;
}

/** "3 project items + 1 plate item" — joins all non-zero link counts.
 * Labels arrive singular from the backend; we pluralise here on render. */
function describeLinkedRecords(b: BlockedEntry): string {
  const pieces = (b.links ?? [])
    .filter((l) => l.count > 0)
    .map((l) => `${l.count} ${l.label}${l.count === 1 ? "" : "s"}`);
  return pieces.length ? pieces.join(" + ") : "—";
}

/** Sum of every link count across every blocked row — drives the cascade
 * card's "deletes N + L" badge and the Confirm button's label. */
function totalLinkedFor(blocked: BlockedEntry[]): number {
  return blocked.reduce(
    (n, b) => n + (b.links ?? []).reduce((m, l) => m + (l.count || 0), 0),
    0,
  );
}

interface ConflictDetail {
  code?: string;
  message?: string;
  blocked: BlockedEntry[];
  deletable: string[];
}

function isConflictDetail(d: unknown): d is ConflictDetail {
  return (
    !!d &&
    typeof d === "object" &&
    Array.isArray((d as ConflictDetail).blocked) &&
    Array.isArray((d as ConflictDetail).deletable)
  );
}

interface DeleteVariables {
  ids: string[];
  cascade?: boolean;
}

async function postDelete(
  base_url: string,
  { ids, cascade }: DeleteVariables,
): Promise<{ deleted: number }> {
  // URL constructor handles both absolute and relative `base_url` — the base
  // is only consulted for the relative case (apiUrl() output varies by
  // runtime config). searchParams.set lets us toggle ?cascade=true safely
  // regardless of pre-existing query params or fragments on the URL.
  const url = new URL(base_url, window.location.origin);
  if (cascade) url.searchParams.set("cascade", "true");
  // apiFetch throws ApiError on non-OK responses with status / code / details
  // already parsed off the envelope — no inline error handling needed here.
  const res = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// Sub-component: the conflict view (shown when the API returns a structured 409)
// ---------------------------------------------------------------------------

interface DeleteConflictViewProps {
  conflict: ConflictDetail;
  totalSelected: number;
  isPending: boolean;
  errorMessage?: string | null;
  onSkip: () => void;
  onCascade: () => void;
  onCancel: () => void;
}

/** The "some entries are blocked, choose how to proceed" view. Owns its
 * own `chosen` state — when the parent stops rendering it (conflict cleared
 * by a successful delete), the state resets naturally on unmount. */
function DeleteConflictView({
  conflict,
  totalSelected,
  isPending,
  errorMessage,
  onSkip,
  onCascade,
  onCancel,
}: DeleteConflictViewProps) {
  const [chosen, setChosen] = React.useState<"skip" | "cascade" | null>(null);

  const blockedCount = conflict.blocked.length;
  const skipCount = conflict.deletable.length;
  const totalLinkedItems = totalLinkedFor(conflict.blocked);
  const skipDisabled = skipCount === 0 || isPending;

  const confirmLabel =
    chosen === "skip"
      ? `Delete ${skipCount} entr${skipCount === 1 ? "y" : "ies"}`
      : chosen === "cascade"
        ? `Force delete ${totalSelected} + ${totalLinkedItems} record${totalLinkedItems === 1 ? "" : "s"}`
        : "Confirm";

  const handleConfirm = () => {
    if (chosen === "skip") onSkip();
    else if (chosen === "cascade") onCascade();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          <span aria-hidden className="text-lg leading-none">!</span>
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold leading-tight">
            {blockedCount === totalSelected
              ? `Cannot delete ${blockedCount} of ${totalSelected} entr${totalSelected === 1 ? "y" : "ies"}`
              : `${blockedCount} of ${totalSelected} entries are blocked`}
          </h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            {conflict.message ?? "Linked records prevent deletion."}
          </p>
        </div>
      </div>

      {/* Blocked entries table */}
      <div className="rounded-md border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
          <span>Entry</span>
          <span>Linked records</span>
        </div>
        <div className="max-h-48 overflow-auto divide-y">
          {conflict.blocked.map((b) => (
            <div
              key={b.id}
              className="grid grid-cols-[1fr_auto] gap-x-4 px-3 py-1.5 text-sm"
            >
              <span className="truncate">
                {b.name || (
                  <span className="font-mono text-xs text-muted-foreground">
                    {b.id.slice(0, 8)}…
                  </span>
                )}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {describeLinkedRecords(b)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action choice — Radix ToggleGroup gives us roving-tabindex keyboard
          nav, focus management, and the right ARIA attributes. type="single"
          enforces "pick one of two", and clicking the active item again
          deselects (back to chosen=null) so the user can back out without
          picking the other option. */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Choose how to proceed
        </p>

        <ToggleGroup
          type="single"
          value={chosen ?? ""}
          onValueChange={(v) => setChosen(v === "skip" || v === "cascade" ? v : null)}
          className="flex-col items-stretch gap-2 w-full"
        >
          <ToggleGroupItem
            value="skip"
            disabled={skipDisabled}
            className="block h-auto w-full text-left rounded-md border p-3 hover:bg-accent
                       data-[state=on]:bg-transparent data-[state=on]:text-foreground
                       data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:border-primary"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">Skip blocked entries</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                deletes {skipCount} of {totalSelected}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {skipCount > 0
                ? `Delete only the ${skipCount} unblocked entr${skipCount === 1 ? "y" : "ies"}. Linked records are untouched.`
                : "No unblocked entries — every selected entry has linked records."}
            </p>
          </ToggleGroupItem>

          <ToggleGroupItem
            value="cascade"
            disabled={isPending}
            className="block h-auto w-full text-left rounded-md border border-destructive/40 p-3 hover:bg-destructive/5
                       data-[state=on]:bg-transparent data-[state=on]:text-foreground
                       data-[state=on]:ring-2 data-[state=on]:ring-destructive data-[state=on]:border-destructive"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-destructive">Force delete (cascade)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive tabular-nums">
                deletes {totalSelected} + {totalLinkedItems} linked
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Delete all {totalSelected} entr{totalSelected === 1 ? "y" : "ies"} and remove
              {" "}{totalLinkedItems} linked record{totalLinkedItems === 1 ? "" : "s"}.
              This cannot be undone.
            </p>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isPending && (
        <div className="text-sm text-muted-foreground">Working…</div>
      )}
      {errorMessage && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="default" disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant={chosen === "cascade" ? "danger" : "default"}
          size="default"
          disabled={chosen === null || isPending}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DeleteModelForm({
  delete_api_url,
  query_invalidation,
  rowSelection,
  setRowSelection,
  onClose,
  onSuccess,
}: DeleteModelFormProps) {
  const queryClient = useQueryClient();
  const selectedIds = React.useMemo(() => Object.keys(rowSelection), [rowSelection]);

  const mutation = useMutation<{ deleted: number }, ApiError, DeleteVariables>({
    mutationFn: (vars) => postDelete(delete_api_url, vars),
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: query_invalidation });
      const count = data?.deleted ?? vars.ids.length;
      toast.success(`${count} ${count === 1 ? "entry" : "entries"} deleted`);
      setRowSelection({});
      onClose?.();
      onSuccess?.();
    },
  });

  // Derive the conflict view directly from the mutation error — no separate
  // state means no callback-ordering bugs and no chance of stale conflict
  // info hanging around after a successful delete.
  const conflict: ConflictDetail | null =
    mutation.error?.status === 409 && isConflictDetail(mutation.error.details)
      ? mutation.error.details
      : null;

  // Plain (non-conflict) error text — only shown in the initial view, since
  // the conflict view renders its own error block.
  const showPlainError = mutation.isError && !conflict;

  if (conflict) {
    return (
      <DeleteConflictView
        conflict={conflict}
        totalSelected={selectedIds.length}
        isPending={mutation.isPending}
        errorMessage={null}
        onSkip={() => mutation.mutate({ ids: conflict.deletable })}
        onCascade={() => mutation.mutate({ ids: selectedIds, cascade: true })}
        onCancel={() => { mutation.reset(); onClose?.(); }}
      />
    );
  }

  return (
    <div>
      <p className="py-2">
        Are you sure you wish to delete the selected rows from the database?
      </p>

      {mutation.isPending && "Deleting Entry..."}
      {showPlainError && (
        <div className="text-sm rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive my-2">
          {mutation.error?.message}
        </div>
      )}

      <Button
        onClick={() => {
          mutation.reset();
          mutation.mutate({ ids: selectedIds });
        }}
        variant="danger"
        size="default"
      >
        <Trash2 size={18} className="mr-1" /> Delete
      </Button>
    </div>
  );
}
