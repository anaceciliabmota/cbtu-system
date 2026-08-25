import { Building2, GitCommitVertical, User } from "lucide-react";

interface LegendProps {
  showDirection?: boolean;
}

export function Legend({ showDirection = true }: LegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <User className="size-3.5 text-foreground" /> Estação
      </span>
      <span className="flex items-center gap-1.5">
        <GitCommitVertical className="size-3.5 text-crossing" /> Cruzamento (desvio)
      </span>
      <span className="flex items-center gap-1.5">
        <Building2 className="size-3.5 text-depot" /> Depósito
      </span>
      {showDirection ? (
        <>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-6 rounded-full bg-outbound" /> Trilho de ida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-6 rounded-full bg-inbound" /> Trilho de volta
          </span>
          <span className="text-muted-foreground/80">
            Trilho único: as duas faixas representam o mesmo trilho, separadas apenas por sentido
          </span>
        </>
      ) : (
        <span className="text-muted-foreground/80">Trilho único (linha simples)</span>
      )}

    </div>
  );
}
