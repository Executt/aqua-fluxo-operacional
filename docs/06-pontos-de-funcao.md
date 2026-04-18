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

## 3. Módulo Curadoria Nacional (v3.0)

### Funções de dados adicionais
| Tipo | Nome | DET | Complex. | PF |
|---|---|---:|---|---:|
| ILF | profiles | 5 | Baixa | **7** |
| ILF | user_roles | 4 | Baixa | **7** |
| ILF | operadores | 9 | Média | **10** |
| ILF | operador_municipios | 5 | Baixa | **7** |
| ILF | tipologias_tratamento | 7 | Baixa | **7** |
| ILF | etes_curadoria | 16 | Alta | **15** |
| ILF | formulario_respostas | 11 | Média | **10** |
| EIF | Atlas Esgotos / ANA | 4 | Baixa | **5** |
| EIF | Metabase (consumer) | 6 | Baixa | **5** |
| **Subtotal dados curadoria** | | | | **73** |

### Funções transacionais adicionais
| Tipo | Função | Complex. | PF |
|---|---|---|---:|
| EI | Login email/senha | Baixa | **3** |
| EI | Signup + verificação | Média | **4** |
| EI | Reset de senha | Baixa | **3** |
| EI | Cadastrar operador | Média | **4** |
| EI | Vincular munic. ao operador | Baixa | **3** |
| EI | Cadastrar ETE curadoria | Alta | **6** |
| EI | Submeter resposta (rascunho/submetido) | Alta | **6** |
| EI | Transitar estado (state machine) | Média | **4** |
| EI | Bulk insert (até 1000) | Alta | **6** |
| EI | Validar / Rejeitar (auditor) | Média | **4** |
| EO | Painel curadoria (KPIs por estado) | Média | **5** |
| EO | Refresh Metabase views | Baixa | **4** |
| EQ | Listar respostas com filtros | Média | **4** |
| EQ | Detalhe de ETE curadoria | Média | **4** |
| **Subtotal transacional curadoria** | | | **60** |

## 4. Total

| Categoria | PF |
|---|---:|
| Dados (base) | 90 |
| Transacional (base) | 107 |
| Dados (curadoria) | 73 |
| Transacional (curadoria) | 60 |
| **TOTAL BRUTO (PFNA)** | **330** |

VAF ≈ 1.07 → **Total Ajustado: ≈ 353 PF**

## 5. Estimativa de esforço

8 h/PF × 353 = **2 824 h-h** · sugestão: 5 devs × 17 semanas.

## 6. Backlog futuro
- Mobile companion (≈ 80 PF) · Workflow BPMN fiscalização (≈ 120 PF) · Open Data API (≈ 40 PF) · Importação CSV UI (≈ 25 PF)
