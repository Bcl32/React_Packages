import * as React from "react";
import Button from "@mui/material/Button";
import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";
import type { MobileDateTimePickerProps } from "@mui/x-date-pickers/MobileDateTimePicker";
import type { Dayjs } from "dayjs";

interface ButtonFieldProps {
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  label?: string | null;
  id?: string;
  disabled?: boolean;
  InputProps?: {
    ref?: React.Ref<HTMLButtonElement>;
  };
  inputProps?: {
    "aria-label"?: string;
  };
}

function ButtonField(props: ButtonFieldProps) {
  const {
    setOpen,
    label,
    id,
    disabled,
    InputProps: { ref } = {},
    inputProps: { "aria-label": ariaLabel } = {},
  } = props;

  return (
    <Button
      variant="outlined"
      id={id}
      disabled={disabled}
      ref={ref}
      aria-label={ariaLabel}
      onClick={() => setOpen?.((prev) => !prev)}
    >
      {label ? `${label}` : "Pick a date"}
    </Button>
  );
}

interface ButtonDatePickerProps extends Omit<MobileDateTimePickerProps<Dayjs>, "open" | "onOpen" | "onClose"> {
  id?: string;
}

export default function ButtonDatePicker(props: ButtonDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <MobileDateTimePicker
      slots={{ ...props.slots, field: ButtonField as never }}
      slotProps={{
        ...props.slotProps,
        field: { setOpen: setOpen, id: props.id } as never,
      }}
      {...props}
      open={open}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
    />
  );
}
