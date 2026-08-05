import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type Cell = string | number | null | undefined;

function esc(v: Cell): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))].join("\r\n");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCsv(filename: string, headers: string[], rows: Cell[][]) {
  // BOM garante acentuação correta no Excel pt-BR
  triggerDownload(new Blob(["\uFEFF" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" }), filename);
}

export interface PdfSummaryItem { label: string; value: string | number }

export function downloadPdf(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  summary?: PdfSummaryItem[];
  notes?: string[];
  headers: string[];
  rows: Cell[][];
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const now = new Date().toLocaleString("pt-BR");

  doc.setFontSize(14);
  doc.text(opts.title, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`${opts.subtitle ? opts.subtitle + " — " : ""}Gerado em ${now}`, 40, 56);
  doc.setTextColor(0);

  let y = 74;

  if (opts.summary?.length) {
    autoTable(doc, {
      startY: y,
      head: [opts.summary.map((s) => s.label)],
      body: [opts.summary.map((s) => String(s.value))],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [0, 112, 242], textColor: 255 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  }

  if (opts.notes?.length) {
    doc.setFontSize(8);
    doc.setTextColor(110);
    for (const n of opts.notes) {
      doc.text(`• ${n}`, 40, y);
      y += 12;
    }
    doc.setTextColor(0);
    y += 4;
  }

  autoTable(doc, {
    startY: y,
    head: [opts.headers],
    body: opts.rows.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c)))),
    theme: "striped",
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [0, 112, 242], textColor: 255 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(140);
      doc.text(`Página ${page}`, doc.internal.pageSize.getWidth() - 70, doc.internal.pageSize.getHeight() - 20);
      doc.setTextColor(0);
    },
  });

  doc.save(opts.filename);
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
}
