# 13 — Diagrama ER

```mermaid
erDiagram
  PROFILES ||--o{ USER_ROLES : "papéis"
  OPERADORES ||--o{ PROFILES : "vincula"
  OPERADORES ||--o{ OPERADOR_MUNICIPIOS : "atende"
  OPERADORES ||--o{ ETES_CURADORIA : "opera"
  TIPOLOGIAS_TRATAMENTO ||--o{ ETES_CURADORIA : "classifica"
  ETES_CURADORIA ||--o{ FORMULARIO_RESPOSTAS : "recebe"
  FORMULARIO_RESPOSTAS ||--o{ FORMULARIO_RESPOSTAS_AUDIT : "audita"
  FORMULARIO_RESPOSTAS ||--o{ CURADORIA_LOTE_AUDITORIA : "lote"
  DIM_MATURIDADE_MUNICIPAL ||--o{ ETES_CURADORIA : "estrato DMI"

  ENTIDADES ||--o{ ETES : "possui"
  ENTIDADES ||--o{ INFRACOES : "responde"
  ENTIDADES ||--o{ COMPLIANCE_SCORES : "pontua"
  ENTIDADES ||--o{ ENTIDADE_API_KEYS : "integra"
  ENTIDADES ||--o{ ENTIDADE_INTEGRACAO_CONFIG : "configura"
  INFRACOES ||--o{ PLANOS_ACAO : "trata"
  PLANOS_ACAO ||--o{ PLANOS_ACAO_ITENS : "detalha"
  COMPLIANCE_REGRAS ||--o{ INFRACOES : "gera"
  COMPLIANCE_REGRAS ||--o{ COMPLIANCE_ESCALONAMENTOS : "escala"
  COMPLIANCE_NOTIFICACOES }o--|| ENTIDADES : "notifica"

  ETES ||--o{ SENSORES : "instala"
  SENSORES ||--o{ SENSOR_LEITURAS : "emite"

  DATA_REPOSITORIES ||--o{ REPOSITORY_SYNC_JOBS : "sincroniza"
  DATA_REPOSITORIES ||--o{ INFRA_AUDIT_LOG : "audita"
  DATABASE_CONNECTIONS ||--o{ CONNECTION_TEST_JOBS : "testa"
  DATABASE_CONNECTIONS ||--o{ INFRA_AUDIT_LOG : "audita"
  SASB_DATASETS ||--o{ SASB_SYNC_LOGS : "registra"
```

## Star schema analítico

```mermaid
erDiagram
  FATO_ETES_CURADORIA }o--|| DIM_MUNICIPIO : "municipio_ibge"
  FATO_ETES_CURADORIA }o--|| DIM_TIPOLOGIA : "tipologia_id"
  FATO_ETES_CURADORIA }o--|| DIM_OPERADOR : "operador_id"
  FATO_ETES_CURADORIA }o--|| DIM_MATURIDADE_MUNICIPAL : "estrato_dmi"
```

Todas as MVs (`mv_cobertura_municipal`, `mv_etes_por_tipologia`, `mv_dbo_regional`, `mv_saude_vs_saneamento_por_estrato`) derivam do fato e são refrescadas por `refresh_metabase_views()`.
