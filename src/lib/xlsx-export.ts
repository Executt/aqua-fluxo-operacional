import * as XLSX from "xlsx";
import type { Cell } from "./curadoria-export";

export interface XlsxSheet {
  /** Nome da aba (máx. 31 caracteres — é truncado automaticamente). */
  nome: string;
  headers: string[];
  rows: Cell[][];
}

function toAoa(sheet: XlsxSheet): (string | number)[][] {
  return [
    sheet.headers,
    ...sheet.rows.map((r) => r.map((c) => (c === null || c === undefined ? "" : typeof c === "number" ? c : String(c)))),
  ];
}

function autoWidth(aoa: (string | number)[][]) {
  const widths: { wch: number }[] = [];
  for (const row of aoa) {
    row.forEach((cell, i) => {
      const len = String(cell ?? "").length + 2;
      widths[i] = { wch: Math.min(60, Math.max(widths[i]?.wch ?? 10, len)) };
    });
  }
  return widths;
}

/** Exporta várias abas (estatísticas + linhas filtradas) para um ficheiro .xlsx. */
export function downloadXlsx(filename: string, sheets: XlsxSheet[]) {
  const wb = XLSX.utils.book_new();
  const usados = new Set<string>();
  for (const s of sheets) {
    const aoa = toAoa(s);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = autoWidth(aoa);
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    let nome = s.nome.replace(/[\\/?*[\]:]/g, "-").slice(0, 31) || "Dados";
    let i = 2;
    while (usados.has(nome)) nome = `${nome.slice(0, 28)}_${i++}`;
    usados.add(nome);
    XLSX.utils.book_append_sheet(wb, ws, nome);
  }
  XLSX.writeFile(wb, filename, { compression: true });
}
