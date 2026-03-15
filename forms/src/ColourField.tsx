import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Label } from "@bcl32/utils/Label";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import type { ModelAttribute } from "@bcl32/data-utils";
import type { FormData } from "./FormElement";

interface ColourPresetsInfo {
  get_api_url: string;
}

interface Swatch {
  colour_hex: string;
  colour_name?: string;
}

function LabelWithHelp({
  htmlFor,
  children,
  helpText,
}: {
  htmlFor: string;
  children: React.ReactNode;
  helpText?: string | null;
}) {
  return (
    <div className="flex items-center gap-1 mb-2">
      <Label htmlFor={htmlFor}>{children}</Label>
      {helpText && (
        <CustomTooltip content={helpText} delayDuration={200}>
          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </CustomTooltip>
      )}
    </div>
  );
}

export function ColourField({
  entry_data,
  formData,
  setFormData,
}: {
  entry_data: ModelAttribute;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
}) {
  const name = entry_data.name;
  const helpText = entry_data.help_text || entry_data.description || null;
  const colourPresets = entry_data.colour_presets as ColourPresetsInfo | undefined;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const { data } = useGetRequest<{ items: Record<string, unknown>[] }>(
    colourPresets?.get_api_url ?? "",
    {
      enabled: !!colourPresets?.get_api_url,
      staleTime: 5 * 60 * 1000,
    }
  );

  const swatches: Swatch[] = React.useMemo(() => {
    if (!data?.items) return [];
    const seen = new Set<string>();
    const result: Swatch[] = [];
    for (const item of data.items) {
      const hex = item.colour_hex as string | undefined;
      if (hex && !seen.has(hex)) {
        seen.add(hex);
        result.push({
          colour_hex: hex,
          colour_name: item.colour_name as string | undefined,
        });
      }
    }
    return result;
  }, [data]);

  const currentColour = (formData[name] as string) || "";

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleChange = (colour: string) => {
    setFormData((prev) => ({ ...prev, [name]: colour }));
  };

  return (
    <div className="flex">
      <div>
        <LabelWithHelp htmlFor={"input_" + name} helpText={helpText}>
          {name[0].toUpperCase() + name.slice(1).replace(/_/g, " ")}:
        </LabelWithHelp>
        <div className="relative inline-block" ref={ref}>
          <button
            type="button"
            id={"input_" + name}
            onClick={() => setOpen((o) => !o)}
            className="w-8 h-8 rounded-full border-2 border-border cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: currentColour || "#94a3b8" }}
            title={currentColour || "No colour — click to set"}
          />
          {open && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-popover border rounded-lg shadow-lg p-3 w-52">
              {swatches.length > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                    Filaments
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {swatches.map((s) => (
                      <button
                        key={s.colour_hex}
                        type="button"
                        onClick={() => {
                          handleChange(s.colour_hex);
                          setOpen(false);
                        }}
                        title={s.colour_name || s.colour_hex}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          currentColour === s.colour_hex
                            ? "border-primary ring-1 ring-primary"
                            : "border-border"
                        }`}
                        style={{ backgroundColor: s.colour_hex }}
                      />
                    ))}
                  </div>
                </>
              )}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                Custom
              </p>
              <input
                type="color"
                value={currentColour || "#6b9bd2"}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full h-8 rounded border cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
