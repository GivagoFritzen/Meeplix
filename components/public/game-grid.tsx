"use client";

import { GameCard } from "./game-card";
import { cn } from "@/lib/utils";
import type { DisplayPreferences } from "@/lib/display-preferences";

interface GameGridProps {
  games: Array<{
    id: string;
    name: string;
    originalName?: string | null;
    year?: number | null;
    designer?: string | null;
    publisher?: string | null;
    coverImage?: string | null;
    minPlayers?: number | null;
    maxPlayers?: number | null;
    minPlaytime?: number | null;
    weight?: number | null;
    bggRating?: number | null;
    ludoRating?: number | null;
    mechanics?: string[];
  }>;
  className?: string;
  emptyMessage?: string;
  preferences: DisplayPreferences;
}

export function GameGrid({
  games,
  className,
  emptyMessage = "Nenhum jogo encontrado",
  preferences,
}: GameGridProps) {
  if (games.length === 0) {
    return (
      <div className={cn("col-span-full py-12 text-center", className)}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant mb-4">
          <span className="material-symbols-outlined text-outline text-[32px]">search_off</span>
        </div>
        <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">{emptyMessage}</h3>
        <p className="font-body-sm text-body-sm text-outline">Tente ajustar os filtros ou a busca</p>
      </div>
    );
  }

  return (
    <div className={cn("game-grid", className)}>
      {games.map((game) => (
        <GameCard key={game.id} {...game} preferences={preferences} />
      ))}
    </div>
  );
}