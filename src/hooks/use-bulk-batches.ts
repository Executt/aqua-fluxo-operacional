import { useCallback, useEffect, useState } from "react";

export type BatchStatus = "concluido" | "parcial" | "falha" | "reenfileirado";

export interface BulkBatch {
  id: string;
  criadoEm: string;
  modo: "submeter" | "rascunho";
  origem: "arquivo" | "colado" | "reenfileiramento";
  nomeArquivo?: string;
  total: number;
  importadas: number;
  retidas: number;
  invalidas: number;
  status: BatchStatus;
  erro?: string;
  /** CSV (com cabeçalho) apenas das linhas que falharam — base para reenfileirar. */
  csvPendente?: string;
  tentativas: number;
  paiId?: string;
  /** id do lote na trilha de auditoria (curadoria_lote_auditoria.lote_id) */
  loteId?: string;
}

const KEY = "curadoria.bulk.batches.v1";
const LIMIT = 50;

function read(): BulkBatch[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BulkBatch[]) : [];
  } catch {
    return [];
  }
}

export function useBulkBatches() {
  const [batches, setBatches] = useState<BulkBatch[]>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(batches.slice(0, LIMIT)));
    } catch {
      /* quota — histórico é best-effort */
    }
  }, [batches]);

  const addBatch = useCallback((b: Omit<BulkBatch, "id" | "criadoEm" | "tentativas"> & { tentativas?: number }) => {
    const batch: BulkBatch = {
      ...b,
      tentativas: b.tentativas ?? 1,
      id: crypto.randomUUID(),
      criadoEm: new Date().toISOString(),
    };
    setBatches((prev) => [batch, ...prev].slice(0, LIMIT));
    return batch;
  }, []);

  const updateBatch = useCallback((id: string, patch: Partial<BulkBatch>) => {
    setBatches((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const removeBatch = useCallback((id: string) => setBatches((prev) => prev.filter((b) => b.id !== id)), []);
  const clear = useCallback(() => setBatches([]), []);

  return { batches, addBatch, updateBatch, removeBatch, clear };
}
