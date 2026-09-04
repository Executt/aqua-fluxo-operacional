import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search } from "lucide-react";

type Row = {
  id: string;
  entity_type: "repository" | "database";
  entity_id: string;
  entity_name: string | null;
  action: string;
  motivo: string | null;
  changed_by_email: string | null;
  before_json: any;
  after_json: any;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  create: "Criação", update: "Edição", activate: "Ativação",
  deactivate: "Desativação", delete: "Remoção", test: "Teste", sync: "Sincronização",
};

const ACTION_CLS: Record<string, string> = {
  create: "text-emerald-600 bg-emerald-50 border-emerald-200",
  update: "text-blue-600 bg-blue-50 border-blue-200",
  activate: "text-emerald-600 bg-emerald-50 border-emerald-200",
  deactivate: "text-amber-600 bg-amber-50 border-amber-200",
  delete: "text-red-600 bg-red-50 border-red-200",
  test: "text-muted-foreground bg-muted border-border",
  sync: "text-primary bg-primary-soft border-primary/20",
};

export function InfraAuditTrail() {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState<"all" | "repository" | "database">("all");
  const [action, setAction] = useState<"all" | string>("all");
  const [autor, setAutor] = useState<"all" | string>("all");
  const [recurso, setRecurso] = useState<"all" | string>("all");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["infra_audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infra_audit_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const autores = useMemo(
    () => Array.from(new Set(rows.map((r) => r.changed_by_email).filter(Boolean) as string[])).sort(),
    [rows]
  );
  const recursos = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity_name).filter(Boolean) as string[])).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const deTs = de ? new Date(de).getTime() : null;
    const ateTs = ate ? new Date(ate).getTime() : null;
    return rows.filter((r) => {
      if (entity !== "all" && r.entity_type !== entity) return false;
      if (action !== "all" && r.action !== action) return false;
      if (autor !== "all" && (r.changed_by_email ?? "") !== autor) return false;
      if (recurso !== "all" && (r.entity_name ?? "") !== recurso) return false;
      const ts = new Date(r.created_at).getTime();
      if (deTs !== null && ts < deTs) return false;
      if (ateTs !== null && ts > ateTs) return false;
      if (!q) return true;
      return `${r.entity_name} ${r.motivo} ${r.changed_by_email}`.toLowerCase().includes(q);
    });
  }, [rows, search, entity, action, autor, recurso, de, ate]);

  const limparFiltros = () => {
    setSearch(""); setEntity("all"); setAction("all");
    setAutor("all"); setRecurso("all"); setDe(""); setAte("");
  };

  return (
    <Card className="lg:col-span-3 surface-card">
      <CardHeader>
        <CardTitle className="text-heading-2 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Trilha de auditoria — repositórios e conexões
        </CardTitle>
        <CardDescription className="text-body-sm">
          Quem alterou, quando e porquê. Registos imutáveis ({filtered.length} de {rows.length}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="h-9 pl-8 text-[12px]" placeholder="Buscar por recurso, autor ou motivo..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={entity} onValueChange={(v) => setEntity(v as any)}>
            <SelectTrigger className="h-9 text-[12px] w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">Todos os recursos</SelectItem>
              <SelectItem value="repository" className="text-[12px]">Repositórios</SelectItem>
              <SelectItem value="database" className="text-[12px]">Bases de dados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-9 text-[12px] w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">Todas as ações</SelectItem>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-[12px]">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={autor} onValueChange={setAutor}>
            <SelectTrigger className="h-9 text-[12px] w-[200px]"><SelectValue placeholder="Utilizador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">Todos os utilizadores</SelectItem>
              {autores.map((a) => (
                <SelectItem key={a} value={a} className="text-[12px]">{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={recurso} onValueChange={setRecurso}>
            <SelectTrigger className="h-9 text-[12px] w-[220px]"><SelectValue placeholder="Repositório/base" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[12px]">Todos os repositórios/bases</SelectItem>
              {recursos.map((r) => (
                <SelectItem key={r} value={r} className="text-[12px]">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="datetime-local" aria-label="Data inicial" className="h-9 text-[12px] w-[190px]"
            value={de} onChange={(e) => setDe(e.target.value)} />
          <Input type="datetime-local" aria-label="Data final" className="h-9 text-[12px] w-[190px]"
            value={ate} onChange={(e) => setAte(e.target.value)} />
          <Button variant="outline" size="sm" className="h-9 text-[12px]" onClick={limparFiltros}>
            <FilterX className="h-3.5 w-3.5 mr-1.5" /> Limpar
          </Button>
        </div>


        {isLoading ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">A carregar...</p>
        ) : filtered.length === 0 ? (
          <p className="text-body-sm text-muted-foreground py-6 text-center">Sem registos de auditoria.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${ACTION_CLS[r.action] ?? ""}`}>
                      {ACTION_LABEL[r.action] ?? r.action}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {r.entity_type === "repository" ? "Repositório" : "Base de dados"}
                    </Badge>
                    <span className="text-[12px] font-medium">{r.entity_name ?? r.entity_id.slice(0, 8)}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  por {r.changed_by_email ?? "sistema"}
                  {r.motivo ? ` · motivo: ${r.motivo}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
