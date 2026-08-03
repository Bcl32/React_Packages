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

import { SimpleDialog } from "@bcl32/utils/DialogButton";
import { EditModelForm } from "@bcl32/forms/EditModelForm";
import type { ModelData } from "@bcl32/data-utils";

interface RowActionsProps<TData extends { id: string | number }> {
  row: Row<TData>;
  ModelData: ModelData & { update_api_url: string };
  query_invalidation: string[];
  onEditSuccess?: (formData: Record<string, unknown>, objData: Record<string, unknown>) => void;
}

export function RowActions<TData extends { id: string | number }>({
  row,
  ModelData,
  query_invalidation,
  onEditSuccess,
}: RowActionsProps<TData>): JSX.Element {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const dropdownTriggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      {/*
        The edit dialog is deliberately NOT a child of this menu, and the menu
        is non-modal. Both are Radix layers, and a *modal* layer records the
        body's `pointer-events` on mount to restore on unmount. Nested and both
        modal, they unmount in the same commit and the dialog restores the
        "none" the menu had set — leaving the whole page unclickable, which
        reads as a hard freeze until a reload. Non-modal, the menu never writes
        that style, so the dialog is the only layer managing it.
      */}
      <DropdownMenu modal={false} open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            Edit
          </DropdownMenuItem>

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

      <SimpleDialog
        key={"dialog-" + row.original.id}
        isModal={true}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          // Radix restores focus to whatever held it before the dialog opened —
          // the menu item, long unmounted by then — so put it on the trigger.
          if (!open) requestAnimationFrame(() => dropdownTriggerRef.current?.focus());
        }}
        title="Edit Entry"
      >
        <EditModelForm
          key={"entryform_edit_data_entry"}
          ModelData={ModelData}
          query_invalidation={query_invalidation}
          obj_data={row.original}
          onSuccess={onEditSuccess}
          onClose={() => setEditOpen(false)}
        />
      </SimpleDialog>
    </>
  );
}
