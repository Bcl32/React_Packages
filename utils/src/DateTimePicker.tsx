import * as React from "react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { DayPicker } from "react-day-picker";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./Dialog";
import { Button, buttonVariants } from "./Button";
import type { ButtonProps } from "./Button";
import { Input } from "./Input";
import { Label } from "./Label";
import { cn } from "./cn";

export interface DateTimePickerProps {
  /** Current value; null or an invalid Dayjs renders the placeholder. */
  value: Dayjs | null;
  /** Fired once on OK with the drafted value — not per keystroke/step. */
  onChange: (value: Dayjs | null) => void;
  id?: string;
  disabled?: boolean;
  /** Trigger label format for the selected value. */
  format?: string;
  /** Trigger text when no valid value is set. */
  placeholder?: string;
  triggerVariant?: ButtonProps["variant"];
  className?: string;
}

/**
 * Modal date+time picker: a button trigger that opens a Dialog holding a
 * react-day-picker calendar and a time input. Edits accumulate on a draft
 * and only commit via OK, so consumers that persist on every onChange
 * (e.g. filter contexts) aren't spammed with intermediate states.
 */
export function DateTimePicker({
  value,
  onChange,
  id,
  disabled,
  format = "MMM, D YYYY - h:mma",
  placeholder = "Pick a date",
  triggerVariant = "outline",
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Dayjs | null>(null);

  const hasValue = value != null && value.isValid();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(hasValue ? value : dayjs());
    }
    setOpen(nextOpen);
  }

  function handleSelectDay(day: Date | undefined) {
    if (!day) return;
    setDraft((prev) =>
      (prev ?? dayjs()).year(day.getFullYear()).month(day.getMonth()).date(day.getDate())
    );
  }

  function handleTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const time = event.target.value;
    if (!time) return;
    const [hours, minutes] = time.split(":");
    setDraft((prev) => (prev ?? dayjs()).hour(Number(hours)).minute(Number(minutes)));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          id={id}
          disabled={disabled}
          className={className}
        >
          {hasValue ? value.format(format) : placeholder}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-auto max-w-fit" aria-describedby={undefined}>
        <DialogTitle>Pick date &amp; time</DialogTitle>
        <DayPicker
          mode="single"
          selected={draft?.toDate()}
          defaultMonth={draft?.toDate()}
          onSelect={handleSelectDay}
          showOutsideDays
          classNames={{
            months: "relative flex flex-col sm:flex-row gap-4",
            month: "space-y-4",
            month_caption: "flex justify-center items-center h-7",
            caption_label: "text-sm font-medium",
            nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
            button_previous: cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 p-0 opacity-50 hover:opacity-100"
            ),
            button_next: cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 p-0 opacity-50 hover:opacity-100"
            ),
            chevron: "h-4 w-4 fill-foreground",
            month_grid: "w-full border-collapse space-y-1",
            weekdays: "flex",
            weekday: "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
            week: "mt-2 flex w-full",
            day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
            day_button: cn(
              buttonVariants({ variant: "ghost" }),
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
            ),
            selected:
              "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            today: "rounded-md bg-accent text-accent-foreground",
            outside: "text-muted-foreground opacity-50",
            disabled: "text-muted-foreground opacity-50",
            hidden: "invisible",
          }}
        />
        <div className="flex items-center gap-2">
          <Label htmlFor={id ? id + "_time" : undefined}>Time:</Label>
          <Input
            id={id ? id + "_time" : undefined}
            type="time"
            variant="background"
            className="w-auto"
            value={draft?.isValid() ? draft.format("HH:mm") : ""}
            onChange={handleTimeChange}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
