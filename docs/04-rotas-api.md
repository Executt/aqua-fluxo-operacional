# 04 — Rotas de API

## 1. PostgREST (auto-gerado pelo Supabase)

Base URL: `${VITE_SUPABASE_URL}/rest/v1/`
Header obrigatório: `apikey: ${VITE_SUPABASE_PUBLISHABLE_KEY}` + `Authorization: Bearer <user_jwt>` (quando autenticado).

> No frontend nunca chamamos REST cru — sempre via SDK `supabase.from('tabela')`.

| Recurso | GET (lista) | GET (item) | POST | PATCH | DELETE |
|---|---|---|---|---|---|
| `entidades` | público | público | auth | auth | auth |
| `etes` | público | público | auth | auth | auth |
| `sensores` | público | público | auth | auth | auth |
| `sensor_leituras` | público | público | auth | — | — |
| `compliance_scores` | público | público | auth | auth | — |
| `infracoes` | público | público | auth | auth | — |

### Exemplos (SDK)
```ts
// Listar entidades
const { data } = await supabase.from('entidades').select('*').order('nome');

// Inserir nova entidade
await supabase.from('entidades').insert({
  nome: 'SABESP',
  cnpj: '43.776.517/0001-80',
  area_atuacao: 'Estadual',
});

// Atualizar score
await supabase
  .from('compliance_scores')
  .update({ score: 87, status: 'conforme' })
  .eq('id', scoreId);
```

### Realtime (assinaturas)
```ts
supabase
  .channel('iot-leituras')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'sensor_leituras' },
    (payload) => console.log(payload.new))
  .subscribe();
```

## 2. Edge Functions (Deno)

Base URL: `${VITE_SUPABASE_URL}/functions/v1/`
Sempre invocadas via `supabase.functions.invoke()` (nunca por path manual).

### `cortex-chat` — Assistente IA
**POST** `/functions/v1/cortex-chat`

Modelo: `google/gemini-2.5-flash` via Lovable AI Gateway (sem chave do usuário).

```ts
const { data, error } = await supabase.functions.invoke('cortex-chat', {
  body: { messages: [{ role: 'user', content: 'Resumir CONAMA 357/2005 art. 21' }] },
});
```

| Field | Tipo | Descrição |
|---|---|---|
| `messages` | `{role, content}[]` | Histórico OpenAI-style |
| `model` (opt) | string | Default `google/gemini-2.5-flash` |

Resposta:
```json
{ "content": "Texto gerado..." }
```

CORS habilitado para `*`. `verify_jwt = false` (default Lovable).

## 3. Edge Functions — Curadoria (v3.0)

Todas com `verify_jwt = true`. Header `Authorization: Bearer <jwt>` obrigatório.

### `curadoria-submit` — POST
```json
{ "ete_id": "uuid", "ano_referencia": 2026, "mes_referencia": 4,
  "payload": { "eficiencia_dbo_pct": 87.5, "vazao_media_lps": 120, "ph_medio": 7.2 },
  "estado": "submetido" }
```
Upsert em `(ete_id, ano, mes)`. Valida que ETE pertence ao operador do utilizador.

### `curadoria-transition` — POST
```json
{ "resposta_id": "uuid", "novo_estado": "em_analise", "motivo_rejeicao": "..." }
```
RBAC: `rascunho→submetido` e `rejeitado→rascunho` = operador dono; demais = auditor/gestor/admin.

### `curadoria-bulk-insert` — POST
```json
{ "operador_id": "uuid", "respostas": [ /* até 1000 */ ] }
```
Retorna `{ inserted, errors[{idx, ete_id, error}] }`. Tolerante a falhas parciais.

## 4. Edge Functions planejadas

| Função | Verbo | Propósito |
|---|---|---|
| `iot-ingest` | POST | Telemetria de sensores (auth via API key) |
| `sei-protocolar` | POST | Criar processo SEI a partir de validação/infração |
| `smtp-test` | POST | Enviar e-mail de teste |
| `ldap-sync` | POST | Sincronizar usuários do LDAP/AD |
| `compliance-recalculate` | POST | Recalcular scores mensais |
| `metabase-refresh` | POST | Disparar `refresh_metabase_views()` |

## 4. Convenções

- Validar input com **zod** em toda Edge Function.
- Retornar sempre `{ ...corsHeaders, 'Content-Type': 'application/json' }`.
- Lançar `400` em validação, `401` em auth, `500` com payload `{ error: string }`.
- Sem SQL cru — sempre `supabase.from(...)` ou RPC tipada.

## 5. Códigos de erro padronizados

| Código | Significado |
|---|---|
| `200` | OK |
| `201` | Criado |
| `400` | Dados inválidos (zod) |
| `401` | Não autenticado |
| `403` | RLS / sem permissão |
| `404` | Não encontrado |
| `409` | Conflito (ex: CNPJ duplicado) |
| `429` | Rate limit |
| `500` | Erro interno |

## 5. Edge Function — `connection-test` (v3.2)

**POST** `/functions/v1/connection-test` — `verify_jwt = true`, requer role admin/gestor.

```json
{ "target": "repository" | "database", "id": "uuid" }
```

Resposta:
```json
{ "status": "ok" | "warn" | "fail", "message": "…", "latency_ms": 234 }
```

Executa reachability HTTP/HTTPS quando aplicável (S3, Azure Blob, GCS, Snowflake, BigQuery, SharePoint, Drive, HTTP/WebDAV). Para engines cujo driver nativo não roda em Deno Edge (Postgres, MySQL, Mongo, Oracle, FTP, SFTP, filesystem) retorna `warn` validando apenas o schema da configuração — o teste real deve ser feito por worker/agent dedicado.

O resultado é persistido em `last_test_status` / `last_test_message` / `last_test_at` da tabela alvo.
