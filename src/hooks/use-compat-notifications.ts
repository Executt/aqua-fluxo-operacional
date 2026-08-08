import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { LoteAuditoriaRow } from "@/lib/lote-auditoria";

export interface CompatResolucao {
  chave: string;
  eteCodigo: string;
  periodo: string;
  motivo: string;
  horas: number;
  quando: string;
  loteId: string;
  tentativa: number;
}

const RUIM = new Set(["incompativel", "invalida", "falha"]);
const BOM = new Set(["compativel", "importada"]);

const chaveDe = (r: LoteAuditoriaRow) =>
  `${r.ete_codigo ?? r.ete_id ?? "?"}|${r.ano_referencia ?? "?"}|${r.mes_referencia ?? "?"}`;

/** Deteta linhas/lotes que passaram de incompatível para compatível, com tempo e motivo original. */
export function detectarResolucoes(rows: LoteAuditoriaRow[]): CompatResolucao[] {
  const falha = new Map<string, { t: number; motivo: string }>();
  const out: CompatResolucao[] = [];
  for (const r of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!r.ete_codigo && !r.ete_id) continue;
    const k = chaveDe(r);
    const t = new Date(r.created_at).getTime();
    if (RUIM.has(r.resultado) || r.evento === "falha") {
      if (!falha.has(k)) falha.set(k, { t, motivo: (r.motivos || [])[0] ?? r.detalhe ?? "incompatibilidade técnica" });
      continue;
    }
    if (BOM.has(r.resultado)) {
      const f = falha.get(k);
      if (f && t >= f.t) {
        out.push({
          chave: `${k}|${r.id}`,
          eteCodigo: r.ete_codigo ?? "ETE",
          periodo: r.ano_referencia
            ? `${String(r.mes_referencia ?? 0).padStart(2, "0")}/${r.ano_referencia}`
            : "—",
          motivo: f.motivo,
          horas: (t - f.t) / 3_600_000,
          quando: r.created_at,
          loteId: r.lote_id,
          tentativa: r.tentativa,
        });
        falha.delete(k);
      }
    }
  }
  return out;
}

const fmtDuracao = (h: number) =>
  h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} dias`;

/**
 * Notifica na UI sempre que uma linha/lote deixa de ser incompatível após correção
 * do repositório/base, indicando tempo até compatibilizar e motivo original.
 */
export function useCompatNotifications(rows: LoteAuditoriaRow[]) {
  const vistos = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!rows.length) return;
    const resolucoes = detectarResolucoes(rows);
    if (vistos.current === null) {
      // baseline: não notifica o histórico já existente
      vistos.current = new Set(resolucoes.map((r) => r.chave));
      return;
    }
    for (const r of resolucoes) {
      if (vistos.current.has(r.chave)) continue;
      vistos.current.add(r.chave);
      toast.success(`${r.eteCodigo} ${r.periodo} agora está compatível`, {
        description: `Resolvido em ${fmtDuracao(r.horas)} · motivo anterior: ${r.motivo} · lote ${r.loteId.slice(0, 8)} (tentativa ${r.tentativa})`,
        duration: 8000,
      });
    }
  }, [rows]);

  return detectarResolucoes(rows);
}
