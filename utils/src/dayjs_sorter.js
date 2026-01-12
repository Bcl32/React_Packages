import dayjs from "dayjs";

//custom sorting logic columns using datetime values
// the default datetime sorter for react-query-table does not deal with strings well
// for example: 9:40 is greater than 13:30
//using this function removes that issue
export const dayjs_sorter = (rowA, rowB, _columnId) => {
  const dateA = rowA.original[_columnId];
  const dateB = rowB.original[_columnId];

  // Handle null/undefined - push to end
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;

  const dayjsA = dayjs(dateA);
  const dayjsB = dayjs(dateB);

  // Handle invalid dates
  if (!dayjsA.isValid() && !dayjsB.isValid()) return 0;
  if (!dayjsA.isValid()) return 1;
  if (!dayjsB.isValid()) return -1;

  return dayjsA > dayjsB ? 1 : dayjsA < dayjsB ? -1 : 0;
};
