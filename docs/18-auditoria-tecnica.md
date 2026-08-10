# 18 — Auditoria Técnica (Entrega A–F do Prompt Mestre)

> Diagnóstico executado antes de qualquer alteração de código, conforme §5, §6 e §40 do Prompt Mestre de Evolução. Data: 2026-08-10.

## A. Diagnóstico arquitetural

| Camada | Stack atual | Avaliação |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui | Sólido. Manter. |
| Estado/dados | TanStack Query (parcial) + `useState`/`useEffect` diretos com `supabase-js` | **Inconsistente** — só Curadoria e parte de Compliance usam React Query |
| Backend | 14 Edge Functions Deno + PostgREST | Adequado; validação e authz desiguais entre funções |
| Banco | Postgres 15, 38 tabelas, RLS habilitado em 100% delas, 7 MVs, pg_cron | Bom alicerce; faltam índices e constraints em partes |
| IA | Cortex-San (Lovable AI Gateway) + RAG-lite + MCP | Funcional, **inseguro** (ver C-01/C-02) |
| Observabilidade | `infra_audit_log`, `formulario_respostas_audit`, `curadoria_lote_auditoria`, `sensitive_access_log` | Trilhas boas; falta correlation ID e métricas |
| Testes/CI | 1 teste de exemplo (7 linhas), sem CI | **Crítico** |

Decisões arquiteturais boas a preservar: RLS em todas as tabelas com `has_role`/`is_staff` security-definer; star schema isolado para Metabase (`metabase_reader`); state machine da curadoria validada por trigger; trilhas append-only; guard-rail anti-confounding (DMI).

## B. Mapa do sistema

```text
React (11 páginas)
 ├── /            Dashboard (KPIs, mapa, alertas)
 ├── /iot         Sensores, leituras, bateria/sinal
 ├── /compliance  Scores, ranking, evolução, infrações, auditorias, automação
 ├── /curadoria   Submissões, validações, importação em lote (+ /auditoria)
 ├── /entidades   Cadastro, ETEs, chaves de API, integrações
 ├── /cortex      Cortex-San (chat + RAG)
 ├── /admin       LLM, MCP, conhecimento, repositórios, bases, SARSB, DMI, regras, Metabase
 └── /verificar-documento  Verificação pública de assinatura (sem login)

Edge Functions: cortex-chat · curadoria-{submit,transition,bulk-insert,ai-precheck,verificar-doc}
 · compliance-{auto-detect,notify-dispatch,plano-transition,escalonamento-cron}
 · connection-test · repository-sync · sasb-sync · analytics-guardrail · metabase-refresh-status · entidade-api-keys

Domínios de dados: Identidade/RBAC · Cadastro nacional · Curadoria · Compliance · IoT
 · Conhecimento & IA · Infraestrutura de dados · SARSB · Anti-confounding (DMI) · Analítico
```

## C. Problemas encontrados

### Severidade CRÍTICA

| ID | Achado | Evidência | Risco |
|---|---|---|---|
| C-01 | **SSRF na função de IA** — `cortex-chat` faz `fetch(mcpEndpoint)` para URL arbitrária vinda do corpo da requisição | `supabase/functions/cortex-chat/index.ts` | Varredura da rede interna, acesso ao metadata endpoint, exfiltração |
| C-02 | **`cortex-chat` com `verify_jwt = false`** e sem rate limiting | `supabase/config.toml` | Abuso de créditos de IA por terceiros, DoS financeiro |
| C-03 | **CORS `*` em todas as funções**, inclusive as autenticadas | `supabase/functions/_shared/cors.ts` | Uso cross-origin do token do utilizador |
| C-04 | **Ausência de testes** (1 teste trivial), sem CI, sem testes de RLS | `src/test/` | Qualquer alteração pode quebrar authz sem deteção |

### Severidade ALTA

| ID | Achado | Evidência |
|---|---|---|
| A-01 | 6 tabelas operacionais legíveis por `anon` (`entidades`, `etes`, `sensores`, `sensor_leituras`, `compliance_scores`, `infracoes`) | `pg_policies` |
| A-02 | Rotas `/`, `/iot`, `/compliance`, `/entidades`, `/cortex` sem `ProtectedRoute` | `src/App.tsx` |
| A-03 | Sem rate limiting em nenhuma Edge Function |  todas |
| A-04 | Sem correlation ID / logging estruturado nas funções | todas |
| A-05 | Prompt injection: conteúdo de `knowledge_base` entra no prompt sem delimitação de confiança | `cortex-chat`, `curadoria-ai-precheck` |

### Severidade MÉDIA

| ID | Achado |
|---|---|
| M-01 | Dados fictícios remanescentes: `mockConversations` em `src/pages/CortexSan.tsx:72` (histórico de conversas falso) |
| M-02 | Gestão de estado híbrida — chamadas diretas ao Supabase em `IoTMonitor`, `Entidades`, `Administracao` sem cache/revalidação |
| M-03 | Faltam índices: `infracoes(entidade_id, status, prazo)`, `sensores(ete_id)`, `etes(entidade_id)` |
| M-04 | Faltam FKs reais em `etes.entidade_id` e `sensores.ete_id` (FK apenas lógica) |
| M-05 | Componentes grandes (>600 linhas): `BulkImportTab`, `CortexSan`, `Curadoria`, `ValidacoesTab` |
| M-06 | Acessibilidade não verificada: tabelas sem `caption`/`scope`, foco visível inconsistente |
| M-07 | Sem política de retenção implementada (RN-404 é apenas documental) |
| M-08 | Séries temporais agregadas parcialmente no cliente em alguns painéis |

### Severidade BAIXA
Bundle sem code-splitting por rota; ausência de virtualização em tabelas longas; `.env.example` inexistente; documentação sem marcação IMPLEMENTADO/PARCIAL/PLANEJADO.

## D. Matriz de priorização

| Prioridade | Item | Esforço | Impacto |
|---|---|---|---|
| **P0 — Segurança** | C-01 allowlist de MCP + bloqueio de IPs privados | S | Crítico |
| P0 | C-02 `verify_jwt=true` + rate limit por utilizador em `cortex-chat` | S | Crítico |
| P0 | C-03 CORS por allowlist de origem | S | Alto |
| P0 | A-01/A-02 fechar leitura anónima e proteger rotas | M | Crítico |
| **P1 — Fundação** | C-04 testes de RLS + unitários das regras hídricas + CI | M | Alto |
| P1 | A-03/A-04 rate limiting e correlation ID partilhados | M | Alto |
| P1 | M-03/M-04 índices e FKs | S | Médio |
| **P2 — Operação** | Motor de ocorrências/SLA unificado; retenção (M-07) | L | Alto |
| P2 | M-02 padronizar React Query em todas as páginas | M | Médio |
| **P3 — Inteligência** | A-05 hardening de prompt, rotulagem OBSERVADO/CALCULADO/INFERÊNCIA/RECOMENDAÇÃO | M | Alto |
| **P4 — Experiência** | M-01 histórico real de conversas; M-05 modularização; M-06 acessibilidade | M | Médio |

## E. Riscos de não agir

Exposição de dados regulatórios a não autenticados (A-01/A-02) com implicações de LGPD; consumo não controlado de créditos de IA e possível pivô para a rede interna (C-01/C-02); regressões silenciosas de autorização por falta de testes (C-04).

## F. Plano incremental proposto

1. **Ciclo 1 (P0) — ✅ IMPLEMENTADO (2026-08-10):** anti-SSRF em `cortex-chat` (só `https`, bloqueio de IPs privados/metadata, allowlist via `mcp_servers` ativos, timeout 30 s, sem redirects), `verify_jwt = true` + validação `getClaims` em código, rate limit 20 req/min por utilizador, CORS por allowlist de origem (`corsFor`), fecho do acesso `anon` às 6 tabelas operacionais (políticas agora `TO authenticated` + `REVOKE` de `anon`), `ProtectedRoute` em `/`, `/iot`, `/compliance`, `/entidades`, `/cortex`, e índices `infracoes(entidade_id,status,prazo)`, `sensores(ete_id)`, `etes(entidade_id)`.
2. **Ciclo 2 (P1):** helpers partilhados (`_shared/http.ts` com CORS, correlation ID, rate limit, erro padronizado), FKs reais, suíte de testes de RLS e regras hídricas, pipeline de CI.
3. **Ciclo 3 (P2):** motor de ocorrências/SLA, retenção automatizada, React Query em toda a app.
4. **Ciclo 4 (P3/P4):** hardening e rotulagem da IA, histórico real do Cortex, Design System consolidado e acessibilidade.

Cada ciclo entrega: objetivo → alteração → justificativa → validação → verificação de regressões.

---
Estado da documentação: este relatório é **IMPLEMENTADO** como diagnóstico; os itens do plano são **PLANEJADOS** até execução confirmada.
