# 15 — APIs e Integrações

## 1. PostgREST

Base: `${VITE_SUPABASE_URL}/rest/v1/` — sempre consumido via SDK (`supabase.from(...)`), nunca por REST cru.
Acesso governado por RLS + GRANTs (ver [12](./12-banco-de-dados.md) e [05](./05-rls-policies.md)).

## 2. Realtime

| Canal | Tabela | Uso |
|---|---|---|
| `iot-leituras` | `sensor_leituras` (INSERT) | telemetria ao vivo no `/iot` |
| `compliance-notificacoes` | `compliance_notificacoes` (INSERT) | `NotificationBell` |

## 3. Edge Functions

| Função | JWT | Propósito |
|---|---|---|
| `cortex-chat` | não | Chat IA (Lovable AI Gateway, modelo padrão de `llm_models`) |
| `curadoria-submit` | sim | Upsert de resposta por `(ete, ano, mês)` |
| `curadoria-transition` | sim | State machine com RBAC |
| `curadoria-bulk-insert` | sim | Importação em lote (até 1000 linhas, falha parcial tolerada) |
| `curadoria-ai-precheck` | sim | Pré-análise RAG-lite com contexto DMI |
| `analytics-guardrail` | sim | Bloqueia modelos sem variável de controlo de maturidade |
| `compliance-auto-detect` | sim | Aplica `compliance_regras` e cria infrações |
| `compliance-plano-transition` | sim | Fluxo dos planos de ação |
| `compliance-notify-dispatch` | sim | Envio de e-mail/webhook |
| `compliance-escalonamento-cron` | não | Escalonamento por atraso (pg_cron) |
| `entidade-api-keys` | sim | Emissão/revogação de chaves (hash SHA-256) |
| `connection-test` | sim | Teste de conectividade de repositórios/bases |
| `repository-sync` | sim | Sincronização incremental de repositórios |
| `sasb-sync` | sim | Ingestão e validação de qualidade dos datasets |
| `metabase-refresh-status` | não | Telemetria do job de refresh |

Convenções: validação `zod`, CORS em todas as respostas, erros `400/401/403/429/500` com `{ error }`, nunca SQL cru.

## 4. Segredos

`LOVABLE_API_KEY`, `COMPLIANCE_CRON_SECRET`, `SUPABASE_*`. Nenhum segredo é exposto ao frontend; chaves de integração de entidades são guardadas apenas como hash + prefixo.

## 5. Trilhas de integração

| Evento | Registo |
|---|---|
| Criar/editar/ativar repositório ou base | `infra_audit_log` (com motivo) |
| Teste de conexão assíncrono | `connection_test_jobs` |
| Sincronização de repositório | `repository_sync_jobs` |
| Validação/importação/reenfileiramento de lote | `curadoria_lote_auditoria` |
