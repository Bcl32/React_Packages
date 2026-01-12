import React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./Table";

export function KeyValueTable({ table_data }) {
  return (
    <div className="container mx-auto p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">Key</TableHead>
            <TableHead className="w-1/2">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table_data.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.key}</TableCell>
              <TableCell>{item.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
