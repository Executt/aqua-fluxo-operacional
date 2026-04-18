# 08 — Regras de Negócio

> Regras normativas e operacionais do SIGSAN-FED. Identificadores `RN-XXX`.

## 1. Normativas regulatórias

### RN-001 — Limites legais (CONAMA 357/2005 + 430/2011)
Sensores devem comparar leituras contra os limites estabelecidos:

| Parâmetro | Faixa permitida | Unidade |
|---|---|---|
| pH | 6,0 – 9,0 | — |
| OD (Oxigênio Dissolvido) | ≥ 5,0 | mg/L |
| DBO₅ | ≤ 5 (Classe 2) | mg O₂/L |
| Turbidez | ≤ 100 | NTU |
| Coliformes termotolerantes | ≤ 1 000 | NMP/100 mL |
| Nitrogênio amoniacal total | ≤ 3,7 (pH ≤ 7,5) | mg N/L |

Status do sensor é derivado:
- `normal`: dentro da faixa
- `alerta`: ±10 % do limite
- `crítico`: fora da faixa

### RN-002 — Lei 14.026/2020 (Marco do Saneamento)
Toda entidade prestadora deve ter:
- CNPJ ativo
- Plano municipal/regional aprovado
- Comprovação de capacidade econômico-financeira (auditoria anual)

### RN-003 — Resolução ANA 79/2022 (Indicadores SARSB)
Score de compliance é calculado mensalmente:

```
score = round(100 × metas_cumpridas / metas_total)
status = score >= 80 ? 'conforme'
       : score >= 60 ? 'parcial'
       :               'nao_conforme'
```

`metas_total = 48` (12 meses × 4 dimensões: cobertura, qualidade, atendimento, financeira).

### RN-004 — Tendência (`tendencia`)
Comparar com mês anterior:
- `up` se Δ ≥ +3
- `down` se Δ ≤ −3
- `stable` caso contrário

## 2. Infrações

### RN-101 — Códigos
Formato: `INF-{UF}-{AAAA}-{NNNN}` (ex: `INF-SP-2026-0042`).

### RN-102 — Gravidade vs prazo
| Gravidade | Prazo de regularização |
|---|---|
| Leve | 90 dias |
| Média | 60 dias |
| Alta | 30 dias |

### RN-103 — Status
`aberta → em_analise → resolvida` (ou `prescrita` se prazo > 5 anos).
**Nunca deletar** — manter histórico imutável.

### RN-104 — Notificação
Toda infração registrada gera:
1. E-mail via SMTP para responsável técnico (RT) da entidade
2. Processo SEI (se integração ativa)
3. Entrada em `audit_log`

## 3. IoT

### RN-201 — Bateria
- `bateria < 20 %` → alerta visual no painel
- `bateria < 10 %` → e-mail diário ao operador
- `bateria == 0 %` → status do sensor vira `offline`

### RN-202 — Sinal
- `forte`, `medio`, `fraco`. Sensor com `fraco` por > 24 h → ticket automático.

### RN-203 — Frequência mínima
Cada sensor deve enviar leitura ≥ 1×/15 min. Sem leitura há > 30 min → status `offline`.

### RN-204 — Imutabilidade
`sensor_leituras` é append-only. Sem UPDATE/DELETE no banco.

## 4. Entidades & ETEs

### RN-301 — CNPJ único
Não permitir 2 entidades com o mesmo CNPJ (constraint UNIQUE planejado).

### RN-302 — ETE órfã
ETE sem `entidade_id` é permitida temporariamente (federalização em andamento), mas listada em "Pendentes de vinculação".

### RN-303 — Geolocalização obrigatória
ETE só aparece no Mapa Brasil se tiver `latitude` E `longitude`.

## 5. Administração

### RN-401 — LDAP precedência
Se LDAP estiver ativo, autenticação tenta:
1. LDAP/AD primeiro
2. Fallback para usuário local (apenas se não existir no LDAP)

### RN-402 — SMTP teste
Antes de salvar configuração SMTP, exigir teste bem-sucedido.

### RN-403 — Sessão
Default: 60 min de inatividade. Configurável em Parâmetros gerais.

### RN-404 — Retenção
- `audit_log`: 365 dias (configurável)
- `sensor_leituras`: 5 anos (compliance regulatório)
- `infracoes`: indefinido (memória institucional)

### RN-405 — Roles
4 perfis hierárquicos:
1. **Administrador** — tudo, inclusive configurações
2. **Auditor** — CRUD em infrações + leitura total
3. **Operador** — CRUD em entidades/ETEs/sensores, leitura em infrações
4. **Visualizador** — apenas SELECT

## 6. IA (Cortex-San)

### RN-501 — Escopo
Modelo só pode responder sobre: legislação ambiental, normas técnicas (ABNT, CONAMA, ANA), dados do próprio banco. Recusar perguntas fora de escopo.

### RN-502 — Sem PII
Nunca enviar dados pessoais (e-mail, CPF) ao modelo. Apenas IDs anonimizados.

### RN-503 — Auditoria
Toda chamada à IA registra: usuário, timestamp, prompt-hash, modelo, tokens.

## 7. Curadoria Nacional (módulo v3.0)

### RN-601 — Categorização DBO (Atlas Esgotos)
- **Baixa** < 60% · **Normal** 60–80% · **Alta** > 80%. Trigger `classify_faixa_dbo()` deriva no banco.

### RN-602 — Status operacional ETE
Enum: `ativa`, `em_construcao_ampliacao`, `inativa_desativada`, `planejada`. Apenas `ativa` entra nas agregações regionais.

### RN-603 — State machine
```
RASCUNHO → SUBMETIDO → EM_ANALISE → VALIDADO ✓ (final)
                                  ↘ REJEITADO → RASCUNHO
```
Validado/rejeitado têm `payload` **imutável**. Carimbos `submitted_at` / `reviewed_at` automáticos.

### RN-604 — Limites físicos (DTO Zod)
- `eficiencia_dbo_pct ∈ [0, 100]`
- `vazao_atual_lps ≤ 1.2 × vazao_projeto_lps`
- `pH ∈ [0,14]`, `OD ∈ [0,20]`, `populacao_atendida ≤ 50M`
- Bulk: máx 1000 respostas/chamada

### RN-605 — RBAC do módulo
- **Operador** vê e submete só ETEs nos seus municípios
- **Auditor/Gestor/Admin** veem tudo e fazem todas as transições
- Sem `operador_id` no perfil → 403 limpo na Edge Function

### RN-606 — Imutabilidade analítica
MVs (`dim_*`, `fato_*`, `mv_*`) **não** acessíveis por `anon`/`authenticated` — apenas `metabase_reader`.

### RN-607 — Periodicidade
UNIQUE `(ete_id, ano_referencia, mes_referencia)`. Re-envio = upsert (só em estados editáveis).
