# 03 — Database Schema

> Postgres 15 (Lovable Cloud / Supabase). Schema `public`. Todas as tabelas com **RLS habilitado**.

## Diagrama relacional

```
entidades ──┬──< etes ──< sensores ──< sensor_leituras
            ├──< compliance_scores
            └──< infracoes
```

## Tabelas

### `entidades` — Prestadores de saneamento
| Coluna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK |
| `nome` | text | — | SABESP, CEDAE, etc. |
| `cnpj` | text | — | único, formatado |
| `area_atuacao` | text | — | Estadual / Municipal / Regional |
| `status` | text | `'Pendente'` | Ativa / Pendente / Suspensa |
| `created_at` / `updated_at` | timestamptz | `now()` | trigger `update_updated_at_column` |

### `etes` — Estações de Tratamento de Efluentes
| Coluna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK |
| `entidade_id` | uuid | — | FK lógica → `entidades.id` |
| `codigo` | text | — | ETE-SABESP-001 |
| `nome` | text | — | "ETE Barueri" |
| `cidade` / `uf` | text | — | localização |
| `latitude` / `longitude` | float8 | — | coordenadas |
| `status` | text | `'ativa'` | ativa / inativa / manutenção |

### `sensores` — Hardware IoT
| Coluna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK |
| `ete_id` | uuid | — | FK → `etes.id` |
| `codigo` | text | — | SN-pH-0007 |
| `tipo` | text | — | pH / OD / turbidez / vazão |
| `unidade` | text | `''` | mg/L, NTU, m³/h |
| `limite_legal` | text | — | "6,0–9,0" (CONAMA 357/2005) |
| `bateria` | int | `100` | 0–100 % |
| `sinal` | text | `'forte'` | forte / médio / fraco |
| `status` | text | `'normal'` | normal / alerta / crítico |
| `ultima_leitura` | timestamptz | `now()` | última telemetria |

### `sensor_leituras` — Telemetria (séries temporais)
| Coluna | Tipo | Default | Notas |
|---|---|---|---|
| `id` | uuid | `gen_random_uuid()` | PK |
| `sensor_id` | uuid | — | FK → `sensores.id` |
| `valor` | float8 | — | medição |
| `status` | text | `'normal'` | normal / alerta / crítico |
| `created_at` | timestamptz | `now()` | timestamp da leitura |

> ⚡ Adicionada à publicação `supabase_realtime` (eventos em tempo real).

### `compliance_scores` — Score mensal por entidade
| Coluna | Tipo | Default |
|---|---|---|
| `id` | uuid | `gen_random_uuid()` |
| `entidade_id` | uuid | — |
| `mes` | date | — |
| `score` | int | `0` (0–100) |
| `metas_total` / `metas_cumpridas` | int | `48 / 0` |
| `infracoes_abertas` | int | `0` |
| `status` | text | `'parcial'` (conforme / parcial / não conforme) |
| `tendencia` | text | `'stable'` (up / down / stable) |
| `ultima_auditoria` | date | — |

### `infracoes` — Autos de infração
| Coluna | Tipo | Default |
|---|---|---|
| `id` | uuid | `gen_random_uuid()` |
| `codigo` | text | — |
| `entidade_id` | uuid | — |
| `descricao` | text | — |
| `norma` | text | — | "CONAMA 357/2005 art. 21" |
| `gravidade` | text | `'media'` | leve / media / alta |
| `data_ocorrencia` | date | `CURRENT_DATE` |
| `prazo` | date | — |
| `status` | text | `'aberta'` | aberta / em_analise / resolvida |

## Funções

### `update_updated_at_column()`
Trigger function — atualiza `updated_at` em todo `UPDATE`. `SECURITY DEFINER`, `search_path = public`.

## Triggers
Aplicado em: `entidades`, `etes`, `sensores`, `compliance_scores`, `infracoes` → `BEFORE UPDATE FOR EACH ROW`.

## Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_leituras;
```

## Próximos passos (planejados)
- Tabela `system_settings` (chave/valor JSONB) para LDAP, SMTP, SEI, SSO
- Tabela `audit_log` para trilha (action, target, user_id, ts)

---

## Módulo Curadoria Nacional (v3.0)

Ver [`10-modulo-curadoria.md`](./10-modulo-curadoria.md) para diagrama, state machine e camada analítica.

### Novas tabelas
| Tabela | Propósito |
|---|---|
| `profiles` | Liga `auth.users` ao operador + nome/ativo |
| `user_roles` | RBAC (`admin`, `gestor`, `auditor`, `operador`) |
| `operadores` | Concessionárias / autarquias (CNPJ, tipo, UF) |
| `operador_municipios` | N:N operador ↔ município IBGE |
| `tipologias_tratamento` | Domínio de tipologias (UASB, Lodos Ativados, etc.) |
| `etes_curadoria` | ETEs sob curadoria com status operacional, vazões, eficiência DBO categorizada |
| `formulario_respostas` | Submissões mensais (JSONB) com state machine |

### Novos enums
`app_role`, `tipo_operador`, `status_operacional`, `faixa_eficiencia_dbo`, `estado_resposta`.

### Novas funções (todas `SECURITY DEFINER`, `search_path = public`)
- `has_role(user_id, role)`, `is_staff(user_id)`, `get_user_operador(user_id)`
- `handle_new_user()` — trigger `on_auth_user_created`
- `classify_faixa_dbo()` — deriva faixa baixa/normal/alta
- `validate_estado_transition()` — força transições válidas + carimbos
- `refresh_metabase_views()` — refresh CONCURRENTLY de todas matviews

### Camada analítica (Star Schema)
Materialized views: `dim_municipio`, `dim_tipologia`, `dim_operador`, `fato_etes_curadoria`, `mv_cobertura_municipal`, `mv_etes_por_tipologia`, `mv_dbo_regional`. Acesso REVOGADO de `anon`/`authenticated` — só `metabase_reader`.
