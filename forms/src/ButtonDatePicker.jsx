import React from "react";
import Button from "@mui/material/Button";
import { MobileDateTimePicker } from "@mui/x-date-pickers/MobileDateTimePicker";

function ButtonField(props) {
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

export default function ButtonDatePicker(props) {
  const [open, setOpen] = React.useState(false);

  return (
    <MobileDateTimePicker
      slots={{ ...props.slots, field: ButtonField }}
      slotProps={{
        ...props.slotProps,
        field: { setOpen: setOpen, id: props.id },
      }}
      {...props}
      open={open}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
    />
  );
}
