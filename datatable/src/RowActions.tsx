import * as React from "react";
import type { Row } from "@tanstack/react-table";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";

import { Button } from "@bcl32/utils/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bcl32/utils/Dropdown";

import { DialogButton } from "@bcl32/utils/DialogButton";
import { EditModelForm } from "@bcl32/forms/EditModelForm";

interface ModelData {
  model_name: string;
  model_attributes: unknown[];
  add_api_url?: string;
  update_api_url?: string;
  delete_api_url?: string;
  [key: string]: unknown;
}

interface RowActionsProps<TData extends { id: string | number }> {
  row: Row<TData>;
  ModelData: ModelData;
  query_invalidation: string[];
}

export function RowActions<TData extends { id: string | number }>({
  row,
  ModelData,
  query_invalidation,
}: RowActionsProps<TData>): JSX.Element {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [hasOpenDialog, setHasOpenDialog] = React.useState(false);
  const dropdownTriggerRef = React.useRef<HTMLButtonElement>(null);
  const focusRef = React.useRef<HTMLButtonElement | null>(null);

  function handleDialogItemSelect() {
    console.log("handleDialogItemSelect");
    focusRef.current = dropdownTriggerRef.current;
  }

  function handleDialogItemOpenChange(open: boolean) {
    console.log("handleDialogItemOpenChange", open);
    setHasOpenDialog(open);
    if (open === false) {
      setDropdownOpen(false);
    }

    console.log(row);
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          ref={dropdownTriggerRef}
        >
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[160px]"
        hidden={hasOpenDialog}
        onCloseAutoFocus={(event) => {
          if (focusRef.current) {
            focusRef.current.focus();
            focusRef.current = null;
            event.preventDefault();
          }
        }}
      >
        <DialogButton
          key={"dialog-" + row.original.id}
          isModal={true}
          onOpenChange={handleDialogItemOpenChange}
          button={
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleDialogItemSelect();
              }}
            >
              Edit
            </DropdownMenuItem>
          }
          title="Edit Entry"
        >
          <EditModelForm
            key={"entryform_edit_data_entry"}
            ModelData={ModelData as Parameters<typeof EditModelForm>[0]["ModelData"]}
            query_invalidation={query_invalidation}
            obj_data={row.original as unknown as Parameters<typeof EditModelForm>[0]["obj_data"]}
          />
        </DialogButton>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(String(row.original.id));
            }}
          >
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(row.original));
            }}
          >
            Copy Row
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
