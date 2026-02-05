type StateEntry = [string, unknown];

//input a list of ["title",value] arrays
export function PrintState(data: StateEntry[]): number {
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
