# 05 — Políticas de Segurança RLS

> **RLS está HABILITADO em todas as tabelas** do schema `public`. Sem auth, apenas leitura pública é permitida.

## Modelo de roles (planejado)

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'auditor', 'operador', 'visualizador');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

> Roles **nunca** ficam em `profiles` ou em `localStorage` — sempre em tabela dedicada via função `SECURITY DEFINER` para evitar recursão e escalation.

## Políticas atuais

### `entidades`
| Política | Comando | Role | Expressão |
|---|---|---|---|
| Public read entidades | SELECT | public | `true` |
| Auth insert entidades | INSERT | authenticated | `true` |
| Auth update entidades | UPDATE | authenticated | `true` |
| Auth delete entidades | DELETE | authenticated | `true` |

### `etes`
Mesmo padrão de `entidades` (SELECT público; INSERT/UPDATE/DELETE autenticado).

### `sensores`
Mesmo padrão.

### `sensor_leituras`
| Política | Comando | Role | Expressão |
|---|---|---|---|
| Public read leituras | SELECT | public | `true` |
| Auth insert leituras | INSERT | authenticated | `true` |
| — | UPDATE/DELETE | — | **Bloqueado** (imutabilidade de telemetria) |

### `compliance_scores` & `infracoes`
| Política | Comando | Role |
|---|---|---|
| Public read | SELECT | public |
| Auth insert | INSERT | authenticated |
| Auth update | UPDATE | authenticated |
| — | DELETE | **Bloqueado** (imutabilidade contábil) |

## Endurecimento planejado (próxima sprint)

Substituir `true` por checagens via `has_role`:

```sql
-- Apenas admins podem deletar entidades
DROP POLICY "Auth delete entidades" ON public.entidades;
CREATE POLICY "Admins delete entidades" ON public.entidades
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Apenas auditores podem alterar infrações
CREATE POLICY "Auditores update infracoes" ON public.infracoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'admin'));
```

## Princípios

1. **Default deny** — sem política, sem acesso.
2. **Roles em tabela dedicada** — nunca no JWT custom claims editável.
3. **`SECURITY DEFINER` + `search_path = public`** em toda função usada em RLS.
4. **Sem SQL cru** vindo do cliente — apenas RPC parametrizado ou SDK.
5. **Imutabilidade** de telemetria e infrações (sem DELETE).
6. **Auditoria** de toda alteração administrativa em `audit_log` (planejado).

---

## Módulo Curadoria (v3.0) — RBAC implementado

Enum `app_role`: `admin`, `gestor`, `auditor`, `operador`.

Helpers (todos SECURITY DEFINER): `has_role`, `is_staff`, `get_user_operador`.

### Políticas por tabela

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | self OR staff | trigger | self OR admin | admin |
| `user_roles` | self OR staff | admin | admin | admin |
| `operadores` | staff OR `id = get_user_operador(uid)` | admin | admin | admin |
| `operador_municipios` | staff OR `operador_id = get_user_operador(uid)` | admin | admin | admin |
| `tipologias_tratamento` | authenticated | admin | admin | admin |
| `etes_curadoria` | staff OR operador dono | operador OR staff | operador OR staff | admin |
| `formulario_respostas` | staff OR operador dono | operador dono | (operador dono E estado IN rascunho/rejeitado) OR staff | **bloqueado** |

Materialized views: `REVOKE ALL FROM anon, authenticated` — só `metabase_reader`.

### Trigger de imutabilidade
`validate_estado_transition()` bloqueia transições inválidas e edição de `payload` em estado validado/rejeitado.

### Avisos do linter (legacy)
14 políticas com `USING (true)` continuam nas tabelas pré-curadoria (`entidades`, `etes`, `sensores`, etc.). **TODO** próxima sprint: migrar para `is_staff()`.
