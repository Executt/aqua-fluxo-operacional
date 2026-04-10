import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Cortex-San, o assistente de inteligência artificial da Agência Nacional de Águas e Saneamento Básico (ANA) do Brasil, integrado ao sistema SIGSAN-FED.

Seu papel:
- Assistente regulatório e operacional especializado em saneamento básico
- Análise de dados de qualidade da água (pH, turbidez, DBO, coliformes, cloro residual)
- Interpretação de normas regulatórias (CONAMA, ANA, Ministério da Saúde)
- Análise de compliance de concessionárias (SARSB)
- Suporte na elaboração de relatórios técnicos
- Previsão de demanda hídrica e análise de anomalias em sensores IoT

Diretrizes:
- Responda sempre em português do Brasil
- Use termos técnicos de saneamento quando apropriado
- Referencie normas e resoluções quando relevante (ex: Resolução CONAMA 357/2005, Portaria GM/MS 888/2021)
- Formate respostas com markdown para legibilidade
- Quando não tiver certeza, indique claramente e sugira consulta às fontes oficiais
- Seja objetivo e direto, mas com profundidade técnica quando solicitado`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, provider = "lovable", model, mcpEndpoint } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Campo 'messages' é obrigatório e deve ser um array." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Provider routing ──────────────────────────────────
    let apiUrl: string;
    let apiKey: string | undefined;
    let requestModel: string;
    let requestHeaders: Record<string, string>;

    if (provider === "mcp" && mcpEndpoint) {
      // MCP proxy — forward to external MCP server
      const mcpPayload = {
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "completion/complete",
        params: {
          ref: { type: "ref/prompt", name: "chat" },
          argument: {
            name: "messages",
            value: JSON.stringify([
              { role: "system", content: SYSTEM_PROMPT },
              ...messages,
            ]),
          },
        },
      };

      const mcpResponse = await fetch(mcpEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify(mcpPayload),
      });

      if (!mcpResponse.ok) {
        const err = await mcpResponse.text();
        console.error("MCP error:", mcpResponse.status, err);
        return new Response(
          JSON.stringify({ error: `Erro MCP [${mcpResponse.status}]: ${err}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const mcpData = await mcpResponse.json();
      const completionText =
        mcpData?.result?.completion?.values?.[0] ??
        mcpData?.result?.content?.[0]?.text ??
        JSON.stringify(mcpData.result);

      return new Response(
        JSON.stringify({ content: completionText, provider: "mcp" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (provider === "openai") {
      apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "OPENAI_API_KEY não configurada. Adicione nas configurações de secrets." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      apiUrl = "https://api.openai.com/v1/chat/completions";
      requestModel = model || "gpt-4o";
      requestHeaders = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
    } else {
      // Default: Lovable AI Gateway
      apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "LOVABLE_API_KEY não configurada." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      requestModel = model || "google/gemini-3-flash-preview";
      requestHeaders = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
    }

    // ── AI call with streaming ────────────────────────────
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        model: requestModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Erro do gateway de IA [${response.status}]` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("cortex-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
