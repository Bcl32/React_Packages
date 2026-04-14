import * as React from "react";

import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import { useDatabaseMutation } from "@bcl32/hooks/useDatabaseMutation";
import { Button } from "@bcl32/utils/Button";
import { Checkbox } from "@bcl32/utils/Checkbox";
import { Label } from "@bcl32/utils/Label";
import { getFormDefault, type ModelData } from "@bcl32/data-utils";

import { toast } from "sonner";
import { FormElement, type FormData } from "./FormElement";

interface RowSelection {
  [key: string]: boolean;
}

interface BulkEditModelFormProps {
  ModelData: ModelData & { update_api_url: string };
  query_invalidation: string[];
  rowSelection: RowSelection;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelection>>;
  onSuccess?: (selectedIds: string[], enabledData: FormData) => void;
  onClose?: () => void;
}

export function BulkEditModelForm({
  ModelData,
  query_invalidation,
  rowSelection,
  setRowSelection,
  onSuccess,
  onClose,
}: BulkEditModelFormProps) {
  const selectedIds = Object.keys(rowSelection);
  const editableAttributes = ModelData.model_attributes.filter((a) => a.editable);

  const form_defaults: FormData = {};
  editableAttributes.forEach((item) => {
    form_defaults[item.name] = getFormDefault(item);
  });

  const [formData, setFormData] = React.useState<FormData>(form_defaults);
  const [enabledFields, setEnabledFields] = React.useState<Record<string, boolean>>({});

  // For list-type fields, default to merge mode (add to existing)
  const listFieldNames = editableAttributes.filter((a) => a.type === "list").map((a) => a.name);
  const [mergeMode, setMergeMode] = React.useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    listFieldNames.forEach((name) => { defaults[name] = true; });
    return defaults;
  });

  function change_datetime(value: Dayjs | null, name: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
    const element = document.getElementById("input_" + name);
    if (element && value) {
      element.innerText = value.format("MMM, D YYYY - h:mma");
    }
  }

  function toggleField(name: string, checked: boolean) {
    setEnabledFields((prev) => ({ ...prev, [name]: checked }));
  }

  // Build the payload with only enabled fields
  const enabledData: FormData = {};
  for (const key of Object.keys(enabledFields)) {
    if (enabledFields[key]) {
      enabledData[key] = formData[key];
    }
  }

  // Build merge_fields from enabled list-type fields with merge mode on
  const merge_fields = Object.keys(enabledData).filter((key) => mergeMode[key]);
  const payload = { ids: selectedIds, data: enabledData, merge_fields };
  const enabledCount = Object.values(enabledFields).filter(Boolean).length;

  const mutation = useDatabaseMutation(
    ModelData.update_api_url + "/bulk-update",
    payload,
    query_invalidation
  );

  // The submitted ids/data are snapshotted into refs so the success effect can
  // pass them to onSuccess — they're needed even after rowSelection clears.
  const submittedIdsRef = React.useRef<string[]>([]);
  const submittedDataRef = React.useRef<FormData>({});

  // ⚠️ DO NOT mutate rowSelection (or any other state that conditionally
  // mounts this form from a parent) synchronously in handleSubmit.
  //
  // Consumers like DataTable render this form conditionally on
  // `selectedIds.length > 0`. If handleSubmit clears the selection eagerly,
  // the form unmounts before TanStack Query flips `mutation.isSuccess` to
  // true, and the success effect below never runs — onSuccess is silently
  // dropped. (This broke thumbnail regeneration after bulk colour edits in
  // Print-Tracker for weeks before it was root-caused.)
  //
  // Also note: `mutation.mutate()` returns void, not a promise. `await`-ing
  // it is a no-op and gives a false sense of "the POST finished" in code
  // that runs after. Use `mutateAsync()` if you need to await.
  function handleSubmit() {
    submittedIdsRef.current = [...selectedIds];
    submittedDataRef.current = { ...enabledData };
    mutation.mutate();
  }

  // Fires exactly once when mutation.isSuccess flips true. All post-success
  // side effects (toast, close, selection reset, callback) live here so the
  // form is guaranteed to still be mounted when they run.
  React.useEffect(() => {
    if (mutation.isSuccess) {
      const count = (mutation.data as any)?.updated ?? submittedIdsRef.current.length;
      toast.success(`${count} ${count === 1 ? "entry" : "entries"} updated`);
      onClose?.();
      setRowSelection({});
      onSuccess?.(submittedIdsRef.current, submittedDataRef.current);
    }
  }, [mutation.isSuccess]);

  if (selectedIds.length === 0) {
    return <p className="py-2 text-muted-foreground">No rows selected.</p>;
  }

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      <p className="text-sm text-muted-foreground">
        Editing <strong>{selectedIds.length}</strong> selected row{selectedIds.length !== 1 && "s"}.
        Enable the fields you want to change.
      </p>

      <div className="space-y-4">
        {editableAttributes.map((attr) => {
          const enabled = !!enabledFields[attr.name];
          return (
            <div key={attr.name} className="border rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={enabled}
                  onCheckedChange={(checked) => toggleField(attr.name, !!checked)}
                  className="w-5 h-5 border-2"
                  id={`bulk-enable-${attr.name}`}
                />
                <Label htmlFor={`bulk-enable-${attr.name}`} className="capitalize cursor-pointer">
                  {attr.name.replace(/_/g, " ")}
                </Label>
              </div>
              <div className={enabled ? "" : "opacity-40 pointer-events-none"}>
                <FormElement
                  entry_data={attr}
                  change_datetime={change_datetime}
                  formData={formData}
                  setFormData={setFormData}
                />
                {attr.type === "list" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      checked={!!mergeMode[attr.name]}
                      onCheckedChange={(checked) =>
                        setMergeMode((prev) => ({ ...prev, [attr.name]: !!checked }))
                      }
                      className="w-4 h-4"
                      id={`bulk-merge-${attr.name}`}
                    />
                    <Label htmlFor={`bulk-merge-${attr.name}`} className="text-xs text-muted-foreground cursor-pointer">
                      Add to existing (uncheck to replace all)
                    </Label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t">
        <Button
          variant="default"
          onClick={handleSubmit}
          disabled={enabledCount === 0 || mutation.isPending}
        >
          Update {selectedIds.length} Row{selectedIds.length !== 1 && "s"}
        </Button>

        {mutation.isPending && (
          <p className="text-sm text-muted-foreground mt-2">Updating entries...</p>
        )}
        {mutation.isError && (
          <div className="text-sm text-red-600 mt-2">
            An error occurred: {mutation.error?.message}
          </div>
        )}
        {mutation.isSuccess && !onClose && (
          <div className="text-sm text-green-600 mt-2">
            Updated {(mutation.data as any)?.updated ?? selectedIds.length} rows!
          </div>
        )}
      </div>
    </div>
  );
}
