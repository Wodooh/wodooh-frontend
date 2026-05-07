/**
 * Frontend-only CSV export. The backend has no CSV endpoint by design —
 * shaping the export is presentation, not API surface.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = Array.isArray(value)
    ? value.join("|")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv<T extends Record<string, unknown>>(
  rows: ReadonlyArray<T>,
  columns: ReadonlyArray<keyof T>
): string {
  const header = columns.map(String).map(escapeCell).join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCell(r[c])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
