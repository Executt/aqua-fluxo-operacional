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

/* ------------------------------------------------------------------ */
/* Relatório institucional (cabeçalho, sumário, paginação, assinatura) */
/* ------------------------------------------------------------------ */

export interface AssinaturaEletronica {
  nome: string;
  cargo?: string;
  email?: string;
  papel?: string;
  /** Hash/identificador único que autentica o documento. */
  hash?: string;
}

export interface SecaoRelatorio {
  titulo: string;
  descricao?: string;
  headers: string[];
  rows: Cell[][];
}

const ORG = "SIGSAN — Sistema de Gestão do Saneamento";
const SUB_ORG = "Curadoria Nacional de Saneamento · Agência Nacional de Águas e Saneamento Básico (ANA)";
const AZUL: [number, number, number] = [0, 112, 242];

/** Hash curto determinístico (FNV-1a) usado como código de autenticação do documento. */
export function docHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, "0");
}

export interface ResultadoPdfInstitucional {
  protocolo: string;
  checksum: string;
  verificacaoUrl: string;
  emitidoEm: string;
}

export function downloadInstitutionalPdf(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  protocolo?: string;
  summary?: PdfSummaryItem[];
  notes?: string[];
  secoes: SecaoRelatorio[];
  assinatura?: AssinaturaEletronica;
}): ResultadoPdfInstitucional {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const emitido = new Date();
  const protocolo =
    opts.protocolo ?? `SIGSAN-${emitido.toISOString().slice(0, 10).replace(/-/g, "")}-${docHash(opts.title + emitido.toISOString())}`;

  // Checksum do conteúdo: cobre sumário, indicadores e todas as linhas das seções.
  const conteudo = JSON.stringify([
    opts.title,
    opts.summary ?? [],
    opts.secoes.map((s) => [s.titulo, s.headers, s.rows]),
  ]);
  const checksum = `${docHash(conteudo)}-${docHash(conteudo.split("").reverse().join(""))}`;
  const verificacaoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verificar-documento?p=${encodeURIComponent(protocolo)}&c=${encodeURIComponent(checksum)}`
      : `/verificar-documento?p=${protocolo}&c=${checksum}`;


  const header = () => {
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, W, 54, "F");
    doc.setTextColor(255);
    doc.setFontSize(12);
    doc.text(ORG, 40, 24);
    doc.setFontSize(8);
    doc.text(SUB_ORG, 40, 40);
    doc.setFontSize(8);
    doc.text(`Protocolo ${protocolo}`, W - 40, 24, { align: "right" });
    doc.text(emitido.toLocaleString("pt-BR"), W - 40, 40, { align: "right" });
    doc.setTextColor(0);
  };

  header();

  doc.setFontSize(14);
  doc.text(opts.title, 40, 86);
  if (opts.subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(opts.subtitle, 40, 102);
    doc.setTextColor(0);
  }

  let y = opts.subtitle ? 122 : 106;

  // Sumário
  doc.setFontSize(10);
  doc.text("Sumário", 40, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [["#", "Seção", "Registos"]],
    body: opts.secoes.map((s, i) => [String(i + 1), s.titulo, String(s.rows.length)]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: AZUL, textColor: 255 },
    margin: { left: 40, right: 40 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;

  if (opts.summary?.length) {
    doc.setFontSize(10);
    doc.text("Indicadores consolidados", 40, y);
    autoTable(doc, {
      startY: y + 6,
      head: [opts.summary.map((s) => s.label)],
      body: [opts.summary.map((s) => String(s.value))],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: AZUL, textColor: 255 },
      margin: { left: 40, right: 40 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  }

  if (opts.notes?.length) {
    doc.setFontSize(8);
    doc.setTextColor(110);
    for (const n of opts.notes) {
      doc.text(`• ${n}`, 40, y);
      y += 12;
    }
    doc.setTextColor(0);
    y += 6;
  }

  opts.secoes.forEach((s, i) => {
    doc.setFontSize(10);
    doc.text(`${i + 1}. ${s.titulo}`, 40, y);
    y += 6;
    if (s.descricao) {
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(s.descricao, 40, y + 6);
      doc.setTextColor(0);
      y += 12;
    }
    autoTable(doc, {
      startY: y + 4,
      head: [s.headers],
      body: s.rows.map((r) => r.map((c) => (c === null || c === undefined ? "" : String(c)))),
      theme: "striped",
      styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: AZUL, textColor: 255 },
      margin: { left: 40, right: 40, top: 70 },
      didDrawPage: () => header(),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
    if (i < opts.secoes.length - 1 && y > doc.internal.pageSize.getHeight() - 140) {
      doc.addPage();
      header();
      y = 86;
    }
  });

  // Assinatura eletrónica + verificação pública
  if (opts.assinatura) {
    const H = doc.internal.pageSize.getHeight();
    if (y > H - 190) {
      doc.addPage();
      header();
      y = 86;
    }
    const a = opts.assinatura;
    const hash = a.hash ?? docHash(`${protocolo}|${a.nome}|${a.email ?? ""}`);
    doc.setDrawColor(...AZUL);
    doc.setLineWidth(0.8);
    doc.rect(40, y, W - 80, 132);
    doc.setFontSize(9);
    doc.text("Assinatura eletrónica do responsável", 52, y + 20);
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(
      [
        `Nome: ${a.nome}`,
        `Cargo/Papel: ${[a.cargo, a.papel].filter(Boolean).join(" · ") || "—"}`,
        `E-mail: ${a.email ?? "—"}`,
        `Assinado em: ${emitido.toLocaleString("pt-BR")}`,
        `Código de autenticação: ${hash} · Protocolo: ${protocolo}`,
        `Checksum do conteúdo (SIGSAN-FNV): ${checksum}`,
        "Documento assinado eletronicamente conforme MP 2.200-2/2001 (ICP-Brasil, assinatura simples).",
        "Verificação pública (protocolo + checksum, registo consultável na trilha de auditoria):",
      ].join("\n"),
      52,
      y + 36,
      { lineHeightFactor: 1.4 },
    );
    doc.setTextColor(...AZUL);
    doc.textWithLink(verificacaoUrl, 52, y + 122, { url: verificacaoUrl });
    doc.setTextColor(0);
  }

  // Numeração "Página X de Y"
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`Página ${p} de ${total}`, W - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
    doc.text(`${ORG} · Protocolo ${protocolo} · Checksum ${checksum}`, 40, doc.internal.pageSize.getHeight() - 20);
    doc.setTextColor(0);
  }

  doc.save(opts.filename);
  return { protocolo, checksum, verificacaoUrl, emitidoEm: emitido.toISOString() };

}

