export function ApplyFilters(data, filters) {
  //console.log(filters);

  // Always filter out null/undefined entries first
  var filteredData = Array.isArray(data)
    ? data.filter(entry => entry != null && typeof entry === 'object')
    : [];

  // if (Object.keys(filters).length > 0) {
  //only run after filters have been initialized
  for (const key in filters) {
    let filter = filters[key];
    switch (filter["type"]) {
      case "string":
        console.log(filteredData);
        if (filter["rule"] === "equals") {
          filteredData = filteredData.filter((entry) => {
            return entry && entry[key] === filter["value"];
          });
          break;
        }

        if (filter["rule"] === "contains") {
          filteredData = filteredData.filter((entry) => {
            return entry && entry[key] && entry[key].includes(filter["value"]);
          });
          break;
        }
        break;

      case "number":
        // if (filter["rule"] === "=") {
        //   filteredData = filteredData.filter((entry) => {
        //     return entry[key] == filter["value"];
        //   });
        //   break;
        // }
        // if (filter["rule"] === "<") {
        //   filteredData = filteredData.filter((entry) => {
        //     return entry[key] < parseFloat(filter["value"]);
        //   });
        //   break;
        // }
        // if (filter["rule"] === ">") {
        //   console.log(filter);
        //   filteredData = filteredData.filter((entry) => {
        //     return entry[key] > parseFloat(filter["value"]);
        //   });
        //   break;
        // }
        filteredData = filteredData.filter((entry) => {
          return entry && entry[key] != null && entry[key] - filter["value"]["min"] >= 0;
        });
        filteredData = filteredData.filter((entry) => {
          return entry && entry[key] != null && filter["value"]["max"] - entry[key] >= 0;
        });
        break;

      case "select":
        filteredData = filteredData.filter((entry) => {
          return entry && entry[key] != null && filter["value"].includes(entry[key]); //filter["value"] is the array of tags allowed, if it includes the single value from entry[key] then the result is returned and not filtered out
        });
        break;

      case "list":
        if (filter["rule"] === "any") {
          filteredData = filteredData.filter((entry) => {
            return entry && entry[key] && Array.isArray(entry[key]) && filter["value"].some((r) => entry[key].includes(r)); //if any value in the filter list is found in the record's array
          });
          break;
        }

        if (filter["rule"] === "all") {
          filteredData = filteredData.filter((entry) => {
            return entry && entry[key] && Array.isArray(entry[key]) && filter["value"].every((r) => entry[key].includes(r)); //if every value in the filter list is found in the record's array
          });
          break;
        }
        break;

      case "datetime":
        console.log(filteredData);
        filteredData = filteredData.filter((entry) => {
          return (
            entry &&
            entry[key] &&
            new Date(entry[key]) -
              new Date(filter["value"]["timespan_begin"]) >=
            0
          );
        });
        filteredData = filteredData.filter((entry) => {
          return (
            entry &&
            entry[key] &&
            new Date(filter["value"]["timespan_end"]) - new Date(entry[key]) >=
            0
          );
        });
        break;
    }
  } // end of  for (const key in filters)
  // } //end of if (Object.keys(filters).length > 0)
  return filteredData;
}
