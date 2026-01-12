import React from "react";

//input a list of ["title",value] arrays
export function PrintState(data) {
  data.map((entry) => {
    console.log(entry[0], entry[1]);
  });
  return 0;
}

// [
//   ["filters", filters],
//   ["filteredData", filteredData],
//   ["Model Data", ModelData.model_attributes],
// ]
