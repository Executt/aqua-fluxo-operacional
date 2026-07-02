import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";

export type ConfoundingLevel = "ok" | "fragil" | "bloqueado";

interface Props {
  level?: ConfoundingLevel;
  estrato?: string | null;
  n?: number | null;
  minGroupSize?: number;
  className?: string;
}

/**
 * Sinaliza se uma métrica exibida está protegida pela Regra do Falso Afluente:
 * comparada dentro do mesmo estrato DMI e com amostra suficiente.
 *
 * - 🟢 ok:         estratificado + n >= min_group_size
 * - 🟡 fragil:     estratificado mas amostra pequena
 * - 🔴 bloqueado:  sem controle de confusão (não pode ser publicado como norma)
 */
export function ConfoundingBadge({ level, estrato, n, minGroupSize = 30, className }: Props) {
  const derived: ConfoundingLevel =
    level ??
    (!estrato
      ? "bloqueado"
      : n != null && n < minGroupSize
        ? "fragil"
        : "ok");

  const meta = {
    ok: {
      icon: ShieldCheck,
      label: estrato ? `Estrato DMI-${estrato}` : "Estratificado",
      hint: n != null ? `Comparado dentro do estrato (n=${n}). Válido para inferência.` : "Comparado dentro do estrato DMI.",
      cls: "bg-success/15 text-success border-success/30",
    },
    fragil: {
      icon: AlertTriangle,
      label: `DMI-${estrato ?? "?"} · n=${n ?? "?"}`,
      hint: `Amostra abaixo do mínimo (${minGroupSize}). Inferência frágil — evitar publicação normativa.`,
      cls: "bg-warning/15 text-warning border-warning/30",
    },
    bloqueado: {
      icon: ShieldAlert,
      label: "Sem controle DMI",
      hint: "Métrica não estratificada por Maturidade Institucional. Bloqueada para publicação normativa (Regra do Falso Afluente).",
      cls: "bg-destructive/15 text-destructive border-destructive/30",
    },
  }[derived];

  const Icon = meta.icon;
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1.5 text-[10px] font-medium ${meta.cls} ${className ?? ""}`}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-[11px]">
          {meta.hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
