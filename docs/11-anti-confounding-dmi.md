# Módulo Anti-Confounding — DMI (Dimensão de Maturidade Institucional)

> Regra do **Falso Afluente**: nenhuma análise de correlação/regressão/clustering no
> pilar de saneamento pode rodar sem controlar a **Capacidade Institucional** do
> município. Ignorar essa variável produz correlações espúrias (ex.: "investir em
> ETE aumenta doenças hídricas", quando na verdade capitais notificam melhor).

## 1. Dimensão DMI

Tabela `public.dim_maturidade_municipal`:

| Coluna | Origem |
|---|---|
| `municipio_ibge` (PK) | IBGE |
| `idh_m` | Atlas PNUD |
| `pop_estimada` | IBGE |
| `receita_corrente_pc` | Finbra/STN |
| `servidores_reg_local` | Cadastro ANA |
| `snis_completude_pct` | SNIS |
| `score_dmi` | derivado |
| `estrato_dmi` | quintil A–E (chave de estratificação) |

Fórmula default (editável em `system_settings.dmi_pesos`):

```
score = 0.30 * norm(idh_m)
      + 0.30 * norm(receita_corrente_pc)
      + 0.20 * norm(servidores_reg_local)
      + 0.20 * norm(snis_completude_pct)
```

Estratos: A (top 20%), B, C, D, E (bottom 20% / sem dados).

## 2. Guard-rail (Edge Function `analytics-guardrail`)

Toda chamada analítica no pilar saneamento **deve** passar por este endpoint antes
de rodar o modelo ou renderizar métrica pública:

```ts
POST /functions/v1/analytics-guardrail
{
  "metric": "invest_ete_vs_doencas_hidricas",
  "controls": ["estrato_dmi", "snis_completude_pct"],  // obrigatório
  "stratify_by": "estrato_dmi",                        // obrigatório
  "group_sizes": { "A": 42, "B": 51, "C": 33, "D": 12 } // opcional
}
```

Códigos de rejeição (HTTP 422):

| `reason_code` | Significado |
|---|---|
| `MISSING_CONFOUNDER_CONTROL` | Faltam `estrato_dmi` e/ou `snis_completude_pct` |
| `MISSING_STRATIFICATION` | `stratify_by` diferente de `estrato_dmi` |
| `GROUP_TOO_SMALL` | Algum estrato com `n < min_group_size` (default 30) |

Toda decisão é auditada em `analytics_guardrail_log`.

## 3. Integração com IA (Cortex-San e `curadoria-ai-precheck`)

O system prompt agora inclui a Regra do Falso Afluente e o RAG-lite injeta o
`estrato_dmi` do município da ETE. Se o município não estiver classificado, o
modelo é instruído a declarar a inferência como **inconclusiva**.

## 4. Integridade regulatória (RPC Senate paper)

`formulario_respostas.payload_sha256` armazena o hash SHA-256 do payload gravado
por trigger. Divergência entre hash calculado e persistido = adulteração →
transição de estado deve ser bloqueada (Fase 5).

## 5. Parâmetros editáveis

Tabela `system_settings`, chave `dmi_pesos`:

```json
{ "idh": 0.3, "receita_pc": 0.3, "servidores": 0.2, "completude": 0.2, "min_group_size": 30 }
```

Editar via UI de Administração (Fase 4) — reflete imediatamente no guard-rail.

## 6. Roadmap

- [x] Fase 1 — Fundação de dados (esta migração)
- [x] Fase 2 — Guard-rail server-side (`analytics-guardrail`)
- [x] Fase 3 — MVs estratificadas por DMI (`mv_cobertura_municipal`, `mv_dbo_regional`, `mv_saude_vs_saneamento_por_estrato`)
- [x] Fase 4 — UI: `<ConfoundingBadge/>`, filtro global de estrato em Compliance, editor de pesos em Administração › DMI
- [ ] Fase 5 — Hardening: MFA obrigatório para staff, verificação de hash em transições, role `analytics_reader`
- [ ] Fase 6 — Governança: painel de bloqueios + procedimento de publicação normativa
