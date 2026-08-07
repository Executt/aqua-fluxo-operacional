# 14 — Rotas do Frontend, RBAC e Query Params

| Rota | Componente | Proteção | Query params |
|---|---|---|---|
| `/auth` | `Auth` | pública | — |
| `/` | `Index` | pública | `?tab=resumo\|mapa\|alertas` |
| `/iot` | `IoTMonitor` | pública | `?tab=sensores\|leituras\|saude` |
| `/compliance` | `Compliance` | pública | `?tab=scores\|ranking\|evolucao\|infracoes\|auditorias\|automacao`, `?estrato=A..E` |
| `/curadoria` | `Curadoria` | autenticado | `?tab=submissoes\|validacoes\|bulk` |
| `/curadoria/auditoria` | `CuradoriaAuditoria` | autenticado (staff) | `?ete=`, `?estado=`, `?de=`, `?ate=` |
| `/entidades` | `Entidades` | pública (escrita autenticada) | `?tab=lista\|novo\|etes\|chaves\|integracao` |
| `/cortex` | `CortexSan` | pública | — |
| `/admin` | `Administracao` | `role=admin` | `?tab=usuarios\|llm\|mcp\|conhecimento\|repositorios\|bases\|sasb\|dmi\|regras\|metabase\|auditoria` |
| `*` | `NotFound` | — | — |

## RBAC

| Papel | Pode |
|---|---|
| `operador` | submeter/editar rascunhos das ETEs do seu operador; importar lotes |
| `auditor` | ler tudo; transicionar `submetido → em_analise → validado/rejeitado` |
| `gestor` | auditor + gestão de compliance, entidades, planos de ação |
| `admin` | tudo, incluindo `/admin`, repositórios, bases, LLM/MCP e parâmetros |

Proteção: `<ProtectedRoute requireRoles={[...]}>` (`src/components/ProtectedRoute.tsx`); estado em `AuthContext`.

## Convenção de sub-navegação

A URL é a fonte da verdade: cada aba grava `?tab=` via `useSearchParams`, permitindo deep-link e partilha de recortes filtrados.
