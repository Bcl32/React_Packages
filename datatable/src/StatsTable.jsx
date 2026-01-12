import React from "react";
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

export function StatsTable({ table_data }) {
  table_data = get_key_value_pairs(table_data);

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
          {table_data.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.key}</TableCell>
              <TableCell>
                <StatsCell table_data={item.value}></StatsCell>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatsCell({ table_data }) {
  table_data = format_stats(table_data);

  return (
    <Table>
      {/* <TableHeader>
        <TableRow>
          <TableHead className="w-1/2">Stat</TableHead>
          <TableHead className="w-1/2">Value</TableHead>
        </TableRow>
      </TableHeader> */}
      <TableBody>
        {table_data.map((item, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="p-4">
              {/* {
                <pre className="overflow-auto" style={{ fontSize: "14px" }}>
                  <code>{JSON.stringify(item["value"], null, 2)}</code>
                </pre>
              } */}
              {item.value}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function get_key_value_pairs(metadata) {
  var key_value_pairs = [];

  for (const [key, value] of Object.entries(metadata)) {
    if (value?.length) {
      key_value_pairs.push({ key: key, value: value });
    }
  }

  return key_value_pairs;
}

function format_stats(data) {
  var key_value_pairs = [];
  data.map(function (item, index, array) {
    var name = <b>{Capitalize(item["name"])}</b>;
    var value = item["value"];

    switch (item["type"]) {
      case "number":
        key_value_pairs.push({ name: name, value: value });
        break;
      case "datetime":
        value = dayjs(value).format("MMM, D YYYY - h:mma");
        key_value_pairs.push({ name: name, value: value });
        break;
      case "boolean":
        if (value == true) {
          value = <p className="text-green-400">{value.toString()}</p>;
        } else if (value == false) {
          value = <p className="text-red-400">{value.toString()}</p>;
        }
        key_value_pairs.push({ name: name, value: value });
        break;

      case "list":
        key_value_pairs.push({ name: name, value: value.toString() });
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

      case "count":
        var count = [];
        value.map(function (item, index, array) {
          var name = Truncate(item["name"], 100);
          var count_item = (
            <p key={name}>
              {name}: <b>{item["length"]}</b>,{" "}
            </p>
          );
          count.push(count_item);
        });

        var formatted_count = (
          <div className="max-h-36 max-w-lg overflow-auto whitespace-pre-line">
            {count}
          </div>
        );

        key_value_pairs.push({ name: name, value: formatted_count });
        break;

      case "children":
        // for (const key in value) {
        //   var sub_value = metadata[name][key];
        //   console.log(key, sub_value);
        //   var sub_name = name + ": " + key;
        //   key_value_pairs.push({ key: sub_name, value: sub_value });
        // }
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
