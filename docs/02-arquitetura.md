# 02 — Arquitetura da Aplicação

## 1. Stack tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Linguagem | TypeScript | 5.x |
| Framework | React | 18.x |
| Bundler | Vite | 5.x |
| Roteamento | react-router-dom | 6.x |
| Estilo | Tailwind CSS + shadcn/ui (Radix) | 3.x |
| Animação | framer-motion | 11.x |
| Server state | @tanstack/react-query | 5.x |
| Forms | react-hook-form + zod | — |
| Charts | recharts | 2.x |
| Mapas | leaflet + react-leaflet (tiles CARTO) | — |
| Ícones | lucide-react | latest |
| Backend | Lovable Cloud (Supabase Postgres 15 + Edge Functions Deno) | — |
| IA | Lovable AI Gateway (Gemini 2.5, GPT-5) | — |
| Auth (planejada) | Keycloak OIDC + LDAP/AD bridge | — |
| Testes | vitest + @testing-library/react | — |

## 2. Estrutura de diretórios

```
sigsan-fed/
├── docs/                                   ← documentação .md
├── public/
├── src/
│   ├── App.tsx                             ← rotas
│   ├── main.tsx                            ← entry
│   ├── index.css                           ← design tokens (HSL)
│   ├── components/
│   │   ├── DashboardLayout.tsx             ← shell (TopNav + main)
│   │   ├── TopNav.tsx                      ← navegação primária + sub-nav
│   │   ├── NavLink.tsx
│   │   ├── dashboard/                      ← KPI, mapa, tabela alertas, charts
│   │   └── ui/                             ← shadcn components
│   ├── pages/
│   │   ├── Index.tsx                       ← Visão Global  (/)
│   │   ├── IoTMonitor.tsx                  ← IoT          (/iot)
│   │   ├── Compliance.tsx                  ← SARSB        (/compliance)
│   │   ├── Entidades.tsx                   ← Entidades    (/entidades)
│   │   ├── CortexSan.tsx                   ← IA Chat      (/cortex)
│   │   ├── Administracao.tsx               ← Admin (tabs) (/admin?tab=…)
│   │   └── NotFound.tsx
│   ├── hooks/
│   │   ├── use-sigsan-data.ts              ← React Query hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── chart-colors.ts                 ← paleta centralizada
│   │   └── utils.ts
│   └── integrations/supabase/              ← AUTO-GERADO — não editar
│       ├── client.ts
│       └── types.ts
├── supabase/
│   ├── config.toml                         ← project_id + functions config
│   ├── migrations/                         ← histórico SQL
│   └── functions/
│       └── cortex-chat/                    ← Edge Function IA
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

## 3. Mapa de rotas (frontend)

| Rota | Componente | Proteção | Sub-nav (`?tab=`) |
|---|---|---|---|
| `/auth` | `Auth` | pública | login / signup |
| `/` | `Index` | pública | resumo, mapa, alertas |
| `/iot` | `IoTMonitor` | pública | sensores, leituras, saude |
| `/compliance` | `Compliance` | pública | scores, infracoes, auditorias |
| `/curadoria` | `Curadoria` | **autenticado** | submissoes, validacoes, bulk |
| `/entidades` | `Entidades` | pública | lista, novo, etes |
| `/cortex` | `CortexSan` | pública | (sem sub-nav) |
| `/admin` | `Administracao` | **role=admin** | usuarios, smtp, sei, sso, parametros, auditoria |
| `*` | `NotFound` | — | — |

Proteção via `<ProtectedRoute requireRoles={...}>` (`src/components/ProtectedRoute.tsx`). Auth state em `AuthContext` (`src/contexts/AuthContext.tsx`).

## 4. Camadas

```
┌────────────────────────────────────────────────┐
│  React (UI)                                    │
│  Pages → Components → shadcn/ui                │
│  ↓ React Query hooks                           │
├────────────────────────────────────────────────┤
│  Supabase JS Client (PostgREST)                │
│  + Edge Functions (Deno) p/ IA & integrações   │
├────────────────────────────────────────────────┤
│  Postgres 15 + RLS                             │
│  Realtime publication: sensor_leituras         │
└────────────────────────────────────────────────┘
```

## 5. Decisões arquiteturais

- **Cliente único Supabase**: importar de `@/integrations/supabase/client` (auto-gerado).
- **Tipos do banco**: `Database` em `@/integrations/supabase/types` (auto-gerado).
- **Paleta de gráficos centralizada**: `src/lib/chart-colors.ts` — nunca hardcoded.
- **Tokens de design**: 100 % via CSS vars HSL em `index.css` + Tailwind.
- **Sub-navegação**: estado via `?tab=` (URL é fonte da verdade) — permite deep-link.
- **IA via Edge Function `cortex-chat`** com Lovable AI Gateway (sem chave do usuário).

## 6. Build & deploy

| Ação | Comando |
|---|---|
| Dev local | `npm run dev` |
| Build | `npm run build` |
| Preview | `npm run preview` |
| Deploy | Automático via Lovable (publish) |

Edge Functions são deployadas automaticamente — não há comando manual.
