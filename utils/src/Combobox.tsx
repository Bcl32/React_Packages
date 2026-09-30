import * as React from "react";
import { X } from "lucide-react";
import { Input } from "./Input";
import { cn } from "./cn";

/**
 * One choice. A plain string is its own value and its own label — the tags
 * and free-text suggestion fields, where the text IS what gets stored. A pair
 * separates the two: the label is only shown and searched, and the value is
 * what `value` holds and `onChange` reports.
 *
 * The pair exists because the string form was being used for linked records.
 * A caller that needed an id had to hand over names, get a name back, and
 * look the id up by name — so two rooms both called "Hall" were one entry,
 * and picking either saved whichever came first. With pairs there is no name
 * lookup anywhere: the id travels with the row it belongs to, which is what
 * the filament swatch picker (ColourPickerPopover) has always done.
 */
export type ComboboxOption = string | { value: string; label: string };

function valueOf(option: ComboboxOption): string {
  return typeof option === "string" ? option : option.value;
}

function labelOf(option: ComboboxOption): string {
  return typeof option === "string" ? option : option.label;
}

export interface ComboboxProps {
  options?: ComboboxOption[];
  /** Selected VALUES — option values, or free text under `freeSolo`. */
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  freeSolo?: boolean;
  multiple?: boolean;
  showBadges?: boolean;
  className?: string;
  /**
   * `sm` shrinks the input, the selected-value chips and the option rows
   * together. Sizing only the input leaves the chips towering over it, so the
   * whole control moves as one step.
   */
  size?: "default" | "sm";
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
  size = "default",
}: ComboboxProps) {
  const compact = size === "sm";
  const [input, setInput] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // What a selected value is called. A value with no option behind it — free
  // text, or an id whose record is gone — is shown as itself.
  const labelFor = React.useMemo(() => {
    const byValue = new Map(options.map((o) => [valueOf(o), labelOf(o)]));
    return (v: string) => byValue.get(v) ?? v;
  }, [options]);

  const filteredOptions = options.filter(
    (o) =>
      (!multiple || !value.includes(valueOf(o))) &&
      (!input || labelOf(o).toLowerCase().includes(input.toLowerCase())),
  );

  // Single-select: show selected label in input when not focused
  const displayInput = !multiple && !open && value.length > 0 && !input
    ? labelFor(value[0])
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
        (o) => labelOf(o).toLowerCase() === input.trim().toLowerCase(),
      );
      if (exact) {
        select(valueOf(exact));
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
        <div className={cn("flex flex-wrap", compact ? "gap-0.5 mb-1" : "gap-1 mb-1.5")}>
          {value.map((item) => (
            <span
              key={item}
              title={labelFor(item)}
              className={cn(
                "inline-flex items-center rounded-full bg-primary text-primary-foreground",
                compact ? "gap-0.5 px-1.5 text-[10px] leading-4" : "gap-1 px-2 py-0.5 text-xs",
              )}
            >
              {labelFor(item)}
              <button
                type="button"
                aria-label={`Remove ${labelFor(item)}`}
                onClick={() => remove(item)}
                className="hover:text-primary-foreground/70"
              >
                <X className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
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
        size={compact ? "sm" : "default"}
        className={compact ? "text-xs md:text-xs" : undefined}
        autoComplete="off"
      />
      {open && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredOptions.map((opt) => (
            <button
              key={valueOf(opt)}
              type="button"
              onPointerDown={(e) => {
                // Prevent input blur from closing before selection
                e.preventDefault();
              }}
              onClick={() => select(valueOf(opt))}
              className={cn(
                "w-full text-left hover:bg-accent transition-colors",
                compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
              )}
            >
              {labelOf(opt)}
            </button>
          ))}
        </div>
      )}
      {showBadges && options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {options.map((opt) => {
            const v = valueOf(opt);
            const selected = value.includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => (selected ? remove(v) : select(v))}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {labelOf(opt)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
