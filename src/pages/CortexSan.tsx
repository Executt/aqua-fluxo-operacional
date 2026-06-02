import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  BrainCircuit,
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  User,
  Clock,
  Settings,
  Loader2,
  Plug,
  Server,
  Cpu,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  date: string;
  preview: string;
}

type AIProvider = "lovable" | "openai" | "mcp";

interface AIConfig {
  provider: AIProvider;
  model: string;
  mcpEndpoint: string;
  mcpEnabled: boolean;
}

// ── Constants ─────────────────────────────────────────

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cortex-chat`;

const mockConversations: Conversation[] = [
  { id: "1", title: "Auditoria Contrato CEDAE", date: "Hoje", preview: "Análise dos termos contratuais da concessão..." },
  { id: "2", title: "Análise de Anomalia Rio Doce", date: "Hoje", preview: "Foram detectados picos de turbidez no sensor..." },
  { id: "3", title: "Relatório Compliance Q1 2026", date: "Ontem", preview: "Resumo do cumprimento das metas regulatórias..." },
  { id: "4", title: "Previsão de Demanda Hídrica", date: "3 dias atrás", preview: "Modelo preditivo para consumo no Nordeste..." },
  { id: "5", title: "Incidente ETE Alegria - RJ", date: "Semana passada", preview: "Análise de causa raiz do desvio de turbidez..." },
];

const initialMessage: Message = {
  id: "initial",
  role: "assistant",
  content: "Olá, sou o **Cortex-San**, o seu assistente regulatório e operacional. Como posso ajudar na análise de dados de saneamento hoje?",
  timestamp: new Date(),
};

// Static fallback for non-Lovable providers (lovable models come from DB)
const STATIC_PROVIDER_MODELS: Record<string, { label: string; models: { value: string; label: string }[] }> = {
  openai: {
    label: "OpenAI Direto",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-5", label: "GPT-5" },
    ],
  },
  mcp: {
    label: "MCP (Modelo Controlado)",
    models: [
      { value: "custom", label: "Modelo do Servidor MCP" },
    ],
  },
};

// ── Streaming helper ─────────────────────────────────

async function streamChat({
  messages,
  config,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  config: AIConfig;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  try {
    const body: Record<string, unknown> = {
      messages,
      provider: config.provider,
      model: config.model,
    };
    if (config.provider === "mcp" && config.mcpEndpoint) {
      body.mcpEndpoint = config.mcpEndpoint;
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
      onError(err.error || `Erro ${resp.status}`);
      return;
    }

    // MCP returns JSON (non-streaming)
    const contentType = resp.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await resp.json();
      onDelta(data.content || "Sem resposta do servidor MCP.");
      onDone();
      return;
    }

    // SSE streaming
    if (!resp.body) { onError("Stream vazio"); return; }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nlIdx: number;
      while ((nlIdx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nlIdx);
        buffer = buffer.slice(nlIdx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          // partial JSON, wait for more
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Erro de conexão");
  }
}

// ── Markdown helper ──────────────────────────────────

function renderMarkdown(text: string) {
  // Bold, inline code, line breaks
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return parts.map((part, i) => {
    if (part === "\n") return <br key={i} />;
    if (part.startsWith("**") && part.endsWith("**"))
      return <span key={i} className="font-bold text-primary">{part.slice(2, -2)}</span>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
}

// ── Component ────────────────────────────────────────

const STORAGE_KEY = "cortex-san:conv-ai-config:v1";
const NEW_KEY = "__new";

type ConfigMap = Record<string, AIConfig>;

function loadConfigMap(): ConfigMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConfigMap) : {};
  } catch { return {}; }
}
function saveConfigMap(map: ConfigMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

const CortexSan = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationKey = activeConversation ?? NEW_KEY;

  // Initial config: load persisted override for the active conversation if any.
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const map = loadConfigMap();
    return map[NEW_KEY] ?? {
      provider: "lovable",
      model: "google/gemini-3-flash-preview",
      mcpEndpoint: "",
      mcpEnabled: false,
    };
  });

  // ── Active LLMs from admin DB ────────────────────────
  const { data: activeLlms = [] } = useQuery({
    queryKey: ["llm_models_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("llm_models")
        .select("model_id, display_name, tier, is_default, active")
        .eq("active", true)
        .order("is_default", { ascending: false })
        .order("tier")
        .order("display_name");
      if (error) throw error;
      return data as { model_id: string; display_name: string; tier: string; is_default: boolean }[];
    },
  });

  const PROVIDER_MODELS = useMemo(() => ({
    lovable: {
      label: "Lovable AI",
      models: activeLlms.length
        ? activeLlms.map((m) => ({
            value: m.model_id,
            label: `${m.display_name}${m.is_default ? " ★" : ""}`,
          }))
        : [{ value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash" }],
    },
    ...STATIC_PROVIDER_MODELS,
  }), [activeLlms]);

  // When switching conversations, restore the saved override (or fall back to default).
  useEffect(() => {
    const map = loadConfigMap();
    const saved = map[conversationKey];
    if (saved) {
      setAiConfig(saved);
    } else {
      // No override saved → apply admin default if available
      const def = activeLlms.find((m) => m.is_default);
      if (def) {
        setAiConfig((prev) => ({ ...prev, provider: "lovable", model: def.model_id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey]);

  // Auto-apply admin default the first time it loads, only when no override is saved.
  useEffect(() => {
    if (aiConfig.provider !== "lovable") return;
    const map = loadConfigMap();
    if (map[conversationKey]) return; // user already chose for this conversation
    const def = activeLlms.find((m) => m.is_default);
    if (def && aiConfig.model !== def.model_id) {
      setAiConfig((prev) => ({ ...prev, model: def.model_id }));
    }
  }, [activeLlms, aiConfig.provider, aiConfig.model, conversationKey]);

  // Persist the config for the current conversation whenever it changes.
  useEffect(() => {
    const map = loadConfigMap();
    map[conversationKey] = aiConfig;
    saveConfigMap(map);
  }, [aiConfig, conversationKey]);


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const assistantId = crypto.randomUUID();

    const apiMessages = newMessages
      .filter((m) => m.id !== "initial")
      .map((m) => ({ role: m.role, content: m.content }));

    await streamChat({
      messages: apiMessages,
      config: aiConfig,
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id === assistantId) {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [
            ...prev,
            { id: assistantId, role: "assistant", content: assistantContent, timestamp: new Date() },
          ];
        });
      },
      onDone: () => setIsLoading(false),
      onError: (msg) => {
        setIsLoading(false);
        toast({ title: "Erro do Cortex-San", description: msg, variant: "destructive" });
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setMessages([initialMessage]);
    setActiveConversation(null);
  };

  const currentProviderInfo = PROVIDER_MODELS[aiConfig.provider];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
        {/* Conversation History Sidebar */}
        <div className="w-72 border-r border-border bg-card/50 flex flex-col">
          <div className="p-4 border-b border-border">
            <Button onClick={handleNewConversation} className="w-full gap-2 justify-start" variant="outline">
              <Plus className="h-4 w-4" />
              Nova Conversa
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {mockConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`w-full text-left rounded-lg p-3 transition-colors group ${
                    activeConversation === conv.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{conv.preview}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground/60">{conv.date}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs">
                Cortex-San v3.2 — <span className="font-mono text-primary">Online</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Chat Header */}
          <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <BrainCircuit className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Cortex-San</h2>
                <p className="text-[10px] text-muted-foreground">
                  {currentProviderInfo.label} — sobrescrita por conversa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Inline per-conversation model override */}
              {aiConfig.provider !== "mcp" && (
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    value={aiConfig.model}
                    onValueChange={(v) => setAiConfig((prev) => ({ ...prev, model: v }))}
                  >
                    <SelectTrigger className="h-8 text-[11px] w-[220px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentProviderInfo.models.map((m) => (
                        <SelectItem key={m.value} value={m.value} className="text-[12px]">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeLlms.find((m) => m.is_default) && aiConfig.provider === "lovable" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px]"
                      title="Restaurar modelo padrão da Administração"
                      onClick={() => {
                        const def = activeLlms.find((m) => m.is_default);
                        if (def) setAiConfig((prev) => ({ ...prev, model: def.model_id }));
                      }}
                      disabled={aiConfig.provider === "lovable" && activeLlms.find((m) => m.is_default)?.model_id === aiConfig.model}
                    >
                      Padrão
                    </Button>
                  )}
                </div>
              )}

            {/* Settings Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-card border-border w-96">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-foreground">
                    <Cpu className="h-4 w-4 text-primary" />
                    Configuração de IA
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {/* Provider */}
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Provedor de IA</Label>
                    <Select
                      value={aiConfig.provider}
                      onValueChange={(v: AIProvider) => {
                        const firstModel = PROVIDER_MODELS[v].models[0].value;
                        setAiConfig((prev) => ({ ...prev, provider: v, model: firstModel }));
                      }}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lovable">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Lovable AI (Padrão)
                          </div>
                        </SelectItem>
                        <SelectItem value="openai">
                          <div className="flex items-center gap-2">
                            <Cpu className="h-3.5 w-3.5" />
                            OpenAI Direto
                          </div>
                        </SelectItem>
                        <SelectItem value="mcp">
                          <div className="flex items-center gap-2">
                            <Server className="h-3.5 w-3.5" />
                            MCP (Modelo Controlado)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {aiConfig.provider === "openai" && (
                      <p className="text-[10px] text-yellow-400/80 mt-1">
                        ⚠ Requer OPENAI_API_KEY configurada nos secrets do projeto.
                      </p>
                    )}
                  </div>

                  {/* Model */}
                  {aiConfig.provider !== "mcp" && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Modelo</Label>
                      <Select
                        value={aiConfig.model}
                        onValueChange={(v) => setAiConfig((prev) => ({ ...prev, model: v }))}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentProviderInfo.models.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Separator className="bg-border" />

                  {/* MCP Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Plug className="h-4 w-4 text-primary" />
                          MCP Server
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Conecte a modelos controlados via Model Context Protocol
                        </p>
                      </div>
                      <Switch
                        checked={aiConfig.mcpEnabled}
                        onCheckedChange={(v) =>
                          setAiConfig((prev) => ({
                            ...prev,
                            mcpEnabled: v,
                            provider: v ? "mcp" : "lovable",
                            model: v ? "custom" : "google/gemini-3-flash-preview",
                          }))
                        }
                      />
                    </div>

                    {aiConfig.mcpEnabled && (
                      <div className="space-y-2">
                        <Label className="text-xs">Endpoint MCP (Streamable HTTP)</Label>
                        <Input
                          value={aiConfig.mcpEndpoint}
                          onChange={(e) =>
                            setAiConfig((prev) => ({ ...prev, mcpEndpoint: e.target.value }))
                          }
                          placeholder="https://mcp.internal.gov.br/v1"
                          className="bg-background border-border font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          O servidor MCP deve implementar o protocolo Streamable HTTP com o método
                          <code className="mx-1 bg-muted/50 px-1 rounded">completion/complete</code>.
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-border" />

                  {/* Status */}
                  <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">Estado da Conexão</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span className="text-xs text-muted-foreground">
                        {aiConfig.provider === "mcp"
                          ? "MCP — Aguardando endpoint"
                          : `${currentProviderInfo.label} — Operacional`}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-mono">
                      {aiConfig.provider === "mcp" ? "MCP Protocol v1.0" : aiConfig.model}
                    </Badge>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            </div>
          </div>


          {/* Messages */}
          <ScrollArea className="flex-1 px-6">
            <div className="max-w-3xl mx-auto py-6 space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <BrainCircuit className="h-4 w-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={`rounded-xl px-4 py-3 max-w-[75%] ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-2 ${
                          msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground/60"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    {msg.role === "user" && (
                      <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border p-4 shrink-0">
            <div className="max-w-3xl mx-auto flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva a sua mensagem ao Cortex-San..."
                className="flex-1 bg-card border-border focus-visible:ring-primary"
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={!input.trim() || isLoading} className="gap-2 px-4">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2 max-w-3xl mx-auto">
              O Cortex-San pode cometer erros. Verifique sempre as informações regulatórias com as fontes oficiais.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CortexSan;
