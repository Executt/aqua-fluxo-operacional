# 16 — Frameworks de Conformidade

Frameworks GRC aplicados ao SIGSAN-FED e como cada um se materializa no produto.

| Framework | Aplicação no sistema |
|---|---|
| **CONAMA 430/2011 (art. 21)** | Regra técnica de DBO ≤ 120 mg/L **ou** remoção ≥ 60% — avaliada em `src/lib/hidrico.ts`, sinalizada em Validações e no importador em lote |
| **CONAMA 357/2005** | Enquadramento de corpos hídricos usado nas respostas do Cortex-San e na base de conhecimento |
| **Lei 14.026/2020 (Marco do Saneamento)** | Metas de cobertura e universalização nos indicadores de compliance |
| **ANA NR 79/2022** | Estrutura dos datasets SARSB e periodicidade de sincronização |
| **SNIS** | Completude de informação como insumo do score DMI |
| **LGPD** | Minimização de dados pessoais, `sensitive_access_log`, RLS por operador |
| **NIST CSF 2.0** | Identify/Protect/Detect/Respond/Recover mapeados em [09 — Segurança](./09-seguranca.md) |
| **AWIA / cibersegurança de sistemas de água** | Segregação de credenciais de ingestão IoT, imutabilidade de leituras, auditoria de infraestrutura |
| **ISO 27001 (A.9, A.12, A.18)** | Controlo de acesso por papel, registo de eventos e trilhas imutáveis |
| **MP 2.200-2/2001 (ICP-Brasil)** | Assinatura eletrónica simples nos relatórios PDF institucionais (protocolo + código de autenticação) |

## Como aplicar uma nova regra de conformidade

1. Modelar a regra em `compliance_regras` (`expressao_json`, `gravidade_default`, `prazo_dias`).
2. Validar a deteção com `compliance-auto-detect` em modo simulação.
3. Definir o fluxo de tratativa (plano de ação, prazos, escalonamento).
4. Documentar o fundamento normativo em [08 — Regras de Negócio](./08-regras-de-negocio.md).
5. Garantir controlo de confundimento: nenhuma análise agregada pode ignorar o estrato DMI ([11](./11-anti-confounding-dmi.md)).
