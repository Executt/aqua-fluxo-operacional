# 06 — Análise de Pontos de Função (APF)

> Método **IFPUG / NESMA** simplificado. Ano-base 2026.

## 1. Funções de dados (ILF / EIF)

| Tipo | Nome | RLR | DET | Complexidade | PF |
|---|---|---:|---:|---|---:|
| ILF | entidades | 1 | 7 | Baixa | **7** |
| ILF | etes | 1 | 11 | Média | **10** |
| ILF | sensores | 1 | 12 | Média | **10** |
| ILF | sensor_leituras | 1 | 5 | Baixa | **7** |
| ILF | compliance_scores | 1 | 11 | Média | **10** |
| ILF | infracoes | 1 | 11 | Média | **10** |
| ILF (planej.) | user_roles | 1 | 4 | Baixa | **7** |
| ILF (planej.) | system_settings | 1 | 4 | Baixa | **7** |
| ILF (planej.) | audit_log | 1 | 6 | Baixa | **7** |
| EIF | auth.users (Supabase) | 1 | 5 | Baixa | **5** |
| EIF | LDAP/AD | 1 | 6 | Baixa | **5** |
| EIF | Lovable AI Gateway | 1 | 3 | Baixa | **5** |
| **Subtotal dados** | | | | | **90** |

## 2. Funções transacionais (EI / EO / EQ)

| Tipo | Função | FTR | DET | Complex. | PF |
|---|---|---:|---:|---|---:|
| EI | Cadastrar entidade | 1 | 5 | Baixa | **3** |
| EI | Editar entidade | 1 | 5 | Baixa | **3** |
| EI | Cadastrar ETE | 2 | 8 | Média | **4** |
| EI | Cadastrar sensor | 2 | 10 | Média | **4** |
| EI | Ingestão leitura IoT | 2 | 4 | Baixa | **3** |
| EI | Registrar infração | 2 | 9 | Média | **4** |
| EI | Recalcular score | 2 | 6 | Média | **4** |
| EI | Configurar LDAP | 1 | 8 | Média | **4** |
| EI | Configurar SMTP | 1 | 9 | Média | **4** |
| EI | Configurar SEI | 1 | 8 | Média | **4** |
| EI | Configurar SSO | 1 | 6 | Baixa | **3** |
| EI | Cadastrar usuário | 1 | 6 | Baixa | **3** |
| EI | Chat Cortex-San | 1 | 3 | Baixa | **3** |
| EO | Dashboard Visão Global (KPIs+chart) | 4 | 12 | Alta | **7** |
| EO | Mapa Brasil (ETEs georreferenciadas) | 2 | 6 | Média | **5** |
| EO | Tabela Alertas críticos | 2 | 7 | Média | **5** |
| EO | Painel IoT (cards+gráficos) | 3 | 10 | Alta | **7** |
| EO | Painel Compliance (radar+barras) | 3 | 10 | Alta | **7** |
| EO | Trilha de auditoria | 1 | 5 | Baixa | **4** |
| EO | Exportar CSV auditoria | 1 | 5 | Baixa | **4** |
| EQ | Listar entidades (filtro) | 1 | 6 | Baixa | **3** |
| EQ | Listar infrações (filtro) | 1 | 7 | Baixa | **3** |
| EQ | Listar sensores (filtro) | 2 | 8 | Média | **4** |
| EQ | Buscar global (topbar) | 3 | 5 | Média | **4** |
| EQ | Detalhe ETE | 2 | 10 | Média | **4** |
| EQ | Histórico leituras sensor | 1 | 5 | Baixa | **3** |
| **Subtotal transacional** | | | | | **107** |

## 3. Total

| Categoria | PF |
|---|---:|
| Funções de dados | 90 |
| Funções transacionais | 107 |
| **TOTAL BRUTO (PFNA)** | **197** |

### Fator de ajuste (VAF)
14 GSC avaliados em média 3.5 → VAF ≈ 1.05 (+5 %).

**Total Ajustado: ≈ 207 PF**

## 4. Estimativa de esforço (referência)

Considerando produtividade do time SIGSAN-FED de **8 h/PF**:

- **Esforço estimado**: 207 × 8 = **1 656 horas-homem**
- **Equipe sugerida**: 4 devs × 13 semanas (≈ 1 sprint trimestral)

## 5. Backlog de PF futuros (não computado)

- Mobile companion app (≈ 80 PF)
- Workflow BPMN de fiscalização (≈ 120 PF)
- Open Data API pública (≈ 40 PF)
