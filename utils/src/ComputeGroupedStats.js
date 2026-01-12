export function ComputeGroupedStats(filteredData, feature, sort = true) {
  var grouped_data = groupByKey(filteredData, feature);
  var counts = get_group_counts(grouped_data);

  if (sort) {
    counts.sort((a, b) => a.length - b.length); //changes original array
    counts.reverse(); //changes to descending
  }
  return counts;
}

export function DoubleGroupStats(filteredData, feature, sub_feature) {
  var grouped_data = groupByKey(filteredData, feature); //gets groups by main key example:
  //  {"Jan 1st":[{"item"},{"item2"}],
  //  "Jan 2nd":[{"item"},{"item2"},{"item3"}]}

  //for each date key (Jan 1st, Jan 2nd, etc...)
  var stats = [];
  for (var [key, value] of Object.entries(grouped_data)) {
    var subgroups = groupByKey(grouped_data[key], sub_feature);
    //gets groups by main key example:
    //  "sub_key1":[{"item"},{"item2"}],
    //  "sub_key2":[{"item"},{"item2"},{"item3"}]

    var entry = {};
    for (var [sub_key, sub_value] of Object.entries(subgroups)) {
      entry[sub_key] = subgroups[sub_key].length; //for each subkey add to entry object with the name as key and the length as the value
    }
    entry["name"] = key; //add the main key as the name
    stats.push(entry);
  }
  //end result is an array with each object having a "name" key of the primary group (usually a date) and a key value pair for each subgrop value and the value as the length
  //example:
  //{low: 19, medium: 1000, name: 'April 2014'}
  //{low: 6, medium: 73, name: 'July 2011'}

  return stats;
}

function groupByKey(data, key) {
  //returns object with keys for each unique feature with an array of the entries with that key
  //   {
  //  "key1":[{"item"},{"item2"}],
  //  "key2":[{"item"},{"item2"},{"item3"}]
  //   }
  return Object.groupBy(
    data,
    ({ [key]: string_title }) => string_title //[feature] converts variable 'feature' passed in to string
  );
}

function get_group_counts(input_data) {
  //input: groups of raw habit entries organized by chosen attribute
  //output: one object per group that contains a count of the entries that were in the group

  //returns object with keys for each unique feature with an array of the entries with that key
  //   { "name": "key1", "length": 2,
  //     "name": "key2", "length": 3,
  //   }

  var session_counts = [];
  for (var [key, value] of Object.entries(input_data)) {
    var entry = { length: input_data[key].length, name: key };
    session_counts.push(entry);
  }

  return session_counts;
}
