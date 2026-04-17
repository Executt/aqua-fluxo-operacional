# SIGSAN-FED — Sistema Integrado de Gestão Federada de Saneamento

> Plataforma de monitoramento, fiscalização e compliance do saneamento básico brasileiro, operada pela **Agência Nacional de Águas e Saneamento Básico (ANA)**.

[![Deploy](https://img.shields.io/badge/deploy-Lovable%20Cloud-3D4ED8)](https://aqua-fluxo-operacional.lovable.app)
[![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Vite%20%2B%20Supabase-1E88E5)]()
[![License](https://img.shields.io/badge/license-Gov.br%20Internal-1F9D6E)]()

---

## ✨ Visão geral

O SIGSAN-FED federa dados operacionais de **prestadores de serviços de saneamento** (companhias estaduais e municipais), **estações de tratamento de efluentes (ETEs)** e **sensores IoT** em tempo real, oferecendo:

- 🌎 **Visão Global** — KPIs nacionais, mapa do Brasil, alertas críticos
- 📡 **Monitorização IoT** — Telemetria de sensores (pH, OD, turbidez, vazão)
- 🛡️ **Compliance / SARSB** — Scores, infrações CONAMA 357/2005, auditorias
- 🏢 **Gestão de Entidades** — Cadastro de prestadores, ETEs e responsáveis técnicos
- 🧠 **Cortex-San** — Assistente IA para análise normativa
- ⚙️ **Administração** — LDAP, SMTP, SEI, SSO, parâmetros e auditoria

## 🚀 Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # produção
npm run test         # vitest
```

Variáveis de ambiente são auto-injetadas pelo Lovable Cloud (`.env`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 5 |
| UI | Tailwind CSS v3, shadcn/ui, Radix, Framer Motion |
| Charts/Mapas | Recharts, Leaflet + react-leaflet, CARTO tiles |
| Estado/Server | TanStack Query v5, React Router v6 |
| Backend | Lovable Cloud (Supabase Postgres + Edge Functions Deno) |
| IA | Lovable AI Gateway (Gemini 2.5 / GPT-5) |
| Auth (planejado) | Keycloak OIDC + LDAP/AD |

## 📚 Documentação

Toda a documentação técnica está em [`/docs`](./docs):

| Documento | Conteúdo |
|---|---|
| [`docs/01-padronizacao-visual.md`](./docs/01-padronizacao-visual.md) | Cores, tipografia, espaçamento, ícones |
| [`docs/02-arquitetura.md`](./docs/02-arquitetura.md) | Stack, diretórios, rotas |
| [`docs/03-database-schema.md`](./docs/03-database-schema.md) | Schema relacional |
| [`docs/04-rotas-api.md`](./docs/04-rotas-api.md) | Edge Functions + REST PostgREST |
| [`docs/05-rls-policies.md`](./docs/05-rls-policies.md) | Row Level Security |
| [`docs/06-pontos-de-funcao.md`](./docs/06-pontos-de-funcao.md) | Análise de Pontos de Função |
| [`docs/07-inventario-funcoes.md`](./docs/07-inventario-funcoes.md) | Inventário de funções |
| [`docs/08-regras-de-negocio.md`](./docs/08-regras-de-negocio.md) | Regras CONAMA, SLAs, scores |
| [`docs/09-seguranca.md`](./docs/09-seguranca.md) | Segurança end-to-end |

## 🗺️ Rotas principais

| Rota | Página |
|---|---|
| `/` | Visão Global |
| `/iot` | Monitorização IoT |
| `/compliance` | SARSB / Compliance |
| `/entidades` | Gestão de Entidades |
| `/cortex` | Cortex-San (IA) |
| `/admin?tab=…` | Administração (Usuários, SMTP, SEI, SSO, Parâmetros, Auditoria) |

## 📝 Licença

Sistema interno do **Governo Federal — Agência Nacional de Águas e Saneamento Básico (ANA)**.

## 👥 Contato

`contato.sigsan@ana.gov.br` · v2.4.1

