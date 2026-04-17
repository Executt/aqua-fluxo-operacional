# 09 — Segurança

## 1. Camadas de defesa

```
[Cliente]
   │  HTTPS + HSTS
   ▼
[Lovable Edge]  → CSP, CORS, rate limit
   │
   ▼
[Edge Functions Deno]  → zod validation, JWT verify, secrets
   │
   ▼
[Postgres + RLS]  → has_role(), SECURITY DEFINER
   │
   ▼
[Lovable Cloud Vault]  → secrets criptografados
```

## 2. Autenticação

| Método | Status |
|---|---|
| E-mail + senha (Supabase Auth) | 🟡 disponível, não habilitado por default |
| Keycloak OIDC (Gov.br) | 🔵 planejado — UI pronta em `/admin?tab=sso` |
| LDAP / Active Directory | 🔵 planejado — UI pronta em `/admin?tab=usuarios` |

**Quando ativarmos auth**:
- Senhas: HIBP check habilitado (`password_hibp_enabled: true`)
- Sem signup anônimo
- Verificação de e-mail obrigatória
- Reset de senha por link com expiração 1h

## 3. Autorização

- **RLS sempre on** em todas as tabelas
- **Roles em tabela dedicada** (`user_roles`) — nunca em JWT custom claims
- Função `has_role(_user_id, _role)` `SECURITY DEFINER` com `search_path = public`
- 4 perfis: admin, auditor, operador, visualizador (RN-405)
- Verificação **server-side** — frontend só esconde UI, nunca confia em estado local

## 4. Secrets management

Secrets ficam em **Lovable Cloud Vault**, nunca no código:

| Secret | Uso |
|---|---|
| `LOVABLE_API_KEY` | Lovable AI Gateway (auto) |
| `SUPABASE_*` | Conexão DB (auto) |
| `LDAP_BIND_PASSWORD` | 🔵 planejado |
| `SMTP_PASSWORD` | 🔵 planejado |
| `SEI_API_TOKEN` | 🔵 planejado |
| `KEYCLOAK_CLIENT_SECRET` | 🔵 planejado |

Acesso apenas em Edge Functions via `Deno.env.get()`. Nunca expostos ao browser.

## 5. Validação de entrada

- **Cliente**: zod + react-hook-form com mensagens claras
- **Servidor (Edge Functions)**: zod `safeParse` retornando 400 com `error.flatten()`
- **DB**: constraints + check constraints (planejado)

```ts
const schema = z.object({
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/),
  nome: z.string().trim().min(3).max(200),
});
const parsed = schema.safeParse(body);
if (!parsed.success) return new Response(JSON.stringify({error: parsed.error.flatten()}), {status: 400});
```

## 6. Sanitização

- **Nunca** `dangerouslySetInnerHTML` com input do usuário
- URLs externas sempre via `encodeURIComponent`
- Markdown da IA renderizado com lib sanitizada (planejado)

## 7. Rate limiting

| Endpoint | Limite |
|---|---|
| `cortex-chat` | 30 req / min / IP |
| `iot-ingest` (planej.) | 1 000 req / min / device |
| `smtp-test` | 5 req / hora / user |
| Auth | gerenciado pelo Supabase |

## 8. CORS

```ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // restringir em prod
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

## 9. Auditoria

Toda alteração administrativa registrada em `audit_log` (planejada):
```
{ ts, user_id, action, target, before, after, ip, user_agent, result }
```

Trilha visível em `/admin?tab=auditoria`. Retenção: 365 dias (RN-404).

## 10. Conformidade legal

| Norma | Aplicação |
|---|---|
| **LGPD** (Lei 13.709/2018) | Minimização de PII, base legal "exercício regular de direito" + "execução de políticas públicas" |
| **Marco Civil da Internet** | Logs de acesso por 6 meses |
| **Lei 14.129/2021 (Gov Digital)** | Interoperabilidade via Gov.br + SEI |
| **ISO 27001** (alvo) | SGSI em construção |

## 11. Backups

- Automático diário pelo Supabase (PITR 7 dias no plano padrão)
- Snapshot semanal exportado (planejado)

## 12. Plano de resposta a incidentes (PRI)

1. Detecção (alerta automático em `audit_log` ou Sentry)
2. Contenção (rotacionar secrets via `supabase--rotate_api_keys`)
3. Erradicação (revogar tokens, expirar sessões)
4. Recuperação (PITR)
5. Post-mortem (registrar em `/docs/incidents/AAAA-MM-DD.md`)

## 13. Checklist por release

- [ ] Sem secrets em código (`grep -r "password\|secret\|key" src/`)
- [ ] RLS habilitado em toda nova tabela
- [ ] Inputs validados com zod (cliente + servidor)
- [ ] Edge Functions com CORS correto
- [ ] Tipos atualizados em `src/integrations/supabase/types.ts`
- [ ] `npm audit` sem vulnerabilidades altas/críticas
- [ ] Testes passando (`npm test`)
