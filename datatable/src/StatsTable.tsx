import * as React from "react";
import dayjs from "dayjs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./Table";
import { Capitalize, Truncate } from "@bcl32/utils/StringFunctions";

interface StatItem {
  name: string;
  value: unknown;
  type: string;
}

interface CountItem {
  name: string;
  length: number;
}

interface KeyValuePair {
  key: string;
  value: StatItem[];
}

interface FormattedStat {
  name: React.ReactNode;
  value: React.ReactNode;
}

interface StatsTableProps {
  table_data: Record<string, StatItem[]>;
}

export function StatsTable({ table_data }: StatsTableProps): JSX.Element {
  const formattedData = get_key_value_pairs(table_data);

  return (
    <div className="container mx-auto p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/4">Key</TableHead>
            <TableHead className="w-3/4">Stats</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {formattedData.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.key}</TableCell>
              <TableCell>
                <StatsCell table_data={item.value} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface StatsCellProps {
  table_data: StatItem[];
}

function StatsCell({ table_data }: StatsCellProps): JSX.Element {
  const formattedData = format_stats(table_data);

  return (
    <Table>
      <TableBody>
        {formattedData.map((item, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="p-4">{item.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function get_key_value_pairs(metadata: Record<string, StatItem[]>): KeyValuePair[] {
  const key_value_pairs: KeyValuePair[] = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (value?.length) {
      key_value_pairs.push({ key: key, value: value });
    }
  }

  return key_value_pairs;
}

function format_stats(data: StatItem[]): FormattedStat[] {
  const key_value_pairs: FormattedStat[] = [];

  data.forEach(function (item) {
    const name = <b>{Capitalize(item["name"])}</b>;
    let value: React.ReactNode = item["value"] as React.ReactNode;

    switch (item["type"]) {
      case "number":
        key_value_pairs.push({ name: name, value: value });
        break;
      case "datetime":
        value = dayjs(item["value"] as string).format("MMM, D YYYY - h:mma");
        key_value_pairs.push({ name: name, value: value });
        break;
      case "boolean": {
        const boolVal = item["value"] as boolean;
        if (boolVal === true) {
          value = <p className="text-green-400">{boolVal.toString()}</p>;
        } else if (boolVal === false) {
          value = <p className="text-red-400">{boolVal.toString()}</p>;
        }
        key_value_pairs.push({ name: name, value: value });
        break;
      }

      case "list":
        key_value_pairs.push({ name: name, value: String(item["value"]) });
        break;

      case "object":
      case "bins":
        value = (
          <pre
            className="h-36 max-w-xl overflow-auto"
            style={{ fontSize: "14px" }}
          >
            <code>{JSON.stringify(item["value"], null, 2)}</code>
          </pre>
        );
        key_value_pairs.push({ name: name, value: value });
        break;

      case "count": {
        const countItems = item["value"] as CountItem[];
        const count: React.ReactNode[] = [];
        countItems.forEach(function (countItem) {
          const itemName = Truncate(countItem["name"], 100);
          const count_item = (
            <p key={itemName}>
              {itemName}: <b>{countItem["length"]}</b>,{" "}
            </p>
          );
          count.push(count_item);
        });

        const formatted_count = (
          <div className="max-h-36 max-w-lg overflow-auto whitespace-pre-line">
            {count}
          </div>
        );

        key_value_pairs.push({ name: name, value: formatted_count });
        break;
      }

      case "children":
        break;
      default:
        value = (
          <pre
            className="h-36 max-w-xl overflow-auto"
            style={{ fontSize: "14px" }}
          >
            <code>{JSON.stringify(item["value"], null, 2)}</code>
          </pre>
        );
        key_value_pairs.push({ name: name, value: value });
        break;
    }
  });
  return key_value_pairs;
}
