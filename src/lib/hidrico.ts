/**
 * Indicadores de recursos hídricos derivados da submissão de curadoria.
 *
 * Referências:
 * - CONAMA 430/2011, art. 21: DBO efluente ≤ 120 mg/L OU remoção mínima de 60%.
 * - CONAMA 357/2005: faixa de pH 5–9 e OD mínimo para corpos receptores.
 * - Atlas Esgotos (ANA/SNS): DBO afluente típica de esgoto doméstico ≈ 300 mg/L.
 */

export const DBO_AFLUENTE_TIPICA_MG_L = 300;

export interface IndicadoresHidricos {
  vazaoM3Dia?: number;
  cargaAfluenteKgDia?: number;
  cargaRemovidaKgDia?: number;
  cargaRemanescenteKgDia?: number;
  dboEfluenteEstimadoMgL?: number;
  utilizacaoCapacidadePct?: number;
  atendeConama430?: boolean;
}

const num = (p: Record<string, unknown>, k: string): number | undefined =>
  typeof p?.[k] === "number" && Number.isFinite(p[k] as number) ? (p[k] as number) : undefined;

export function computeIndicadoresHidricos(
  payload: Record<string, unknown>,
  opts: { vazaoProjetoLps?: number | null; dboAfluenteMgL?: number } = {},
): IndicadoresHidricos {
  const ef = num(payload, "eficiencia_dbo_pct");
  const q = num(payload, "vazao_media_lps");
  const dboIn = num(payload, "dbo_afluente_mg_l") ?? opts.dboAfluenteMgL ?? DBO_AFLUENTE_TIPICA_MG_L;

  const out: IndicadoresHidricos = {};
  if (q !== undefined && q > 0) {
    out.vazaoM3Dia = q * 86.4;
    out.cargaAfluenteKgDia = (out.vazaoM3Dia * dboIn) / 1000;
    if (ef !== undefined && ef >= 0 && ef <= 100) {
      out.cargaRemovidaKgDia = (out.cargaAfluenteKgDia * ef) / 100;
      out.cargaRemanescenteKgDia = out.cargaAfluenteKgDia - out.cargaRemovidaKgDia;
    }
    if (opts.vazaoProjetoLps && opts.vazaoProjetoLps > 0) {
      out.utilizacaoCapacidadePct = (q / opts.vazaoProjetoLps) * 100;
    }
  }
  if (ef !== undefined && ef >= 0 && ef <= 100) {
    out.dboEfluenteEstimadoMgL = (dboIn * (100 - ef)) / 100;
    out.atendeConama430 = ef >= 60 || out.dboEfluenteEstimadoMgL <= 120;
  }
  return out;
}

/** Alertas hidro-sanitários adicionais (sinalizam, não bloqueiam). */
export function alertasHidricos(
  payload: Record<string, unknown>,
  opts: { vazaoProjetoLps?: number | null } = {},
): string[] {
  const ind = computeIndicadoresHidricos(payload, opts);
  const out: string[] = [];
  if (ind.atendeConama430 === false) {
    out.push(
      `Não atende CONAMA 430 art. 21 (DBO efluente estimada ${ind.dboEfluenteEstimadoMgL?.toFixed(0)} mg/L e remoção < 60%)`,
    );
  }
  if (ind.utilizacaoCapacidadePct !== undefined) {
    if (ind.utilizacaoCapacidadePct > 100) {
      out.push(`Sobrecarga hidráulica: ${ind.utilizacaoCapacidadePct.toFixed(0)}% da vazão de projeto`);
    } else if (ind.utilizacaoCapacidadePct > 90) {
      out.push(`Capacidade quase esgotada: ${ind.utilizacaoCapacidadePct.toFixed(0)}% da vazão de projeto`);
    } else if (ind.utilizacaoCapacidadePct < 20) {
      out.push(`Ociosidade elevada: apenas ${ind.utilizacaoCapacidadePct.toFixed(0)}% da vazão de projeto`);
    }
  }
  return out;
}

export const fmt = (v?: number, dec = 1): string =>
  v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: dec });
