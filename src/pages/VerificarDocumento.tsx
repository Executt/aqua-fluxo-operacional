import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

interface Documento {
  protocolo: string; checksum: string; titulo: string; escopo: string | null;
  total_registos: number; compativeis: number; incompativeis: number;
  assinante_nome: string; assinante_cargo: string | null; assinante_papeis: string[];
  emitido_em: string;
}
interface TrilhaItem {
  created_at: string; evento: string; resultado: string; detalhe: string | null;
  actor_email: string | null; tentativa: number; lote_id: string;
}
interface Resposta {
  valido?: boolean; motivo?: string; documento?: Documento; trilha?: TrilhaItem[]; error?: string;
}

export default function VerificarDocumento() {
  const [params, setParams] = useSearchParams();
  const [protocolo, setProtocolo] = useState(params.get("p") ?? "");
  const [checksum, setChecksum] = useState(params.get("c") ?? "");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Resposta | null>(null);

  const verificar = async (p = protocolo, c = checksum) => {
    if (!p.trim() || !c.trim()) return;
    setLoading(true);
    setRes(null);
    const { data, error } = await supabase.functions.invoke("curadoria-verificar-doc", {
      body: { protocolo: p.trim(), checksum: c.trim() },
    });
    setRes(error ? { error: error.message } : (data as Resposta));
    setParams({ p: p.trim(), c: c.trim() }, { replace: true });
    setLoading(false);
  };

  useEffect(() => {
    const p = params.get("p"), c = params.get("c");
    if (p && c) verificar(p, c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Verificação de assinatura eletrónica
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta pública dos relatórios da Curadoria Nacional de Saneamento. Informe o protocolo e o
            checksum impressos no rodapé do PDF para confirmar a autenticidade e a integridade do documento.
          </p>
        </header>

        <Card className="elevation-1">
          <CardHeader>
            <CardTitle className="text-base">Dados do documento</CardTitle>
            <CardDescription>Ambos os campos constam do quadro de assinatura eletrónica.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="protocolo">Protocolo</Label>
              <Input id="protocolo" value={protocolo} placeholder="SIGSAN-20260808-XXXXXXXX"
                onChange={(e) => setProtocolo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checksum">Checksum do conteúdo</Label>
              <Input id="checksum" value={checksum} placeholder="XXXXXXXX-XXXXXXXX"
                onChange={(e) => setChecksum(e.target.value)} />
            </div>
            <Button onClick={() => verificar()} disabled={loading || !protocolo.trim() || !checksum.trim()}>
              {loading ? "A verificar..." : "Verificar documento"}
            </Button>
          </CardContent>
        </Card>

        {res?.error && (
          <Card className="elevation-1 border-destructive/50">
            <CardContent className="p-4 text-sm text-destructive">{res.error}</CardContent>
          </Card>
        )}

        {res && !res.error && (
          <Card className={`elevation-1 ${res.valido ? "border-success/50" : "border-destructive/50"}`}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {res.valido
                  ? <><CheckCircle2 className="h-5 w-5 text-success" /> Documento autêntico</>
                  : <><XCircle className="h-5 w-5 text-destructive" /> Documento não confirmado</>}
              </CardTitle>
              <CardDescription>{res.motivo ?? "Protocolo e checksum conferem com o registo oficial."}</CardDescription>
            </CardHeader>
            {res.documento && (
              <CardContent className="space-y-3 text-[13px]">
                <div className="grid gap-1 sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Título:</span> {res.documento.titulo}</div>
                  <div><span className="text-muted-foreground">Âmbito:</span> {res.documento.escopo ?? "—"}</div>
                  <div><span className="text-muted-foreground">Emitido em:</span> {new Date(res.documento.emitido_em).toLocaleString("pt-BR")}</div>
                  <div><span className="text-muted-foreground">Assinante:</span> {res.documento.assinante_nome}
                    {res.documento.assinante_cargo ? ` — ${res.documento.assinante_cargo}` : ""}</div>
                  <div className="flex gap-2 pt-1 flex-wrap sm:col-span-2">
                    <Badge variant="outline">{res.documento.total_registos} registos</Badge>
                    <Badge className="bg-success/15 text-success">{res.documento.compativeis} compatíveis</Badge>
                    <Badge className="bg-warning/15 text-warning">{res.documento.incompativeis} incompatíveis</Badge>
                    {res.documento.assinante_papeis?.map((p) => <Badge key={p} variant="outline">{p}</Badge>)}
                  </div>
                </div>
                <Separator />
                <div>
                  <div className="font-medium mb-1">Registo na trilha de auditoria</div>
                  {res.trilha?.length ? (
                    <ul className="space-y-1 text-[12px] text-muted-foreground">
                      {res.trilha.map((t, i) => (
                        <li key={i} className="tabular-nums">
                          {new Date(t.created_at).toLocaleString("pt-BR")} · {t.evento} · {t.resultado} ·
                          lote {t.lote_id.slice(0, 8)} (tentativa {t.tentativa}) · {t.actor_email ?? "sistema"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] text-muted-foreground">
                      Emissão registada no registo oficial de documentos; sem eventos de lote associados.
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </main>
  );
}
