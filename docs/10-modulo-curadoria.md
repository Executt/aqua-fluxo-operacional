# 10 — Módulo Curadoria Nacional de Saneamento

> Permite que milhares de operadores (concessionárias estaduais, regionais, municipais e autarquias) submetam, validem e atualizem dados das suas **Estações de Tratamento de Esgoto (ETEs)**, com base nos parâmetros do **Atlas Esgotos / ANA** e da **CONAMA 357/2005**.

## 1. Diagrama lógico

```mermaid
erDiagram
  auth_users ||--o| profiles : "1:1"
  profiles }o--|| operadores : "operador_id"
  operadores ||--o{ operador_municipios : "atende N municípios"
  operadores ||--o{ etes_curadoria : "possui"
  tipologias_tratamento ||--o{ etes_curadoria : "classifica"
  etes_curadoria ||--o{ formulario_respostas : "submissões mensais"
  user_roles }o--|| auth_users : "RBAC"

  profiles { uuid user_id PK FK; text nome; uuid operador_id FK; bool ativo }
  operadores { uuid id PK; text cnpj UK; tipo_operador tipo; char uf }
  operador_municipios { uuid id PK; uuid operador_id FK; text municipio_ibge; char uf }
  tipologias_tratamento { uuid id PK; text codigo UK; text categoria; numeric eficiencia_dbo_tipica_min; numeric eficiencia_dbo_tipica_max }
  etes_curadoria { uuid id PK; uuid operador_id FK; uuid tipologia_id FK; status_operacional status; numeric vazao_atual_lps; numeric eficiencia_dbo_pct; faixa_eficiencia_dbo faixa_dbo }
  formulario_respostas { uuid id PK; uuid ete_id FK; estado_resposta estado; jsonb payload; int ano_referencia; int mes_referencia }
  user_roles { uuid id PK; uuid user_id FK; app_role role }
```

## 2. State Machine (formulário)

```
   ┌────────┐ submeter   ┌──────────┐ analisar  ┌────────────┐ validar  ┌──────────┐
   │RASCUNHO├──────────► │SUBMETIDO ├─────────► │EM_ANALISE  ├────────► │ VALIDADO │ (final)
   └────▲───┘            └──────────┘           └─────┬──────┘          └──────────┘
        │ reabrir                                     │ rejeitar
        │                                             ▼
        │                                       ┌──────────┐
        └───────────────────────────────────────┤REJEITADO │
                                                └──────────┘
```

Validada por **trigger `validate_estado_transition`** no banco e por **`curadoria-transition`** na borda. Registos em `validado` são imutáveis (payload bloqueado).

## 3. RBAC

| Perfil | Vê | Submete | Analisa / Valida / Rejeita | Configura |
|---|---|---|---|---|
| **Operador** | ETEs/respostas dos seus municípios | ✅ (rascunho/submetido) | — | — |
| **Auditor** | Tudo | — | ✅ | — |
| **Gestor** | Tudo + analytics | — | ✅ | — |
| **Admin** | Tudo | ✅ | ✅ | ✅ |

Implementado via `has_role()` + `is_staff()` + `get_user_operador()` (todas SECURITY DEFINER, `search_path = public`).

## 4. APIs

| Endpoint | Método | Descrição |
|---|---|---|
| `/functions/v1/curadoria-submit` | POST | Cria/atualiza resposta (rascunho ou submetido) |
| `/functions/v1/curadoria-transition` | POST | Aplica transição da state machine com RBAC |
| `/functions/v1/curadoria-bulk-insert` | POST | Importa até 1000 respostas (bulk) |

DTOs em `supabase/functions/_shared/curadoria-dtos.ts` (Zod) — validam:
- `eficiencia_dbo_pct ∈ [0,100]`
- `vazao_atual_lps ≤ 1.2 × vazao_projeto_lps`
- `municipio_ibge` 7 dígitos
- `mes_referencia ∈ [1,12]`, `ano_referencia ∈ [2000, atual+1]`
- `pH ∈ [0,14]`, `OD ∈ [0,20]`

## 5. Tipologias (domínio)

10 tipologias pré-cadastradas: Lagoa Facultativa, Lagoa Anaeróbia, Lagoa Aerada, UASB, Filtro Biológico, Lodos Ativados (e variante c/ aeração prolongada), Tratamento Primário, Preliminar, Terciário c/ remoção de nutrientes — cada uma com faixa típica de eficiência DBO.

## 6. Categorização automática DBO

Trigger `classify_faixa_dbo` deriva `faixa_dbo`:

| Faixa | Critério |
|---|---|
| `baixa` | eficiência < 60% |
| `normal` | 60% ≤ eficiência ≤ 80% |
| `alta` | eficiência > 80% |

## 7. Camada Analítica (Star Schema → Metabase)

### Dimensões (`dim_*`)
- `dim_municipio` (PK `municipio_ibge`)
- `dim_tipologia` (PK `tipologia_id`)
- `dim_operador` (PK `operador_id`)

### Fato
- `fato_etes_curadoria` — uma linha por ETE com FKs para todas dimensões + métricas (`eficiencia_dbo_pct`, `pct_utilizacao` calculado).

### Agregações pré-calculadas
- `mv_cobertura_municipal` — qt ETEs, população atendida, eficiência média DBO por município
- `mv_etes_por_tipologia` — contagem e eficiência média por tipologia × UF
- `mv_dbo_regional` — agrega por UF + região (Norte, Nordeste, Centro-Oeste, Sudeste, Sul) com distribuição alta/normal/baixa

### Refresh
```sql
SELECT public.refresh_metabase_views();
```
Recomendado agendar via `pg_cron` (planejado: a cada 15 min) ou trigger pós-validação. Acesso REVOGADO de `anon`/`authenticated` — apenas o utilizador de banco do Metabase pode consultar.

## 8. Integração Metabase

1. Criar utilizador Postgres `metabase_reader` com `GRANT SELECT` apenas nas `dim_*`, `fato_*` e `mv_*`.
2. Conectar Metabase ao Postgres (read-only).
3. Modelar dashboards usando o star schema — sem tocar nas tabelas transacionais.

## 9. Imutabilidade & Auditoria

- `formulario_respostas` **sem DELETE** (RLS).
- Transições registadas em `submitted_at` / `reviewed_at` + `user_submitter` / `user_revisor`.
- Trigger bloqueia alteração de `payload` quando `estado IN ('validado','rejeitado')`.

## 10. Escalabilidade (OpenShift)

- **Estado** vive 100% no Postgres (sem sessão em memória).
- Edge Functions são **stateless** (Deno) → escalam horizontalmente.
- Bulk insert limitado a **1000 respostas/req** para evitar timeouts; clientes maiores devem chunkar.
- Materialized views isolam carga analítica do tráfego transacional → Metabase nunca derruba o front.

## 11. Roadmap

- [ ] Cron `pg_cron` para `refresh_metabase_views()`
- [ ] Histórico de transições (`formulario_respostas_log`)
- [ ] Score automático por município (% ETEs com DBO alta)
- [ ] Webhook para SEI ao validar resposta
- [ ] Importação CSV via UI (`/curadoria?tab=bulk`)
