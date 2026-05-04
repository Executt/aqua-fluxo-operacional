# 📚 Documentação SIGSAN-FED

| # | Documento |
|---|---|
| 01 | [Padronização Visual](./01-padronizacao-visual.md) |
| 02 | [Arquitetura da Aplicação](./02-arquitetura.md) |
| 03 | [Database Schema](./03-database-schema.md) |
| 04 | [Rotas de API](./04-rotas-api.md) |
| 05 | [Políticas RLS](./05-rls-policies.md) |
| 06 | [Pontos de Função](./06-pontos-de-funcao.md) |
| 07 | [Inventário de Funções](./07-inventario-funcoes.md) |
| 08 | [Regras de Negócio](./08-regras-de-negocio.md) |
| 09 | [Segurança](./09-seguranca.md) |
| 10 | [Módulo Curadoria Nacional](./10-modulo-curadoria.md) |

Voltar ao [README principal](../README.md).

---

## 🔌 Configuração do Metabase (BI sobre o Star Schema)

O módulo de Curadoria expõe uma camada analítica em **materialized views** (`dim_*`, `fato_etes_curadoria`, `mv_*`) refrescada automaticamente a cada **15 minutos** via `pg_cron` (job `refresh_metabase_views_15min`).

Para conectar o Metabase com o mínimo de privilégio possível, use o role dedicado **`metabase_reader`** (já criado por migração) — ele tem `SELECT` **apenas** nas dimensões, fato e MVs analíticas. Não enxerga `auth.*`, `profiles`, `formulario_respostas` nem qualquer tabela transacional.

### 1. Definir senha do `metabase_reader`

O role foi criado sem senha. Defina uma forte (≥ 24 chars, alfanumérica + símbolos) **uma única vez**:

```sql
-- Executar no SQL Editor do Lovable Cloud (admin)
ALTER ROLE metabase_reader WITH PASSWORD 'COLE_AQUI_UMA_SENHA_FORTE';
```

> 🔐 **Nunca** commite a senha. Guarde-a em um cofre (1Password, Vault, AWS Secrets Manager). Se vazar, rode novamente o `ALTER ROLE` com nova senha — o Metabase vai precisar reconectar.

### 2. Permissões já provisionadas

A migração concedeu **somente**:

| Objeto | Permissão |
|---|---|
| `SCHEMA public` | `USAGE` |
| `dim_municipio`, `dim_tipologia`, `dim_operador` | `SELECT` |
| `fato_etes_curadoria` | `SELECT` |
| `mv_cobertura_municipal`, `mv_etes_por_tipologia`, `mv_dbo_regional` | `SELECT` |
| Demais tabelas (`profiles`, `user_roles`, `formulario_respostas`, `etes_curadoria`, `entidades`, `infracoes`, etc.) | ❌ revogado |
| Funções e sequences | ❌ revogado |

Se no futuro forem criadas novas MVs, libere-as explicitamente:

```sql
GRANT SELECT ON public.mv_nova_view TO metabase_reader;
```

### 3. Obter a string de conexão

No Lovable Cloud → **Connectors → Lovable Cloud → Database connection**, copie:

| Campo Metabase | Valor |
|---|---|
| **Database type** | PostgreSQL |
| **Host** | `db.<project-ref>.supabase.co` (ou pooler `aws-0-…pooler.supabase.com`) |
| **Port** | `5432` (direto) ou `6543` (pooler `transaction`) |
| **Database name** | `postgres` |
| **Username** | `metabase_reader` |
| **Password** | a definida no passo 1 |
| **Schemas** | `public` (apenas) |
| **Use a secure connection (SSL)** | ✅ **obrigatório** (`sslmode=require`) |

> 💡 Para Metabase em produção (fora da mesma VPC), prefira o **pooler `transaction`** (porta `6543`) — sobrevive melhor a picos de conexões do BI.

### 4. Conectar no Metabase

1. Vá em **Settings → Admin → Databases → Add database**.
2. Selecione **PostgreSQL** e preencha com os dados do passo 3.
3. Em **Show advanced options**:
   - ✅ **Use a secure connection (SSL)**
   - **Additional JDBC connection string options**: `sslmode=require`
   - **Re-run queries for simple explorations**: ❌ desligado (use cache, as MVs já são pré-agregadas)
   - **Choose when syncs and scans happen**: a cada 1 h (sync) e diário às 03:00 (scan)
4. **Save** → o Metabase vai falhar ao tentar listar tabelas que não pode ler — isso é esperado e seguro. Ele só vai indexar as 7 MVs/dimensões.

### 5. Autenticação dos usuários no Metabase

Para que **analistas humanos** entrem no Metabase, configure SSO **dentro do Metabase** (não no Postgres):

| Modo | Quando usar | Onde configurar |
|---|---|---|
| **Email + senha** | Equipes pequenas, MFA via app autenticador | Admin → People |
| **Google SSO** | Org já no Workspace | Admin → Authentication → Google Sign-In |
| **SAML / OIDC** (Keycloak) | Recomendado para a ANA — alinha com o roadmap de SSO do SIGSAN-FED (`docs/09-seguranca.md`) | Admin → Authentication → SAML / JWT |
| **LDAP / AD** | Integra com diretório institucional | Admin → Authentication → LDAP |

> Os usuários do Metabase **nunca** se autenticam como `metabase_reader` no Postgres. Esse role é só a credencial técnica que o Metabase guarda para executar queries. Permissões de dashboards/coleções são geridas dentro do Metabase via grupos.

### 6. Configurar grupos e permissões no Metabase

Crie pelo menos 3 grupos:

| Grupo Metabase | Acesso aos dados | Acesso a coleções |
|---|---|---|
| **Gestores ANA** | Todas as MVs (granular view) | leitura/escrita em "Curadoria Nacional" |
| **Auditores** | `fato_etes_curadoria` + `mv_*` | leitura em "Auditoria" |
| **Operadores externos** | Bloquear (não devem usar Metabase — usam a UI `/curadoria`) | — |

### 7. Verificações pós-instalação

```sql
-- A) Confirmar que o job de refresh está agendado
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'refresh_metabase_views_15min';

-- B) Ver últimas execuções
SELECT jobid, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- C) Confirmar privilégios do metabase_reader
SELECT table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'metabase_reader';
```

### 8. Rotação de credenciais (a cada 90 dias)

```sql
ALTER ROLE metabase_reader WITH PASSWORD 'NOVA_SENHA_FORTE';
```

Depois, no Metabase → Admin → Databases → SIGSAN-FED → atualize o campo Password e clique em **Save changes**. Rotacione também a senha da conta admin do próprio Metabase.

### 9. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `permission denied for materialized view mv_xxx` | MV nova sem GRANT | `GRANT SELECT ON public.mv_xxx TO metabase_reader;` |
| Dashboard vazio mas SQL direto retorna dados | MV ainda não refrescou | `SELECT public.refresh_metabase_views();` manual ou aguardar até 15 min |
| `FATAL: password authentication failed` | Senha errada ou rotacionada | Refazer passo 1 + atualizar Metabase |
| Conexão lenta / timeout | Usando porta 5432 com muitos usuários | Trocar para pooler `6543` (transaction mode) |

