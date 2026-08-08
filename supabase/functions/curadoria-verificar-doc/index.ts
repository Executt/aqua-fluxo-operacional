import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const url = new URL(req.url)
    let protocolo = url.searchParams.get('protocolo') ?? ''
    let checksum = url.searchParams.get('checksum') ?? ''
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      protocolo = String(body?.protocolo ?? protocolo)
      checksum = String(body?.checksum ?? checksum)
    }
    protocolo = protocolo.trim()
    checksum = checksum.trim()

    if (protocolo.length < 6 || protocolo.length > 120 || checksum.length < 4 || checksum.length > 120) {
      return json({ error: 'Informe um protocolo e um checksum válidos.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data, error } = await supabase
      .from('curadoria_documentos')
      .select('*')
      .eq('protocolo', protocolo)
      .maybeSingle()

    if (error) throw error
    if (!data) return json({ valido: false, motivo: 'Protocolo não encontrado no registo oficial.' })
    if (data.checksum !== checksum) {
      return json({
        valido: false,
        motivo: 'Checksum não corresponde ao documento registado — o ficheiro pode ter sido alterado.',
      })
    }

    const { data: trilha } = await supabase
      .from('curadoria_lote_auditoria')
      .select('created_at, evento, resultado, detalhe, actor_email, tentativa, lote_id')
      .ilike('detalhe', `%${protocolo}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    return json({
      valido: true,
      documento: {
        protocolo: data.protocolo,
        checksum: data.checksum,
        titulo: data.titulo,
        escopo: data.escopo,
        total_registos: data.total_registos,
        compativeis: data.compativeis,
        incompativeis: data.incompativeis,
        assinante_nome: data.assinante_nome,
        assinante_cargo: data.assinante_cargo,
        assinante_papeis: data.assinante_papeis,
        emitido_em: data.emitido_em,
      },
      trilha: trilha ?? [],
    })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Erro inesperado' }, 500)
  }
})
