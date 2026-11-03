import { Suspense } from "react";
import { getGames } from "@/app/actions/games";
import { getDisplayPreferences } from "@/app/actions/display-preferences";
import { SearchBar } from "@/components/public/search-bar";
import { FilterBar } from "@/components/public/filter-bar";
import { SortSelector } from "@/components/public/sort-selector";
import { GameGrid } from "@/components/public/game-grid";
import { PublicHeader } from "@/components/shared/header";

export const dynamic = "force-dynamic";

const SKELETON_CARDS = Array.from({ length: 24 }, (_, index) => `skeleton-${index}`);

interface HomePageProps {
  searchParams: Promise<{
    search?: string;
    players?: string;
    minPlayers?: string;
    duration?: string;
    complexity?: string;
    mechanic?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

async function GameList({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const [gamesResult, preferences] = await Promise.all([
    getGames({
      search: params.search,
      players: params.players as "all" | "solo" | "2" | "3-4" | "5+" | undefined,
      duration: params.duration as "all" | "quick" | "medium" | "long" | undefined,
      complexity: params.complexity as "all" | "light" | "medium" | "heavy" | undefined,
      mechanic: params.mechanic,
      sort: params.sort as "name" | "year" | "bggRating" | "ludoRating" | "weight" | undefined,
      order: params.order as "asc" | "desc" | undefined,
      page: parseInt(params.page || "1"),
      limit: 24,
    }),
    getDisplayPreferences(),
  ]);

  const { games, total, page, totalPages } = gamesResult;

  return (
    <section className="space-y-space-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
        <div>
          <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Todos os Jogos da Coleção</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Exibindo {games.length} de {total} títulos
          </p>
        </div>
        <div className="text-body-sm text-on-surface-variant font-metric-stat">
          Página {page} de {totalPages}
        </div>
      </div>
      <GameGrid games={games} preferences={preferences} />
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <a
              href={`/colecao?${new URLSearchParams({ ...params, page: String(page - 1) }).toString()}`}
              className="btn-secondary text-sm"
            >
              Anterior
            </a>
          )}
          {page < totalPages && (
            <a
              href={`/colecao?${new URLSearchParams({ ...params, page: String(page + 1) }).toString()}`}
              className="btn-secondary text-sm"
            >
              Próxima
            </a>
          )}
        </div>
      )}
    </section>
  );
}

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <>
      <PublicHeader />
      <main className="page-container">
        <section className="section-card space-y-space-md">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
            <SearchBar />
          </div>
          <FilterBar>
            <SortSelector />
          </FilterBar>
        </section>
        <Suspense fallback={<div className="game-grid">{SKELETON_CARDS.map((key) => <div key={key} className="animate-pulse card-elevation-lg aspect-[4/3]" />)}</div>}>
          <GameList searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}