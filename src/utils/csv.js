export function csvCell(value) {
  let s = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function toCsv(rows, columns) {
  return (
    '\uFEFF' +
    [
      columns.map((c) => csvCell(c.label)).join(','),
      ...rows.map((r) => columns.map((c) => csvCell(c.value ? c.value(r) : r[c.key])).join(',')),
    ].join('\r\n')
  );
}
