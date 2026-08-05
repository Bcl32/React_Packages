import * as React from "react";
import { FilterContext } from "./FilterContext";
import { FilterHeader } from "./FilterHeader";

import { Input } from "@bcl32/utils/Input";
import * as SliderPrimitive from "@radix-ui/react-slider";
import type { FilterContextValue, HistogramBin, NumberRange } from "./types";
import { humanizeFieldName } from "./utils";

interface DebouncedNumberFilterProps {
  name: string;
  title?: string;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
}

/** A drawn bar: its extent on screen, and the range selecting it applies. */
interface StripBin extends HistogramBin {
  selectMin: number;
  selectMax: number;
}

interface HistogramStripProps {
  bins: HistogramBin[];
  /** The slider's domain — bars are positioned against this, not the data. */
  domainMin: number;
  domainMax: number;
  selectedMin: number;
  selectedMax: number;
  onSelectRange: (min: number, max: number) => void;
}

/**
 * The column's distribution, drawn over the same domain as the slider below it
 * so a bar sits directly above the values it counts. Bars outside the selected
 * range fade, which turns the slider into a readable "what am I keeping?"
 * control instead of two abstract numbers.
 *
 * Bars are positioned absolutely by percentage rather than flexed, because d3's
 * bins aren't always equal width — the first and last often differ — and only
 * exact positioning keeps them aligned with the track.
 *
 * Heights are log-scaled: these columns are heavily skewed (most parts weigh
 * almost nothing, a few weigh a lot) and a linear scale collapses every bar but
 * one into an invisible sliver. The tooltip carries the true count.
 */
function HistogramStrip({
  bins,
  domainMin,
  domainMax,
  selectedMin,
  selectedMax,
  onSelectRange,
}: HistogramStripProps): JSX.Element | null {
  // Index of the bar a drag started on; null when not dragging. Sweeping over
  // bars applies the range live, so the existing fade doubles as the preview.
  const [anchor, setAnchor] = React.useState<number | null>(null);
  // Distinguishes "released after sweeping" from a plain click, so the click
  // handler doesn't collapse a completed drag back down to one bin.
  const draggedRef = React.useRef(false);

  // The pointer routinely leaves the strip before release — end the drag
  // wherever it happens, not just over a bar.
  React.useEffect(() => {
    if (anchor === null) return;
    const stop = () => setAnchor(null);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [anchor]);

  const span = domainMax - domainMin;

  /**
   * Bars to draw, all the same width.
   *
   * d3 rounds bin edges outwards to nice values, so the outermost bins spill
   * past the slider's domain — System units holds 1–20 but is binned 0–22.
   * Clipping those to the domain made the end bars narrower than the rest, so
   * instead only whole bins are drawn and the leftover sliver shows as a gap at
   * the edge of the strip.
   *
   * Nothing is lost: a spilled bin's count folds into the nearest drawn bar,
   * and that bar's *selection* range stretches to the domain edge, so clicking
   * it filters to everything it represents. Drawn extent and selected extent
   * are therefore tracked separately.
   */
  const displayBins = React.useMemo<StripBin[]>(() => {
    if (!isFinite(span) || span <= 0) return [];

    const whole = bins.filter((bin) => bin.x0 >= domainMin && bin.x1 <= domainMax);
    // Too few whole bins to be a histogram (very narrow domains) — the card
    // falls back to the plain slider rather than drawing something misleading.
    if (whole.length < 2) return [];

    const out: StripBin[] = whole.map((bin) => ({
      x0: bin.x0,
      x1: bin.x1,
      count: bin.count,
      selectMin: bin.x0,
      selectMax: bin.x1,
    }));

    // Fold the partial edge bins into the nearest bar that is drawn.
    for (const bin of bins) {
      if (bin.x1 <= out[0].x0) out[0].count += bin.count;
      else if (bin.x0 >= out[out.length - 1].x1) out[out.length - 1].count += bin.count;
    }

    // …and let those bars select the values they absorbed.
    out[0].selectMin = domainMin;
    out[out.length - 1].selectMax = domainMax;

    return out;
  }, [bins, domainMin, domainMax, span]);

  if (displayBins.length === 0) return null;

  const peak = Math.log1p(Math.max(...displayBins.map((b) => b.count), 1));

  const applyBinRange = (from: number, to: number) => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    onSelectRange(displayBins[lo].selectMin, displayBins[hi].selectMax);
  };

  return (
    <div
      className="relative h-7 w-full touch-none select-none"
      role="presentation"
    >
      {displayBins.map((bin, index) => {
        const left = ((bin.x0 - domainMin) / span) * 100;
        const width = ((bin.x1 - bin.x0) / span) * 100;
        // Any overlap counts as selected: a bar straddling a handle is partly
        // included, so fading it would misrepresent the filter. Bounds are
        // inclusive to match ApplyFilters (`>= min && <= max`) — otherwise the
        // top bin, whose x0 equals the domain max, greys out at full range.
        const selected = bin.selectMax >= selectedMin && bin.selectMin <= selectedMax;
        const height = bin.count > 0 ? Math.max(8, (Math.log1p(bin.count) / peak) * 100) : 0;

        return (
          <button
            key={index}
            type="button"
            onPointerDown={(event) => {
              // Stops the press from starting a text/drag selection, which
              // would otherwise swallow the subsequent pointerenter events.
              event.preventDefault();
              draggedRef.current = false;
              setAnchor(index);
              applyBinRange(index, index);
            }}
            onPointerEnter={() => {
              if (anchor === null) return;
              draggedRef.current = true;
              applyBinRange(anchor, index);
            }}
            onClick={() => {
              // Keyboard activation still lands here; a finished sweep must not
              // be collapsed back to the single bar under the cursor.
              if (draggedRef.current) {
                draggedRef.current = false;
                return;
              }
              applyBinRange(index, index);
            }}
            // "values", not "rows": for a number_list column (per-axis sizes,
            // system units) the bins count every element, while a row matches
            // when ANY of its elements falls in range — so the two differ.
            title={`${bin.count} value${bin.count === 1 ? "" : "s"} between ${formatBound(bin.selectMin)} and ${formatBound(bin.selectMax)} — click, or drag across bars, to filter to that range`}
            aria-label={`Filter to ${formatBound(bin.selectMin)} – ${formatBound(bin.selectMax)} (${bin.count} values)`}
            className="absolute bottom-0 top-0 cursor-pointer border-0 bg-transparent p-0"
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            <span
              className={`absolute bottom-0 left-0 right-[1px] rounded-t-[1px] transition-colors ${
                selected ? "bg-primary/70" : "bg-muted-foreground/20"
              }`}
              style={{ height: `${height}%` }}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Compact bound for tooltips: 41.2M rather than 41231884. */
function formatBound(value: number): string {
  if (!isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  if (magnitude >= 10000) {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (magnitude >= 100 || Number.isInteger(value)) return String(Math.round(value));
  return String(+value.toPrecision(3));
}

export function DebouncedNumberFilter({ name, title, onRemove }: DebouncedNumberFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];

  const histogram = filterData?.["histogram"] as HistogramBin[] | undefined;
  const filterEmpty = filterData ? (filterData["filter_empty"] as NumberRange) : { min: 0, max: 0 };
  const filterValue = filterData ? (filterData["value"] as NumberRange) : { min: 0, max: 0 };

  const [inputValue, setInputValue] = React.useState<NumberRange>(filterValue);
  const mountedRef = React.useRef(false);

  // Sync local state when context changes externally (e.g., reset from FiltersSummary)
  React.useEffect(() => {
    setInputValue({ min: filterValue.min, max: filterValue.max });
  }, [filterValue.min, filterValue.max]);

  // Debounce input and push to context.
  //
  // Both effects must run before the "no filter data" guard below: a removed
  // instance makes filterData undefined for one render, and bailing out between
  // two hooks would trip React's "rendered fewer hooks than expected".
  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!context?.filters?.[name]) return;
    const timeoutId = setTimeout(() => {
      context?.change_filters(name, "value", inputValue);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [inputValue.min, inputValue.max, name]);

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  const slider_min = filterEmpty.min;
  const slider_max = filterEmpty.max;
  const range = slider_max - slider_min;
  const slider_step = range > 0 ? +(range / 100).toPrecision(2) : 1;

  const handleInputChange = (index: number, value: string) => {
    const newValue = parseFloat(value);
    if (!isNaN(newValue) && newValue >= slider_min && newValue <= slider_max) {
      const newRange = index === 0
        ? { min: newValue, max: inputValue.max }
        : { min: inputValue.min, max: newValue };
      setInputValue(newRange);
    }
  };

  const handleSliderChange = (newValues: number[]) => {
    setInputValue({ min: newValues[0], max: newValues[1] });
  };

  const nudge = (index: number, direction: 1 | -1) => {
    const current = index === 0 ? inputValue.min : inputValue.max;
    const newValue = +(current + direction * slider_step).toPrecision(10);
    const clamped = Math.min(slider_max, Math.max(slider_min, newValue));
    setInputValue(
      index === 0
        ? { min: clamped, max: inputValue.max }
        : { min: inputValue.min, max: clamped }
    );
  };

  const isAtMin = inputValue.min === slider_min;
  const isAtMax = inputValue.max === slider_max;

  const minBtnClass = isAtMin
    ? "text-[10px] font-semibold text-primary bg-primary/15 px-1 rounded transition-colors"
    : "text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-accent px-1 rounded transition-colors";

  const maxBtnClass = isAtMax
    ? "text-[10px] font-semibold text-primary bg-primary/15 px-1 rounded transition-colors"
    : "text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-accent px-1 rounded transition-colors";

  const label = title ?? humanizeFieldName(name);

  const slider = (
    <SliderPrimitive.Root
      className="relative flex w-full touch-none select-none items-center"
      value={[inputValue.min, inputValue.max]}
      onValueChange={handleSliderChange}
      min={slider_min}
      max={slider_max}
      step={slider_step}
      aria-label="Range"
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {[inputValue.min, inputValue.max].map((_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          className="block h-3 w-3 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );

  return (
    // The slider now always sits on its own row rather than sharing the label's
    // line: it lets every filter card open with the same 16px caption, which is
    // what keeps the grid's rows even.
    <div className="space-y-1">
      <FilterHeader label={label} onRemove={onRemove} />

      {histogram ? (
        <div className="space-y-0.5">
          <HistogramStrip
            bins={histogram}
            domainMin={slider_min}
            domainMax={slider_max}
            selectedMin={inputValue.min}
            selectedMax={inputValue.max}
            onSelectRange={(min, max) => setInputValue({ min, max })}
          />
          {slider}
        </div>
      ) : (
        slider
      )}

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setInputValue({ ...inputValue, min: slider_min })}
            className={minBtnClass}
            title={`Set to ${slider_min}`}
          >
            Min
          </button>
          <div className="flex flex-col shrink-0">
            <button type="button" onClick={() => nudge(0, 1)} className="text-muted-foreground hover:text-foreground text-[11px] leading-none px-0.5 hover:bg-accent rounded">+</button>
            <button type="button" onClick={() => nudge(0, -1)} className="text-muted-foreground hover:text-foreground text-[11px] leading-none px-0.5 hover:bg-accent rounded">−</button>
          </div>
          <Input
            variant="background"
            id={`${name}-min`}
            name={name}
            value={inputValue.min}
            onChange={(e) => handleInputChange(0, e.target.value)}
            type="text"
            inputMode="decimal"
            className="flex-1 min-w-0 h-6 text-[11px] md:text-[11px] tabular-nums text-center [appearance:textfield] px-1 py-0"
          />
        </div>

        <span className="text-muted-foreground text-xs shrink-0">—</span>

        <div className="flex items-center gap-0.5 flex-1 min-w-0">
          <Input
            variant="background"
            id={`${name}-max`}
            name={name}
            value={inputValue.max}
            onChange={(e) => handleInputChange(1, e.target.value)}
            type="text"
            inputMode="decimal"
            className="flex-1 min-w-0 h-6 text-[11px] md:text-[11px] tabular-nums text-center [appearance:textfield] px-1 py-0"
          />
          <div className="flex flex-col shrink-0">
            <button type="button" onClick={() => nudge(1, 1)} className="text-muted-foreground hover:text-foreground text-[11px] leading-none px-0.5 hover:bg-accent rounded">+</button>
            <button type="button" onClick={() => nudge(1, -1)} className="text-muted-foreground hover:text-foreground text-[11px] leading-none px-0.5 hover:bg-accent rounded">−</button>
          </div>
          <button
            type="button"
            onClick={() => setInputValue({ ...inputValue, max: slider_max })}
            className={maxBtnClass}
            title={`Set to ${slider_max}`}
          >
            Max
          </button>
        </div>
      </div>
    </div>
  );
}
