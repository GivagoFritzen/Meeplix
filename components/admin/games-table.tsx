"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { formatRating, formatPlaytime, formatPlayers } from "@/lib/utils";
import { useToast } from "@/components/hooks/use-toast";
import { AdminFilterBar } from "./filter-bar";

interface GameRow {
  id: string;
  name: string;
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
  bggRank?: number | null;
  ludoRank?: number | null;
  links?: { bgg?: string | null; ludopedia?: string | null };
  files?: Array<{ path: string; type: string }>;
  createdAt: string;
}

interface GamesTableProps {
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  editingId?: string | null;
  refreshTrigger?: number;
}

interface GameRowActionsProps {
  game: GameRow;
  syncing: boolean;
  editingId?: string | null;
  onEdit: (id: string) => void;
  onSync: (game: GameRow) => void;
  onDelete: (id: string) => void;
}

function GameRowActions({ game, syncing, editingId, onEdit, onSync, onDelete }: GameRowActionsProps) {
  const canSync = Boolean(game.links?.ludopedia || game.links?.bgg);
  const syncDisabled = syncing || !canSync;

  return (
    <td className="py-3 px-4 text-right whitespace-nowrap">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(game.id)}
          className="p-1.5 rounded-lg bg-orange-50 text-primary hover:bg-orange-100 transition-all active:scale-95"
          title="Editar Jogo"
        >
          <span className="material-symbols-outlined text-base">edit</span>
        </button>
        <button
          type="button"
          onClick={() => onSync(game)}
          disabled={syncDisabled}
          className={`p-1.5 rounded-lg ${syncDisabled ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-600 hover:text-[#2c274b] hover:bg-slate-200"} transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`}
          title="Re-sincronizar Scraping"
        >
          <span className={`material-symbols-outlined text-base ${syncing ? "animate-pulse" : ""}`}>sync</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(game.id)}
          disabled={Boolean(editingId)}
          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-600 disabled:hover:bg-slate-100"
          title={editingId ? "Finalize ou cancele a edição para excluir" : "Excluir"}
        >
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    </td>
  );
}

export function GamesTable({ onEdit, onDelete, editingId, refreshTrigger }: GamesTableProps) {
  const [games, setGames] = useState<GameRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [players, setPlayers] = useState("all");
  const [duration, setDuration] = useState("all");
  const [complexity, setComplexity] = useState("all");
  const [mechanic, setMechanic] = useState("all");
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        sort,
        page: page.toString(),
        limit: "50",
        players,
        duration,
        complexity,
        mechanic,
      });
      const res = await fetch(`/api/admin/games?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGames(data.games);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Erro ao buscar jogos:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sort, page, players, duration, complexity, mechanic, refreshTrigger]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial e refetch ao alterar filtros
    fetchGames();
  }, [fetchGames]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este jogo?")) return;
    await onDelete(id);
    await fetchGames();
  };

  const handleSync = async (game: GameRow) => {
    const ludopediaUrl = game.links?.ludopedia ?? "";
    const bggUrl = game.links?.bgg ?? "";

    if (!ludopediaUrl && !bggUrl) {
      toast({ title: "Aviso", description: "Este jogo não possui URL da Ludopedia ou do BGG para sincronizar.", variant: "default" });
      return;
    }

    setSyncing(game.id);
    try {
      const res = await fetch("/api/games/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ludopediaUrl: ludopediaUrl || undefined, bggUrl: bggUrl || undefined, gameId: game.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao sincronizar scraping");
      }

      const data = await res.json();
      const sources = data.sources ?? {};
      const successCount = Object.values(sources).filter((s) => s === "success").length;

      toast({
        title: successCount > 0 ? "Sincronizado" : "Sincronização concluída",
        description: successCount > 0 ? "Dados atualizados com sucesso." : "Nenhuma fonte retornou dados utilizáveis.",
        variant: successCount > 0 ? "success" : "default",
      });

      await fetchGames();
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao sincronizar scraping", variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const handlePlayersChange = (value: string) => {
    setPlayers(value);
    setPage(1);
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
    setPage(1);
  };

  const handleComplexityChange = (value: string) => {
    setComplexity(value);
    setPage(1);
  };

  const handleMechanicChange = (value: string) => {
    setMechanic(value);
    setPage(1);
  };

  if (loading && games.length === 0) {
    return (
      <div className="rounded-xl bg-surface-container-low border border-outline-variant overflow-hidden shadow-sm">
        <div className="p-8 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          <p className="mt-2 text-on-surface-variant">Carregando jogos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="p-space-md rounded-xl bg-white border border-[#e2e8f0] shadow-sm flex flex-col gap-3">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            placeholder="Filtrar por nome, designer ou mecânica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#cbd5e1] rounded-lg text-on-surface text-body-sm placeholder:text-slate-400 focus:outline-none focus:border-primary"
          />
        </div>
        <AdminFilterBar
          sortElement={
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="w-full sm:w-auto bg-white border border-[#ded8ea] text-[#0f172a] text-body-sm font-body-sm rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:border-primary focus:ring-0 cursor-pointer shadow-sm"
            >
              <option value="name">Ordenar por Nome (A-Z)</option>
              <option value="-bggRating">Maior Nota BGG</option>
            </select>
          }
          currentValues={{ players, duration, complexity, mechanic }}
          onFilterChange={(key, value) => {
            switch (key) {
              case "players":
                handlePlayersChange(value);
                break;
              case "duration":
                handleDurationChange(value);
                break;
              case "complexity":
                handleComplexityChange(value);
                break;
              case "mechanic":
                handleMechanicChange(value);
                break;
            }
          }}
        />
      </div>

      {/* Mobile: Cards verticais (referência code.html) */}
      <section className="md:hidden space-y-2">
        {games.length === 0 ? (
          <div className="p-4 text-center text-slate-500">Nenhum jogo encontrado</div>
        ) : (
          games.map((game) => {
            return (
              <div
                key={game.id}
                className="p-4 space-y-2.5 rounded-xl bg-white border border-[#e2e8f0] shadow-sm hover:bg-[#f8fafc]/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <h3 className="font-headline-sm font-bold text-on-surface leading-snug truncate">{game.name}</h3>
                      {game.year && (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-medium px-1.5 py-0.5 rounded border border-[#e2e8f0]">
                          {game.year}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-[11px]">
                    {game.ludoRating && (
                      <span className="inline-flex items-center gap-0.5 bg-[#ff5100]/10 text-[#ff5100] border border-[#ff5100]/20 px-1.5 py-0.5 rounded font-semibold text-[10px]" title="Ludopedia">
                        <span className="text-[9px] font-bold text-[#ff5100]">Ludo</span> {formatRating(game.ludoRating)}
                      </span>
                    )}
                    {game.bggRating && (
                      <span className="inline-flex items-center gap-0.5 bg-[#2c274b]/10 text-[#2c274b] border border-[#2c274b]/20 px-1.5 py-0.5 rounded font-semibold text-[10px]" title="BoardGameGeek">
                        <span className="text-[9px] font-bold text-[#2c274b]">BGG</span> {formatRating(game.bggRating)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-slate-400 shrink-0">group</span>
                    <span>{formatPlayers(game.minPlayers, game.maxPlayers)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-500">
                    <span className="material-symbols-outlined text-sm text-slate-400 shrink-0">schedule</span>
                    <span>{formatPlaytime(game.minPlaytime)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#e2e8f0] text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(game.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#ff5100]/20 bg-[#ff5100]/10 hover:bg-[#ff5100]/20 text-[#ff5100] font-medium transition active:scale-[0.98]"
                      title="Editar Jogo"
                    >
                      <span className="material-symbols-outlined text-xs text-[#ff5100]">edit</span>
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSync(game)}
                      disabled={syncing === game.id || (!game.links?.ludopedia && !game.links?.bgg)}
                      className={"inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#e2e8f0] bg-white hover:bg-slate-50 text-slate-600 transition active:scale-[0.98] " + (syncing === game.id || (!game.links?.ludopedia && !game.links?.bgg) ? "text-slate-400" : "text-[#2c274b] hover:text-[#2c274b] hover:bg-slate-200")}
                      title="Re-sincronizar Scraping"
                      aria-label="Sincronizar metadados"
                    >
                      {syncing === game.id ? (
                        <span className="material-symbols-outlined text-xs text-slate-500 animate-pulse">sync</span>
                      ) : (
                        <span className="material-symbols-outlined text-xs text-slate-500">sync</span>
                      )}
                      <span className="text-[11px]">Sync</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(game.id)}
                    disabled={Boolean(editingId)}
                    className={"p-1 rounded-lg transition active:scale-[0.98] " + (editingId ? "text-slate-400 hover:bg-slate-100" : "text-slate-400 hover:text-red-600 hover:bg-red-50")}
                    title={editingId ? "Finalize ou cancele a edição para excluir" : "Excluir"}
                    aria-label="Excluir jogo"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Desktop: Tabela */}
      <section className="hidden md:block">
        <div className="rounded-xl bg-white border border-[#e2e8f0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-slate-50 text-slate-600 font-label-md text-label-md">
                <th className="py-3 px-4">Jogo</th>
                <th className="py-3 px-3">Mesa / Duração</th>
                <th className="py-3 px-3">Notas</th>
                <th className="py-3 px-4 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] text-body-sm font-body-sm">
              {games.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    Nenhum jogo encontrado
                  </td>
                </tr>
              ) : (
                games.map((game) => {
                  const coverFile = game.files?.find((f) => f.type === "COVER");
                  const coverImage = coverFile?.path || game.coverImage;
                  const isEditing = editingId === game.id;

                  return (
                    <tr
                      key={game.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${isEditing ? "bg-orange-50/40 hover:bg-orange-50/60 border-l-2 border-l-primary" : ""}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-11 h-14 rounded overflow-hidden bg-slate-100 flex-shrink-0 border border-[#e2e8f0]">
                            {coverImage ? (
                              <Image src={coverImage} alt={game.name} fill className="object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-slate-400 text-[24px] w-full h-full flex items-center justify-center">casino</span>
                            )}
                          </div>
                          <div>
                            <div className="font-headline-sm text-[15px] font-bold text-on-surface flex items-center gap-1.5">
                              {game.name}
                              {game.year && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-metric-stat ${isEditing ? "bg-secondary/10 text-secondary border border-secondary/20" : "bg-slate-100 text-slate-500"}`}>
                                  {game.year}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-on-surface text-xs font-metric-stat">
                          <span className="material-symbols-outlined text-sm text-slate-400">group</span> {formatPlayers(game.minPlayers, game.maxPlayers)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-metric-stat mt-0.5">
                          <span className="material-symbols-outlined text-sm text-slate-400">schedule</span> {formatPlaytime(game.minPlaytime)}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-metric-stat">
                          {game.ludoRating && (
                            <span className="text-[#ff5100] flex items-center font-bold">★ {formatRating(game.ludoRating)}</span>
                          )}
                          {game.bggRating && (
                            <>
                              <span className="text-slate-400">/</span>
                              <span className="text-[#2c274b] flex items-center font-bold">★ {formatRating(game.bggRating)}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <GameRowActions
                        game={game}
                        syncing={syncing === game.id}
                        editingId={editingId}
                        onEdit={onEdit}
                        onSync={handleSync}
                        onDelete={handleDelete}
                      />
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-slate-500 font-metric-stat">
          <span>Mostrando {games.length} de {total} títulos cadastrados</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-[#cbd5e1] text-slate-600 hover:text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <span className="text-slate-600 font-medium">Página {page}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={games.length < 50}
                className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-[#cbd5e1] text-slate-600 hover:text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </section>
    </div>
  );
}