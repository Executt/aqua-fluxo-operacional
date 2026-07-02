
DROP MATERIALIZED VIEW IF EXISTS public.mv_cobertura_municipal CASCADE;
CREATE MATERIALIZED VIEW public.mv_cobertura_municipal AS
SELECT
  e.municipio_ibge,
  e.uf,
  COALESCE(d.estrato_dmi, 'E'::estrato_dmi) AS estrato_dmi,
  d.snis_completude_pct,
  COUNT(*)::int                                                           AS qt_etes,
  COUNT(*) FILTER (WHERE e.status_operacional = 'ativa')::int             AS qt_ativas,
  SUM(e.populacao_atendida) FILTER (WHERE e.status_operacional='ativa')   AS pop_atendida,
  AVG(e.eficiencia_dbo_pct) FILTER (WHERE e.status_operacional='ativa')   AS eficiencia_media_dbo
FROM public.etes_curadoria e
LEFT JOIN public.dim_maturidade_municipal d ON d.municipio_ibge = e.municipio_ibge
GROUP BY e.municipio_ibge, e.uf, COALESCE(d.estrato_dmi,'E'::estrato_dmi), d.snis_completude_pct;

CREATE UNIQUE INDEX mv_cobertura_municipal_pk
  ON public.mv_cobertura_municipal (municipio_ibge, estrato_dmi);
CREATE INDEX mv_cobertura_municipal_estrato ON public.mv_cobertura_municipal (estrato_dmi);
GRANT SELECT ON public.mv_cobertura_municipal TO authenticated, service_role;

DROP MATERIALIZED VIEW IF EXISTS public.mv_dbo_regional CASCADE;
CREATE MATERIALIZED VIEW public.mv_dbo_regional AS
SELECT
  e.uf,
  CASE e.uf
    WHEN 'AC' THEN 'Norte' WHEN 'AP' THEN 'Norte' WHEN 'AM' THEN 'Norte'
    WHEN 'PA' THEN 'Norte' WHEN 'RO' THEN 'Norte' WHEN 'RR' THEN 'Norte' WHEN 'TO' THEN 'Norte'
    WHEN 'AL' THEN 'Nordeste' WHEN 'BA' THEN 'Nordeste' WHEN 'CE' THEN 'Nordeste'
    WHEN 'MA' THEN 'Nordeste' WHEN 'PB' THEN 'Nordeste' WHEN 'PE' THEN 'Nordeste'
    WHEN 'PI' THEN 'Nordeste' WHEN 'RN' THEN 'Nordeste' WHEN 'SE' THEN 'Nordeste'
    WHEN 'DF' THEN 'Centro-Oeste' WHEN 'GO' THEN 'Centro-Oeste'
    WHEN 'MT' THEN 'Centro-Oeste' WHEN 'MS' THEN 'Centro-Oeste'
    WHEN 'ES' THEN 'Sudeste' WHEN 'MG' THEN 'Sudeste' WHEN 'RJ' THEN 'Sudeste' WHEN 'SP' THEN 'Sudeste'
    WHEN 'PR' THEN 'Sul' WHEN 'RS' THEN 'Sul' WHEN 'SC' THEN 'Sul'
  END AS regiao,
  COALESCE(d.estrato_dmi, 'E'::estrato_dmi) AS estrato_dmi,
  COUNT(*)::int                                                            AS qt_etes,
  AVG(e.eficiencia_dbo_pct)                                                AS eficiencia_media_dbo,
  COUNT(*) FILTER (WHERE e.faixa_dbo = 'alta')::int                        AS qt_alta,
  COUNT(*) FILTER (WHERE e.faixa_dbo = 'normal')::int                      AS qt_normal,
  COUNT(*) FILTER (WHERE e.faixa_dbo = 'baixa')::int                       AS qt_baixa
FROM public.etes_curadoria e
LEFT JOIN public.dim_maturidade_municipal d ON d.municipio_ibge = e.municipio_ibge
WHERE e.status_operacional = 'ativa'
GROUP BY e.uf, COALESCE(d.estrato_dmi,'E'::estrato_dmi);

CREATE UNIQUE INDEX mv_dbo_regional_pk ON public.mv_dbo_regional (uf, estrato_dmi);
CREATE INDEX mv_dbo_regional_estrato ON public.mv_dbo_regional (estrato_dmi);
GRANT SELECT ON public.mv_dbo_regional TO authenticated, service_role;

DROP MATERIALIZED VIEW IF EXISTS public.mv_saude_vs_saneamento_por_estrato CASCADE;
CREATE MATERIALIZED VIEW public.mv_saude_vs_saneamento_por_estrato AS
SELECT
  d.estrato_dmi,
  COUNT(DISTINCT e.municipio_ibge)::int                                     AS qt_municipios,
  COUNT(e.*)::int                                                           AS qt_etes,
  AVG(e.eficiencia_dbo_pct)                                                 AS eficiencia_media_dbo,
  SUM(e.populacao_atendida)                                                 AS pop_atendida,
  AVG(d.snis_completude_pct)                                                AS completude_media,
  NULL::numeric                                                             AS incidencia_doencas_hidricas_100k,
  NULL::numeric                                                             AS internacoes_dia_100k
FROM public.dim_maturidade_municipal d
LEFT JOIN public.etes_curadoria e
       ON e.municipio_ibge = d.municipio_ibge AND e.status_operacional='ativa'
GROUP BY d.estrato_dmi;

CREATE UNIQUE INDEX mv_saude_vs_saneamento_pk ON public.mv_saude_vs_saneamento_por_estrato (estrato_dmi);
GRANT SELECT ON public.mv_saude_vs_saneamento_por_estrato TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_metabase_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dim_municipio;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dim_tipologia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dim_operador;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.fato_etes_curadoria;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cobertura_municipal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_etes_por_tipologia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dbo_regional;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_saude_vs_saneamento_por_estrato;
END;
$function$;

REFRESH MATERIALIZED VIEW public.mv_cobertura_municipal;
REFRESH MATERIALIZED VIEW public.mv_dbo_regional;
REFRESH MATERIALIZED VIEW public.mv_saude_vs_saneamento_por_estrato;
