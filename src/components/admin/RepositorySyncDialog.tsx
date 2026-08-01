import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, Clock, FolderSync, AlertTriangle } from "lucide-react";

type SyncJob = {
  id: string;
  mode: string;
  source_path: string | null;
  file_types: string[];
  state: "queued" | "running" | "done" | "error";
  files_found: number;
  files_synced: number;
  message: string | null;
  warnings: string[] | null;
  created_at: string;
};

const KIND_DEFAULT_TYPES: Record<string, string> = {
  documents: "pdf, docx, xlsx, txt, csv, md",
  images: "jpg, jpeg, png, tiff, webp",
  geospatial: "geojson, shp, kml, gpkg, tif",
  mixed: "",
};

export function RepositorySyncDialog({
  open, onOpenChange, repo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  repo: { id: string; name: string; kind: string; provider: string; active: boolean; folder_mappings?: any; file_types?: string[] } | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState("incremental");
  const [sourcePath, setSourcePath] = useState("");
  const [typesText, setTypesText] = useState("");

  const { data: jobs = [] } = useQuery({
    queryKey: ["repository_sync_jobs", repo?.id],
    enabled: open && !!repo,
    refetchInterval: (q) => {
      const rows = (q.state.data as SyncJob[] | undefined) ?? [];
      return rows.some((j) => j.state === "queued" || j.state === "running") ? 2000 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repository_sync_jobs" as any)
        .select("*")
        .eq("repository_id", repo!.id)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data as unknown as SyncJob[];
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      const file_types = typesText.split(",").map((t) => t.trim().replace(/^\./, "")).filter(Boolean);
      const { error } = await supabase.functions.invoke("repository-sync", {
        body: { repository_id: repo!.id, mode, source_path: sourcePath || null, file_types },
      });
      if (error) throw error;
      // persiste o mapeamento no repositório para reutilização
      await supabase.from("data_repositories" as any).update({
        folder_mappings: [{ source_path: sourcePath, file_types, mode }],
        file_types,
      }).eq("id", repo!.id);
    },
    onSuccess: () => {
      toast({ title: "Sincronização enfileirada", description: "O processamento corre em background." });
      qc.invalidateQueries({ queryKey: ["repository_sync_jobs", repo?.id] });
      qc.invalidateQueries({ queryKey: ["data_repositories"] });
    },
    onError: (e: any) => toast({ title: "Falha ao enfileirar", description: e.message, variant: "destructive" }),
  });

  if (!repo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderSync className="h-4 w-4 text-primary" /> Sincronização — {repo.name}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Mapeie a pasta de origem e os tipos de ficheiro a tratar. A execução é assíncrona e fica registada abaixo.
          </DialogDescription>
        </DialogHeader>

        {!repo.active && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 flex gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Repositório inativo — ative-o antes de sincronizar.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Modo</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="incremental" className="text-[12px]">Incremental</SelectItem>
                <SelectItem value="full" className="text-[12px]">Completa</SelectItem>
                <SelectItem value="upload" className="text-[12px]">Upload manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[11px]">Pasta de origem (prefixo)</Label>
            <Input className="h-9 text-[12px] font-mono" placeholder="docs/normativos/"
              value={sourcePath} onChange={(e) => setSourcePath(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-[11px]">
              Tipos de ficheiro (vírgula)
              <button type="button" className="ml-2 text-primary underline text-[10px]"
                onClick={() => setTypesText(KIND_DEFAULT_TYPES[repo.kind] ?? "")}>
                usar padrão de {repo.kind}
              </button>
            </Label>
            <Input className="h-9 text-[12px] font-mono" placeholder="pdf, docx, xlsx"
              value={typesText} onChange={(e) => setTypesText(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Histórico</Label>
          {jobs.length === 0 && <p className="text-[12px] text-muted-foreground py-3 text-center">Sem sincronizações.</p>}
          {jobs.map((j) => (
            <div key={j.id} className="rounded-md border border-border p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    {j.state === "done" ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                      : j.state === "error" ? <XCircle className="h-2.5 w-2.5 text-red-600" />
                      : j.state === "running" ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      : <Clock className="h-2.5 w-2.5" />}
                    {j.state}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{j.mode}</span>
                  {j.source_path && <span className="text-[10px] font-mono text-muted-foreground">{j.source_path}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(j.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {j.files_synced}/{j.files_found} ficheiro(s) · {j.message}
              </div>
              {j.warnings?.length ? (
                <ul className="list-disc pl-4 text-[10px] text-amber-700 mt-1">
                  {j.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              ) : null}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => start.mutate()} disabled={start.isPending || !repo.active}>
            {start.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Iniciar sincronização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
