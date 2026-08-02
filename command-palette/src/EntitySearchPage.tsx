import * as React from "react";
import { Command } from "cmdk";
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import { cn } from "@bcl32/utils/cn";
import type { SearchSource } from "./types";

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const itemClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm " +
  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground " +
  "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50";

interface ListEnvelope {
  items?: unknown[];
  total?: number;
}

export interface EntitySearchPageProps {
  source: SearchSource;
  search: string;
  onPick: (route: string) => void;
}

export function EntitySearchPage({ source, search, onPick }: EntitySearchPageProps) {
  const debounced = useDebouncedValue(search, 300);
  const isClient = source.mode === "client";
  const minChars = source.minChars ?? (isClient ? 0 : 2);
  const term = debounced.trim();
  const active = isClient || term.length >= minChars;

  const sep = source.listUrl.includes("?") ? "&" : "?";
  // Client mode: one stable URL (fetch once, cmdk filters). Server mode: URL per term.
  const url = isClient ? source.listUrl : `${source.listUrl}${sep}search=${encodeURIComponent(term)}`;

  const { data, isFetching } = useGetRequest<ListEnvelope | unknown[]>(url, {
    enabled: active,
    staleTime: 30_000,
  });

  const items = React.useMemo(() => {
    const rows = Array.isArray(data) ? data : (data?.items ?? []);
    return (rows as any[]).slice(0, source.maxResults ?? 50);
  }, [data, source.maxResults]);

  return (
    <>
      {isFetching && (
        <Command.Loading className="py-6 text-center text-sm text-muted-foreground">
          Searching…
        </Command.Loading>
      )}
      {!active && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Type at least {minChars} character{minChars === 1 ? "" : "s"} to search {source.label}…
        </div>
      )}
      {active && !isFetching && data !== undefined && items.length === 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground">No matches.</div>
      )}
      {items.map((item) => {
        const label = source.getLabel(item);
        const description = source.getDescription?.(item);
        const thumb = source.getThumbnail?.(item);
        return (
          <Command.Item
            key={String(item.id)}
            value={String(item.id)}
            keywords={[label]}
            onSelect={() => onPick(source.getRoute(item))}
            className={cn(itemClass)}
          >
            {thumb && (
              <img
                src={thumb}
                alt=""
                loading="lazy"
                className="h-8 w-8 shrink-0 rounded object-cover bg-muted"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span className="truncate">{label}</span>
            {description && (
              <span className="ml-auto truncate text-xs text-muted-foreground">{description}</span>
            )}
          </Command.Item>
        );
      })}
    </>
  );
}
