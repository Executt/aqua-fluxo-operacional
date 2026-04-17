# 07 — Inventário de Funções

> Catálogo navegável de todas as funcionalidades implementadas no SIGSAN-FED.
> Status: ✅ implementado · 🟡 UI pronta (mock) · 🔵 planejado

## 1. Visão Global (`/`)

| ID | Função | Status |
|---|---|---|
| F-001 | KPIs nacionais (entidades, ETEs ativas, sensores online, compliance médio) | ✅ |
| F-002 | Mapa do Brasil com ETEs georreferenciadas (Leaflet + CARTO) | ✅ |
| F-003 | Gráfico de tendência de compliance (12 meses) | ✅ |
| F-004 | Tabela de alertas críticos consolidados | ✅ |
| F-005 | Exportar relatório PDF | 🔵 |

## 2. Monitorização IoT (`/iot`)

| ID | Função | Status |
|---|---|---|
| F-101 | Cards de status agregado (online/alerta/crítico/offline) | ✅ |
| F-102 | Gráfico de séries temporais por sensor | ✅ |
| F-103 | Tabela de sensores com bateria, sinal, última leitura | ✅ |
| F-104 | Filtro por entidade / ETE / tipo | 🟡 |
| F-105 | Detalhe de sensor com histórico paginado | 🟡 |
| F-106 | Realtime subscription a `sensor_leituras` | 🔵 |
| F-107 | Exportar CSV de leituras | 🔵 |

## 3. Compliance / SARSB (`/compliance`)

| ID | Função | Status |
|---|---|---|
| F-201 | Score por entidade com semáforo conforme/parcial/não conforme | ✅ |
| F-202 | Radar de domínios de conformidade | ✅ |
| F-203 | Barras de metas cumpridas vs total | ✅ |
| F-204 | Tabela de infrações ativas (gravidade, prazo) | ✅ |
| F-205 | Linha do tempo de auditorias | 🟡 |
| F-206 | Recalculo de score mensal (Edge Function) | 🔵 |

## 4. Entidades (`/entidades`)

| ID | Função | Status |
|---|---|---|
| F-301 | Lista paginada de prestadores | ✅ |
| F-302 | Cadastro novo prestador (CNPJ, área, status) | ✅ |
| F-303 | Edição inline de status | 🟡 |
| F-304 | Sub-aba ETEs do prestador | 🟡 |
| F-305 | Importação em lote CSV | 🔵 |

## 5. Cortex-San / IA (`/cortex`)

| ID | Função | Status |
|---|---|---|
| F-401 | Chat com modelo Gemini 2.5 via Edge Function | ✅ |
| F-402 | Histórico de conversa em sessão | ✅ |
| F-403 | Persistência de threads no banco | 🔵 |
| F-404 | RAG sobre normativas (CONAMA, ANA) | 🔵 |

## 6. Administração (`/admin?tab=…`)

| ID | Função | Status |
|---|---|---|
| F-501 | Lista de usuários (locais + LDAP) | 🟡 |
| F-502 | Formulário de novo usuário local | 🟡 |
| F-503 | Configuração LDAP/AD (host, baseDN, bind, TLS, mapping) | 🟡 |
| F-504 | Configuração SMTP + envio de teste | 🟡 |
| F-505 | Integração SEI (endpoint, token, unidade, tipos) | 🟡 |
| F-506 | SSO Keycloak OIDC (issuer, client, secret) | 🟡 |
| F-507 | Parâmetros gerais (órgão, fuso, retenção, sessão) | 🟡 |
| F-508 | Trilha de auditoria com export CSV | 🟡 |
| F-509 | Persistência em `system_settings` + secrets | 🔵 |
| F-510 | Auth real (Keycloak + LDAP bridge) | 🔵 |

## 7. Plataforma / Infra

| ID | Função | Status |
|---|---|---|
| F-901 | Topbar global com sub-navegação contextual | ✅ |
| F-902 | Busca global (topbar) | 🟡 |
| F-903 | Notificações dropdown | 🟡 |
| F-904 | Toggle dark mode | 🔵 |
| F-905 | Multilíngue (PT-BR / EN) | 🔵 |
| F-906 | Telemetria de uso (analytics) | 🔵 |

## Resumo

| Status | Qtd |
|---|---:|
| ✅ Implementado | 18 |
| 🟡 UI / mock | 16 |
| 🔵 Planejado | 16 |
| **Total catalogado** | **50** |
