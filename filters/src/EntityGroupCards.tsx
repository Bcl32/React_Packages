import * as React from "react";
import { Card, CardHeader, CardTitle } from "@bcl32/utils/Card";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import { useEntityGroups, type GroupVisualResolver } from "./useEntityGroups";
import type { ModelAttribute, ModelData } from "./types";

export interface EntityGroupCardsProps {
  dataset: Record<string, unknown>[] | undefined | null;
  modelData: ModelData;
  groupBy: string;
  groupableAttrs: ModelAttribute[];
  onGroupByChange: (attrName: string) => void;
  onSelect: (value: string, isNone: boolean) => void;
  resolveVisual?: GroupVisualResolver;
  title?: string;
  onEmptySwitchToTable?: () => void;
}

export function EntityGroupCards({
  dataset,
  modelData,
  groupBy,
  groupableAttrs,
  onGroupByChange,
  onSelect,
  resolveVisual,
  title,
  onEmptySwitchToTable,
}: EntityGroupCardsProps) {
  const { groups, attr } = useEntityGroups(dataset, modelData, groupBy, {
    resolveVisual,
  });

  const heading = title ?? `Browse ${modelData.set_name ?? "items"} by`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">{heading}</h2>
        {groupableAttrs.length > 1 && (
          <ToggleGroup
            type="single"
            value={groupBy}
            onValueChange={(v) => {
              if (v) onGroupByChange(v);
            }}
            size="sm"
            variant="outline"
          >
            {groupableAttrs.map((a) => (
              <ToggleGroupItem key={a.name} value={a.name}>
                {(a as ModelAttribute).title as string ?? a.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="bg-card rounded-lg border p-8 text-center space-y-3">
          <p className="text-muted-foreground">
            {attr
              ? `No ${(attr as ModelAttribute).title as string ?? attr.name} values found.`
              : "Nothing to group."}
          </p>
          {onEmptySwitchToTable && (
            <button
              type="button"
              onClick={onEmptySwitchToTable}
              className="text-sm text-primary hover:underline"
            >
              Switch to Table view
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => onSelect(g.value, !!g.isNone)}
              className="text-left"
            >
              <Card
                className={`hover:bg-accent/30 transition-colors cursor-pointer ${
                  g.isNone ? "border-dashed" : ""
                }`}
              >
                <CardHeader className="p-4">
                  <CardTitle
                    className={`flex items-center gap-2 text-base font-medium ${
                      g.isNone ? "text-muted-foreground" : ""
                    }`}
                  >
                    {g.visual}
                    <span className="truncate">{g.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                      ({g.count})
                    </span>
                  </CardTitle>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
