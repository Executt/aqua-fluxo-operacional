# SIGSAN-FED — Sistema Integrado de Gestão Federada de Saneamento

> Plataforma de monitoramento, fiscalização e compliance do saneamento básico brasileiro, operada pela **Agência Nacional de Águas e Saneamento Básico (ANA)**.

[![Deploy](https://img.shields.io/badge/deploy-Lovable%20Cloud-3D4ED8)](https://aqua-fluxo-operacional.lovable.app)
[![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Vite%20%2B%20Supabase-1E88E5)]()
[![License](https://img.shields.io/badge/license-Gov.br%20Internal-1F9D6E)]()

---

## ✨ Visão geral

O SIGSAN-FED federa dados operacionais de **prestadores de saneamento**, **ETEs** e **sensores IoT** em tempo real:

- 🌎 **Visão Global** — KPIs nacionais, mapa, alertas
- 📡 **Monitorização IoT** — Telemetria (pH, OD, turbidez, vazão)
- 🛡️ **Compliance / SARSB** — Scores, infrações CONAMA 357/2005
- 💧 **Curadoria Nacional** — Submissão e validação de dados das ETEs (Atlas Esgotos / ANA) com state machine + RBAC
- 🏢 **Entidades** — Cadastro de prestadores, ETEs, responsáveis
- 🧠 **Cortex-San** — Assistente IA normativo
- ⚙️ **Administração** — LDAP, SMTP, SEI, SSO, parâmetros, auditoria

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
| [`docs/06-pontos-de-funcao.md`](./docs/06-pontos-de-funcao.md) | Análise de Pontos de Função (≈ 353 PF) |
| [`docs/07-inventario-funcoes.md`](./docs/07-inventario-funcoes.md) | Inventário de funções |
| [`docs/08-regras-de-negocio.md`](./docs/08-regras-de-negocio.md) | Regras CONAMA, SLAs, scores, curadoria |
| [`docs/09-seguranca.md`](./docs/09-seguranca.md) | Segurança end-to-end |
| [`docs/10-modulo-curadoria.md`](./docs/10-modulo-curadoria.md) | **Curadoria Nacional + Star Schema Metabase** |

## 🗺️ Rotas principais

| Rota | Página | Proteção |
|---|---|---|
| `/auth` | Login / Signup | pública |
| `/` | Visão Global | pública |
| `/iot` | Monitorização IoT | pública |
| `/compliance` | SARSB / Compliance | pública |
| `/curadoria` | **Curadoria Nacional** | autenticado |
| `/entidades` | Gestão de Entidades | pública |
| `/cortex` | Cortex-San (IA) | pública |
| `/admin?tab=…` | Administração | role=admin |

## 📝 Licença

Sistema interno do **Governo Federal — Agência Nacional de Águas e Saneamento Básico (ANA)**.

## 👥 Contato

`contato.sigsan@ana.gov.br` · v2.4.1

