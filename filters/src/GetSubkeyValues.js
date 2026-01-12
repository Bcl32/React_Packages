import React from "react";

export function GetSubkeyValues(chart_metadata, stats) {
  var subkey_data = stats[chart_metadata["subkey"]].find((obj) => {
    return obj.name == "count";
  })["value"];

  var subkeys = (chart_metadata["subkeys"] = subkey_data.map((entry) => {
    return entry["name"];
  }));

  return subkeys;
}
