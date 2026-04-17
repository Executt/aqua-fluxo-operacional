# 01 — Padronização Visual

Sistema de design **CRM Desktop Light** — corporativo, denso, indigo/violeta, inspirado em padrões de CRM enterprise.

## 1. Paleta de cores (HSL — semantic tokens)

> **Regra absoluta**: nunca use cores hardcoded em componentes. Sempre use tokens via `bg-primary`, `text-foreground`, etc.

### 1.1 Superfície
| Token | HSL | HEX | Uso |
|---|---|---|---|
| `--background` | `220 24% 97%` | `#F4F6FA` | Canvas da aplicação |
| `--card` | `0 0% 100%` | `#FFFFFF` | Painéis, cards |
| `--popover` | `0 0% 100%` | `#FFFFFF` | Dropdowns, menus |
| `--secondary` | `220 24% 94%` | `#ECEFF5` | Hover, inputs neutros |
| `--muted` | `220 20% 95%` | `#EEF1F6` | Áreas desabilitadas |
| `--border` | `220 18% 90%` | `#DCE0E8` | Bordas |
| `--shell` | `0 0% 100%` | `#FFFFFF` | Topbar |
| `--subnav` | `220 24% 98%` | `#F7F9FC` | Sub-navegação |

### 1.2 Texto
| Token | HSL | HEX |
|---|---|---|
| `--foreground` | `222 32% 14%` | `#182234` |
| `--muted-foreground` | `220 12% 46%` | `#6B7385` |
| `--shell-foreground` | `222 24% 22%` | `#2D3548` |

### 1.3 Marca e estados
| Token | HSL | HEX | Significado |
|---|---|---|---|
| `--primary` | `232 72% 56%` | `#3D4ED8` | Indigo corporativo |
| `--primary-soft` | `232 88% 96%` | `#EBEEFF` | Tint de fundo |
| `--success` | `152 60% 38%` | `#1F9D6E` | Conformidade OK |
| `--warning` | `38 92% 50%` | `#F59E0B` | Atenção / alerta |
| `--destructive` | `0 72% 51%` | `#DC2626` | Crítico / infração |
| `--informative` | `210 90% 50%` | `#1E88E5` | Informativo |

### 1.4 Paleta de gráficos (`src/lib/chart-colors.ts`)
Sempre importar daqui — **nunca** hardcode HSL em Recharts:
```ts
import { CHART_COLORS, CHART_GRID, CHART_TICK } from "@/lib/chart-colors";
```
| Slot | Cor |
|---|---|
| `primary` | Indigo `#3D4ED8` |
| `informative` | Blue `#1E88E5` |
| `success` | Green `#1F9D6E` |
| `warning` | Amber `#F59E0B` |
| `destructive` | Red `#DC2626` |
| `violet` (alias `purple`) | Violet `#8B5CF6` |

## 2. Tipografia — **Inter** + **JetBrains Mono**

| Escala | Tailwind | px / line / weight | Uso |
|---|---|---|---|
| Display | `text-display` | 48 / 1.1 / 600 | Hero (raro) |
| H1 | `text-heading-1` | 24 / 1.3 / 600 | Título de página |
| H2 | `text-heading-2` | 18 / 1.4 / 600 | Cards, seções |
| Body L | `text-body-lg` | 14 / 1.6 / 400 | Texto padrão |
| Body S | `text-body-sm` | 12 / 1.5 / 400 | Tabelas, inputs |
| Caption | `text-caption` | 10 / 1.4 / 500 | Labels, badges |

**JetBrains Mono** (`font-mono`): timestamps, IDs, valores numéricos sensoreados.

## 3. Espaçamento — escala 4px

| Token | px | Uso |
|---|---|---|
| `0.5` / `1` / `1.5` | 2 / 4 / 6 | Inline gaps |
| `2` / `3` / `4` | 8 / 12 / 16 | Padding interno |
| `5` / `6` / `8` | 20 / 24 / 32 | Padding de seção |
| `10` / `12` / `16` | 40 / 48 / 64 | Macro-layout |

Regra geral: **`p-6` em páginas**, **`gap-6` em grids de cards**, **`gap-2` dentro de toolbars**.

## 4. Raio de borda

`--radius: 0.625rem` (10 px) — `rounded-md` para pílulas, `rounded-[var(--radius)]` em cards.

## 5. Elevação

| Classe | Sombra |
|---|---|
| `elevation-0` | nenhuma |
| `elevation-1` | `0 1px 2px rgba(16,24,40,0.05)` — cards padrão |
| `elevation-2` | `0 1px 3px + 0 1px 2px` — hover, popovers |
| `elevation-3` | `0 4px 8px + 0 2px 4px` — modals |

## 6. Ícones — **Lucide React**

Tamanhos canônicos:

| Contexto | Tamanho |
|---|---|
| Botão pequeno | `h-3.5 w-3.5` |
| Inline / topbar / sub-nav | `h-4 w-4` |
| Avatares de seção (Admin) | `h-5 w-5` |
| KPI / Hero | `h-6 w-6` |

Mapa semântico (sempre reutilizar):

| Domínio | Ícone |
|---|---|
| Visão global | `Globe` |
| IoT / sensores | `Radio` |
| Compliance | `ShieldCheck` |
| Entidades / órgãos | `Building2` |
| IA | `BrainCircuit` |
| Configuração | `Settings` |
| Usuários | `Users` |
| LDAP / servidor | `Server` |
| E-mail / SMTP | `Mail` |
| SEI / processo | `FileSignature` |
| Auth / SSO | `KeyRound` |
| Auditoria / histórico | `History` |
| Sucesso | `Check` / `CheckCircle2` |
| Erro | `AlertTriangle` / `XCircle` |
| Refresh | `RefreshCw` |

## 7. Componentes-padrão

- **Card**: `surface-card` utility — `bg-card border border-border rounded-[var(--radius)] elevation-1`
- **Pílulas de status**: `pill-success`, `pill-warning`, `pill-destructive`, `pill-informative`, `pill-muted`
- **Tabelas**: shadcn `<Table>` com `text-[12px]`, header em `text-muted-foreground`, linhas hover `bg-secondary/40`
- **Inputs**: `h-9 text-[12px]`, `bg-secondary` em modo busca, `bg-card` em formulários
- **Botões primários**: `h-9 px-4` em forms, `h-8 px-3` em toolbars

## 8. Layout — **Topbar** (sem sidebar)

```
┌─────────────────────────────────────────────────────────────┐
│ [SF] SIGSAN-FED · Visão IoT Compliance Entidades …  🔍 🔔 👤 │  ← h-14
├─────────────────────────────────────────────────────────────┤
│ Sub-nav contextual (h-10) · Resumo · Mapa · Alertas         │
├─────────────────────────────────────────────────────────────┤
│ Conteúdo (max-w-1600 mx-auto, p-6, space-y-6)               │
└─────────────────────────────────────────────────────────────┘
```

## 9. Animação

`framer-motion` apenas para entrada de página: `fadeUp` com `stagger 0.08s`. Sem micro-interações dispersas.
