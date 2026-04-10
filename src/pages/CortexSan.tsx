import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BrainCircuit,
  Send,
  Plus,
  MessageSquare,
  Sparkles,
  User,
  Clock,
} from "lucide-react";

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

const mockConversations: Conversation[] = [
  {
    id: "1",
    title: "Auditoria Contrato CEDAE",
    date: "Hoje",
    preview: "Análise dos termos contratuais da concessão...",
  },
  {
    id: "2",
    title: "Análise de Anomalia Rio Doce",
    date: "Hoje",
    preview: "Foram detectados picos de turbidez no sensor...",
  },
  {
    id: "3",
    title: "Relatório Compliance Q1 2026",
    date: "Ontem",
    preview: "Resumo do cumprimento das metas regulatórias...",
  },
  {
    id: "4",
    title: "Previsão de Demanda Hídrica",
    date: "3 dias atrás",
    preview: "Modelo preditivo para consumo no Nordeste...",
  },
  {
    id: "5",
    title: "Incidente ETE Alegria - RJ",
    date: "Semana passada",
    preview: "Análise de causa raiz do desvio de turbidez...",
  },
];

const initialMessage: Message = {
  id: "initial",
  role: "assistant",
  content:
    "Olá, sou o **Cortex-San**, o seu assistente regulatório e operacional. Como posso ajudar na análise de dados de saneamento hoje?",
  timestamp: new Date(),
};

const CortexSan = () => {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate assistant response
    setTimeout(() => {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Estou a processar o seu pedido. Esta funcionalidade será conectada ao motor de IA Cortex-San em breve. Por agora, posso confirmar que recebi a sua mensagem e irei analisá-la com base nos dados regulatórios disponíveis.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMarkdown = (text: string) => {
    // Simple bold rendering
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <span key={i} className="font-bold text-primary">
            {part.slice(2, -2)}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
        {/* Conversation History Sidebar */}
        <div className="w-72 border-r border-border bg-card/50 flex flex-col">
          <div className="p-4 border-b border-border">
            <Button className="w-full gap-2 justify-start" variant="outline">
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
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {conv.preview}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground/60">
                          {conv.date}
                        </span>
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
          <div className="h-14 border-b border-border flex items-center px-6 gap-3 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <BrainCircuit className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Cortex-San</h2>
              <p className="text-[10px] text-muted-foreground">
                Assistente Regulatório & Operacional — IA Generativa
              </p>
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
                      <p className="text-sm leading-relaxed">
                        {msg.role === "assistant"
                          ? renderMarkdown(msg.content)
                          : msg.content}
                      </p>
                      <p
                        className={`text-[10px] mt-2 ${
                          msg.role === "user"
                            ? "text-primary-foreground/60"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
              />
              <Button onClick={handleSend} disabled={!input.trim()} className="gap-2 px-4">
                <Send className="h-4 w-4" />
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
