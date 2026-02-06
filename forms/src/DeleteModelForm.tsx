import * as React from "react";

import { useDatabaseMutation } from "@bcl32/hooks/useDatabaseMutation";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "@bcl32/utils/Button";

interface RowSelection {
  [key: string]: boolean;
}

interface DeleteModelFormProps {
  delete_api_url: string;
  query_invalidation: string[];
  rowSelection: RowSelection;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelection>>;
}

export function DeleteModelForm({
  delete_api_url,
  query_invalidation,
  rowSelection,
}: DeleteModelFormProps) {
  const mutation_delete_entry = useDatabaseMutation(
    delete_api_url,
    Object.keys(rowSelection),
    query_invalidation
  );

  async function delete_entries() {
    await mutation_delete_entry.mutate();
  }

  return (
    <div>
      <p className="py-2">
        Are you sure you wish to delete the selected rows from the database?
      </p>

      {mutation_delete_entry.isPending && "Deleting Entry..."}
      {mutation_delete_entry.isError && (
        <div style={{ color: "red" }}>
          {mutation_delete_entry.error?.message}
        </div>
      )}
      {mutation_delete_entry.isSuccess && (
        <div style={{ color: "green" }}>
          Success! <p>Number of Records Deleted from the database:</p>
          <p>{mutation_delete_entry.data as React.ReactNode}</p>
        </div>
      )}

      <Button onClick={delete_entries} variant="danger" size="default">
        <DeleteIcon /> Delete
      </Button>
    </div>
  );
}
