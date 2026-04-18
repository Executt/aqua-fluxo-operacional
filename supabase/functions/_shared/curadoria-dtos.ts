// =============================================================================
// DTOs (Zod) — Módulo Curadoria Nacional de Saneamento
// Validações alinhadas a CONAMA 357/2005, Atlas Esgotos (ANA) e
// limites físicos esperados (vazão, eficiência, população).
// =============================================================================
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const StatusOperacional = z.enum([
  "ativa",
  "em_construcao_ampliacao",
  "inativa_desativada",
  "planejada",
]);

export const FaixaDbo = z.enum(["baixa", "normal", "alta"]);

export const EstadoResposta = z.enum([
  "rascunho",
  "submetido",
  "em_analise",
  "validado",
  "rejeitado",
]);

/** Código IBGE de município: 7 dígitos. */
export const MunicipioIbge = z.string().regex(/^\d{7}$/, "IBGE deve ter 7 dígitos");

/** UF: 2 letras maiúsculas. */
export const UF = z
  .string()
  .length(2)
  .transform((s) => s.toUpperCase())
  .refine(
    (s) =>
      [
        "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
        "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
      ].includes(s),
    "UF inválida",
  );

// ---------------------------------------------------------------------------
// ETE Curadoria
// ---------------------------------------------------------------------------
export const EteCuradoriaCreate = z.object({
  operador_id: z.string().uuid(),
  tipologia_id: z.string().uuid().optional(),
  codigo: z.string().trim().min(3).max(50),
  nome: z.string().trim().min(3).max(200),
  municipio_ibge: MunicipioIbge,
  municipio_nome: z.string().trim().min(2).max(120),
  uf: UF,
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status_operacional: StatusOperacional.default("ativa"),
  vazao_projeto_lps: z.number().nonnegative().max(50_000).optional(),
  vazao_atual_lps: z.number().nonnegative().max(50_000).optional(),
  populacao_atendida: z.number().int().nonnegative().max(50_000_000).optional(),
  eficiencia_dbo_pct: z.number().min(0).max(100).optional(),
  ano_inicio_operacao: z.number().int().min(1900).max(new Date().getFullYear() + 5).optional(),
  observacoes: z.string().max(2000).optional(),
}).refine(
  (d) =>
    !d.vazao_atual_lps ||
    !d.vazao_projeto_lps ||
    d.vazao_atual_lps <= d.vazao_projeto_lps * 1.2,
  { message: "Vazão atual não pode exceder 120% da vazão de projeto" },
);

export type EteCuradoriaCreateDTO = z.infer<typeof EteCuradoriaCreate>;

export const EteCuradoriaBulk = z.object({
  operador_id: z.string().uuid(),
  etes: z.array(EteCuradoriaCreate.innerType().omit({ operador_id: true }))
    .min(1)
    .max(500, "Máximo de 500 ETEs por lote"),
});

// ---------------------------------------------------------------------------
// Formulário Resposta
// ---------------------------------------------------------------------------
export const FormularioRespostaSubmit = z.object({
  ete_id: z.string().uuid(),
  ano_referencia: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  mes_referencia: z.number().int().min(1).max(12),
  payload: z
    .object({
      eficiencia_dbo_pct: z.number().min(0).max(100).optional(),
      eficiencia_dqo_pct: z.number().min(0).max(100).optional(),
      vazao_media_lps: z.number().nonnegative().max(50_000).optional(),
      volume_tratado_m3: z.number().nonnegative().optional(),
      ph_medio: z.number().min(0).max(14).optional(),
      od_medio_mg_l: z.number().min(0).max(20).optional(),
      coliformes_nmp_100ml: z.number().nonnegative().optional(),
      observacoes: z.string().max(2000).optional(),
    })
    .passthrough(),
  estado: z.enum(["rascunho", "submetido"]).default("rascunho"),
});

export type FormularioRespostaSubmitDTO = z.infer<typeof FormularioRespostaSubmit>;

// ---------------------------------------------------------------------------
// State Machine — transições válidas
// ---------------------------------------------------------------------------
export const TRANSICOES_VALIDAS: Record<
  z.infer<typeof EstadoResposta>,
  z.infer<typeof EstadoResposta>[]
> = {
  rascunho: ["submetido"],
  submetido: ["em_analise"],
  em_analise: ["validado", "rejeitado"],
  validado: [],
  rejeitado: ["rascunho"],
};

export const TransicaoEstado = z.object({
  resposta_id: z.string().uuid(),
  novo_estado: EstadoResposta,
  motivo_rejeicao: z.string().max(1000).optional(),
}).refine(
  (d) => d.novo_estado !== "rejeitado" || !!d.motivo_rejeicao,
  { message: "motivo_rejeicao é obrigatório ao rejeitar" },
);

// ---------------------------------------------------------------------------
// Bulk insert — formulário em lote (importação de sistemas internos)
// ---------------------------------------------------------------------------
export const FormularioBulkInsert = z.object({
  operador_id: z.string().uuid(),
  respostas: z
    .array(FormularioRespostaSubmit)
    .min(1)
    .max(1000, "Máximo de 1000 respostas por lote"),
});
