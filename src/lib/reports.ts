// Lightweight, dependency-free report export.
//   * CSV  -> opens in Excel/Sheets (Export Excel)
//   * PDF  -> renders an HTML table in a new window and triggers print -> "Save as PDF"
// Avoids adding heavy xlsx/jspdf deps to the static-export bundle. Swap in
// SheetJS / jsPDF later if richer formatting is required.

export type Row = Record<string, string | number | null | undefined>;

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export rows to a CSV file (Excel-compatible). */
export function exportCsv(rows: Row[], filename: string, headers?: string[]) {
  if (rows.length === 0 && !headers) {
    downloadBlob("", filename.endsWith(".csv") ? filename : `${filename}.csv`, "text/csv;charset=utf-8;");
    return;
  }
  const cols = headers ?? Object.keys(rows[0] ?? {});
  const lines = [
    cols.map(escapeCsv).join(","),
    ...rows.map((r) => cols.map((c) => escapeCsv(r[c])).join(",")),
  ];
  // BOM so Excel reads UTF-8 correctly
  downloadBlob(
    "﻿" + lines.join("\n"),
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
    "text/csv;charset=utf-8;"
  );
}

/** Render a titled table and open the print dialog (Save as PDF). */
export function exportPdf(opts: {
  title: string;
  subtitle?: string;
  rows: Row[];
  headers?: string[];
}) {
  const { title, subtitle, rows } = opts;
  const cols = opts.headers ?? Object.keys(rows[0] ?? {});
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    throw new Error("Popup blocked — allow popups to export PDF.");
  }
  const thead = `<tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const tbody = rows
    .map((r) => `<tr>${cols.map((c) => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`)
    .join("");
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #1f2937; }
      h1 { color: #E8657B; font-size: 20px; margin: 0 0 4px; }
      p.sub { color: #6b7280; margin: 0 0 16px; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
      th { background: #F5E6D3; }
      tr:nth-child(even) td { background: #faf7f2; }
    </style></head>
    <body>
      <h1>${title}</h1>
      ${subtitle ? `<p class="sub">${subtitle}</p>` : ""}
      <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
      <script>window.onload = function(){ window.print(); }</script>
    </body></html>`);
  win.document.close();
}
