# 17 — LDAP / Active Directory

Integração planeada para autenticação institucional (ANA + operadores estaduais), complementar ao SSO OIDC (Keycloak).

## 1. Arquitetura

```text
Utilizador → Keycloak (OIDC) → LDAP/AD (User Federation) → SIGSAN-FED (JWT)
                                     ↓
                       sync de papéis → public.user_roles
```

O SIGSAN-FED nunca fala LDAP diretamente: o bridge é o Keycloak, que emite o JWT consumido pelo backend.

## 2. Parâmetros de conexão

| Campo | Valor exemplo |
|---|---|
| Vendor | Active Directory / OpenLDAP |
| Connection URL | `ldaps://ldap.ana.gov.br:636` (TLS obrigatório) |
| Bind DN | `CN=svc_sigsan,OU=Servicos,DC=ana,DC=gov,DC=br` |
| Bind credential | segredo em cofre — nunca no repositório |
| Users DN | `OU=Usuarios,DC=ana,DC=gov,DC=br` |
| User object classes | `person, organizationalPerson, user` |
| Search scope | Subtree |

## 3. Mapeamento de atributos

| LDAP/AD | SIGSAN-FED |
|---|---|
| `sAMAccountName` / `uid` | username (claim `preferred_username`) |
| `mail` | `profiles.email` |
| `displayName` / `cn` | `profiles.nome` |
| `department` / `company` | vínculo sugerido a `operadores` (`profiles.operador_id`) |
| `memberOf` | grupo → papel em `user_roles` |

## 4. Mapeamento de grupos para papéis

| Grupo AD | `app_role` |
|---|---|
| `SIGSAN-Admins` | `admin` |
| `SIGSAN-Gestores` | `gestor` |
| `SIGSAN-Auditores` | `auditor` |
| `SIGSAN-Operadores` | `operador` |

Regra: papéis vivem **sempre** em `public.user_roles` — nunca em `profiles` nem em claims confiáveis do cliente. A sincronização (`ldap-sync`, planeada) faz upsert idempotente e remove papéis revogados.

## 5. Segurança

- Apenas `ldaps://` (TLS 1.2+); certificado da CA institucional validado.
- Conta de bind com leitura mínima, rotação a cada 90 dias.
- Falha de LDAP não pode conceder acesso — política *fail closed*.
- Cada sincronização regista evento em `infra_audit_log`.
