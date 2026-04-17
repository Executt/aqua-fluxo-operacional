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

## 3. Edge Functions planejadas

| Função | Verbo | Propósito |
|---|---|---|
| `iot-ingest` | POST | Receber telemetria de sensores (auth via API key do dispositivo) |
| `sei-protocolar` | POST | Criar processo SEI a partir de auto de infração |
| `smtp-test` | POST | Enviar e-mail de teste com credenciais informadas |
| `ldap-sync` | POST | Sincronizar usuários do LDAP/AD |
| `compliance-recalculate` | POST | Recalcular scores mensais |

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
