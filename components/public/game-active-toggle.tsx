"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleGameActive } from "@/app/actions/games";
import { useToast } from "@/components/hooks/use-toast";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameActiveToggleProps {
  gameId: string;
  initialActive: boolean;
  gameName: string;
  className?: string;
}

export function GameActiveToggle({
  gameId,
  initialActive,
  gameName,
  className,
}: GameActiveToggleProps) {
  const [isActive, setIsActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleToggle = () => {
    if (isPending) return;

    const nextState = !isActive;
    setIsActive(nextState);

    startTransition(async () => {
      try {
        const res = await toggleGameActive(gameId, nextState);
        if (res?.success) {
          toast({
            title: nextState ? "Jogo ativado!" : "Jogo desativado",
            description: nextState
              ? `"${gameName}" foi fixado como primeiro na lista de jogos.`
              : `"${gameName}" não está mais fixado como primeiro na lista.`,
            variant: nextState ? "success" : "default",
          });
          router.refresh();
        } else {
          throw new Error("Falha na atualização");
        }
      } catch {
        setIsActive(!nextState);
        toast({
          title: "Erro",
          description: "Não foi possível alterar o status do jogo. Tente novamente.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 px-3.5 py-1.5 rounded-xl border transition-all duration-200 select-none shadow-sm",
        isActive
          ? "bg-orange-50/90 border-[#ff5100]/30 text-[#ff5100] ring-1 ring-[#ff5100]/15"
          : "bg-white border-slate-200/90 text-slate-700 hover:border-slate-300",
        isPending && "opacity-70 cursor-wait",
        className
      )}
      data-testid="game-active-toggle-container"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Pin
          className={cn(
            "w-4 h-4 shrink-0 transition-transform duration-200",
            isActive ? "text-[#ff5100] rotate-45 fill-current" : "text-slate-400"
          )}
          aria-hidden="true"
        />
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold leading-tight tracking-tight text-slate-900">
            {isActive ? "Jogo Ativo" : "Ativar Jogo"}
          </span>
          <span className="text-[10px] text-slate-500 font-medium leading-tight">
            {isActive ? "Fixado como 1º" : "Fixar como 1º"}
          </span>
        </div>
      </div>

      {/* Botão Slide (Toggle Switch) */}
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={isActive ? `Desativar jogo ${gameName}` : `Ativar jogo ${gameName}`}
        disabled={isPending}
        onClick={handleToggle}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5100] focus-visible:ring-offset-2",
          isActive ? "bg-[#ff5100]" : "bg-slate-300 hover:bg-slate-400/80",
          isPending && "cursor-wait"
        )}
        data-testid="game-active-slide-button"
      >
        <span className="sr-only">
          {isActive ? "Desativar jogo fixado" : "Ativar jogo fixado"}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
            isActive ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
