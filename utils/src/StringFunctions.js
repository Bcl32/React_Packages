export function Capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

export function Truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + "..." : str;
}
