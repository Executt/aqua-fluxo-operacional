# 12 — Banco de Dados (visão consolidada)

Visão por domínio das tabelas, funções e GRANTs do SIGSAN-FED. Detalhe coluna a coluna em [03 — Database Schema](./03-database-schema.md); diagrama em [13 — Diagrama ER](./13-diagrama-er.md).

## 1. Domínios

| Domínio | Tabelas principais |
|---|---|
| Identidade & RBAC | `profiles`, `user_roles` |
| Cadastro nacional | `operadores`, `operador_municipios`, `tipologias_tratamento`, `etes_curadoria`, `entidades`, `etes` |
| Curadoria | `formulario_respostas`, `formulario_respostas_audit`, `curadoria_lote_auditoria` |
| Compliance | `compliance_scores`, `compliance_regras`, `compliance_notificacoes`, `compliance_escalonamentos`, `infracoes`, `planos_acao`, `planos_acao_itens` |
| IoT | `sensores`, `sensor_leituras` |
| Conhecimento & IA | `knowledge_base`, `llm_models`, `mcp_servers` |
| Infraestrutura de dados | `data_repositories`, `database_connections`, `connection_test_jobs`, `repository_sync_jobs`, `infra_audit_log` |
| SARSB / datasets | `sasb_datasets`, `sasb_sync_logs` |
| Anti-confounding (DMI) | `dim_maturidade_municipal`, `analytics_guardrail_log` |
| Analítico (Metabase) | `dim_municipio`, `dim_tipologia`, `dim_operador`, `fato_etes_curadoria`, `mv_*` |
| Plataforma | `system_settings`, `sensitive_access_log`, `entidade_api_keys`, `entidade_integracao_config` |

## 2. Funções de banco

| Função | Tipo | Uso |
|---|---|---|
| `has_role(uuid, app_role)` | security definer | base de todas as políticas RLS de papel |
| `is_staff(uuid)` | security definer | admin/gestor/auditor |
| `get_user_operador(uuid)` | security definer | escopo do operador nas policies |
| `handle_new_user()` | trigger | cria `profiles` no signup |
| `validate_estado_transition()` | trigger | state machine da curadoria |
| `log_formulario_respostas_audit()` | trigger | diff de auditoria |
| `set_payload_sha256()` / `set_updated_by()` | trigger | integridade e autoria |
| `classify_faixa_dbo()` | trigger | faixa de eficiência DBO |
| `refresh_metabase_views()` | security definer | refresh das MVs (pg_cron 15 min) |
| `get_metabase_refresh_status()` | security definer | telemetria do job para a UI |
| `update_updated_at_column()` | trigger | carimbo `updated_at` |

## 3. Padrão obrigatório de GRANTs

Toda tabela nova no schema `public` segue, na mesma migração:

```sql
CREATE TABLE public.exemplo (...);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exemplo TO authenticated;
GRANT ALL ON public.exemplo TO service_role;
-- GRANT SELECT ... TO anon;  -- apenas se existir policy pública
ALTER TABLE public.exemplo ENABLE ROW LEVEL SECURITY;
CREATE POLICY ...;
```

Roles em uso: `anon` (leitura pública limitada), `authenticated` (app), `service_role` (edge functions), `metabase_reader` (SELECT apenas no star-schema).

## 4. Imutabilidade e trilhas

| Tabela | Regra |
|---|---|
| `formulario_respostas` | sem DELETE; payload imutável em `validado`/`rejeitado` |
| `formulario_respostas_audit` | append-only (sem INSERT/UPDATE/DELETE de cliente) |
| `curadoria_lote_auditoria` | append-only; `actor_id = auth.uid()` |
| `infra_audit_log` | append-only; motivo obrigatório em ativação/desativação |
| `analytics_guardrail_log` | append-only (registo do guard-rail DMI) |
