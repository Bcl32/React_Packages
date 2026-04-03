import * as React from "react";
import { X } from "lucide-react";
import { Input } from "./Input";
import { cn } from "./cn";

export interface ComboboxProps {
  options?: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  freeSolo?: boolean;
  multiple?: boolean;
  showBadges?: boolean;
  className?: string;
}

export function Combobox({
  options = [],
  value,
  onChange,
  placeholder = "Search...",
  freeSolo = false,
  multiple = false,
  showBadges = false,
  className,
}: ComboboxProps) {
  const [input, setInput] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(
    (o) =>
      (!multiple || !value.includes(o)) &&
      (!input || o.toLowerCase().includes(input.toLowerCase())),
  );

  // Single-select: show selected label in input when not focused
  const displayInput = !multiple && !open && value.length > 0 && !input
    ? value[0]
    : input;

  function select(item: string) {
    if (multiple) {
      if (!value.includes(item)) {
        onChange([...value, item]);
      }
      setInput("");
    } else {
      onChange([item]);
      setInput("");
      setOpen(false);
    }
  }

  function remove(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      const exact = options.find(
        (o) => o.toLowerCase() === input.trim().toLowerCase(),
      );
      if (exact) {
        select(exact);
      } else if (freeSolo) {
        select(input.trim());
      }
    } else if (e.key === "Backspace" && !input && multiple && value.length > 0) {
      remove(value[value.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  // Close dropdown on outside click
  React.useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("pointerdown", handlePointerDown);
      return () => document.removeEventListener("pointerdown", handlePointerDown);
    }
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {multiple && value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary text-primary-foreground"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(item)}
                className="hover:text-primary-foreground/70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        ref={inputRef}
        value={displayInput}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          // Single-select: clear display value so user can type to filter
          if (!multiple && value.length > 0 && !input) {
            setInput("");
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        variant="background"
        size="default"
        autoComplete="off"
      />
      {open && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onPointerDown={(e) => {
                // Prevent input blur from closing before selection
                e.preventDefault();
              }}
              onClick={() => select(opt)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {showBadges && options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {options.map((opt) => {
            const selected = value.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => (selected ? remove(opt) : select(opt))}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
