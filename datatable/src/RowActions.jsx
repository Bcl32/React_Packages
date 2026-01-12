import React from "react";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";

import { Button } from "@bcl32/utils/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@bcl32/utils/Dropdown";

//MONOREPO PACKAGE IMPORTS
import { DialogButton } from "@bcl32/utils/DialogButton";
import { EditModelForm } from "@bcl32/forms/EditModelForm";

export function RowActions({ row, ModelData, query_invalidation }) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [hasOpenDialog, setHasOpenDialog] = React.useState(false);
  const dropdownTriggerRef = React.useRef(null);
  const focusRef = React.useRef(null);

  function handleDialogItemSelect() {
    console.log("handleDialogItemSelect");
    focusRef.current = dropdownTriggerRef.current;
  }

  function handleDialogItemOpenChange(open) {
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
          onSelect={handleDialogItemSelect}
          onOpenChange={handleDialogItemOpenChange}
          button={
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleDialogItemSelect && handleDialogItemSelect();
              }}
            >
              Edit
            </DropdownMenuItem>
          }
          title="Edit Entry"
        >
          <EditModelForm
            key={"entryform_edit_data_entry"}
            create_enabled={true}
            add_api_url={ModelData.add_api_url}
            ModelData={ModelData}
            query_invalidation={query_invalidation}
            obj_data={row.original}
          />
        </DialogButton>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(row.original.id);
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
