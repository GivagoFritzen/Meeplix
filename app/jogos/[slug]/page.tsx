import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brain, Clock, User, Users } from "lucide-react";
import { getGameBySlug } from "@/app/actions/games";
import { getDisplayPreferences } from "@/app/actions/display-preferences";
import { GameplayMetricsCards } from "@/components/public/gameplay-metrics-cards";
import { PreferenceGate } from "@/components/public/preference-gate";
import { GameDetailTabs } from "../game-detail-tabs";
import { GameEditButton } from "@/components/public/game-edit-button";
import { GameActiveToggle } from "@/components/public/game-active-toggle";
import { auth } from "@/lib/auth";
import { resolveAssetUrl, getLabelFromValue, formatRating, formatPlaytime, formatPlayers, formatPlayersCompact, formatWeight, getComplexityLabel, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface GamePageProps {
  params: Promise<{
    slug: string;
  }>;
}

type GameDetail = NonNullable<Awaited<ReturnType<typeof getGameBySlug>>>;
type DisplayPreferences = Awaited<ReturnType<typeof getDisplayPreferences>>;
type ComplexityInfo = ReturnType<typeof getComplexityLabel>;

type PollMetric = "interaction" | "luck" | "downtime" | "replayability";

const POLL_METRICS: PollMetric[] = ["interaction", "luck", "downtime", "replayability"];

function hasPollMetrics(game: GameDetail): boolean {
  return POLL_METRICS.some(
    (metric) => game[metric] !== null && game[metric] !== undefined
  );
}

function toMetricValue(value: number | null) {
  if (value === null || value === undefined) return undefined;
  return {
    value,
    label: getLabelFromValue(value),
  };
}

/** Métricas de jogabilidade embutidas no Hero, logo abaixo dos stats. Retorna null sem dados. */
function HeroGameplayMetrics({
  game,
  variant = "embedded",
}: {
  game: GameDetail;
  variant?: "embedded" | "dots";
}) {
  if (!hasPollMetrics(game)) return null;

  return (
    <div
      className={
        variant === "dots"
          ? "w-full"
          : "w-full pt-4 border-t border-slate-200"
      }
    >
      <GameplayMetricsCards
        variant={variant}
        interaction={toMetricValue(game.interaction)}
        luck={toMetricValue(game.luck)}
        downtime={toMetricValue(game.downtime)}
        replayability={toMetricValue(game.replayability)}
      />
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

/** Hero da tela de jogo no mobile, seguindo o padrão visual do mockup. */
function MobileGameHero({
  game,
  coverUrl,
  complexity,
  preferences,
  isAdmin,
}: {
  game: GameDetail;
  coverUrl: string | null;
  complexity: ComplexityInfo | null;
  preferences: DisplayPreferences;
  isAdmin: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-5 p-4"
      data-purpose="mobile-game-hero"
    >
      {/* Capa + edição */}
      <div className="relative w-full">
        <div className="relative mx-auto h-64 w-48 overflow-hidden rounded-2xl bg-slate-100 shadow-md ring-1 ring-black/5">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`Capa do jogo ${game.name}`}
              fill
              className="h-full w-full object-cover object-top"
              sizes="192px"
              priority
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
              <svg
                className="mb-2 h-12 w-12"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="text-xs">Sem Imagem</span>
            </div>
          )}
        </div>

        {isAdmin && (
          <GameEditButton
            gameId={game.id}
            className="absolute right-0 top-0 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200/80 bg-white text-[#ff5100] shadow-sm transition-all hover:bg-orange-50 active:scale-95"
          />
        )}
      </div>

      {/* Botão Slide de Ativação (Mobile) - visível apenas para admin */}
      {isAdmin && (
        <div className="w-full flex justify-center">
          <GameActiveToggle
            gameId={game.id}
            initialActive={Boolean(game.isActive)}
            gameName={game.name}
          />
        </div>
      )}

      {/* Título e créditos */}
      <div className="w-full space-y-2 text-center">
        <h2 className="text-[22px] font-extrabold tracking-tight text-[#1a202c]">
          {game.name}{" "}
          {game.year && (
            <span className="text-lg font-semibold text-slate-500">
              ({game.year})
            </span>
          )}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-600">
          <PreferenceGate hideKey="hideDesigners" preferences={preferences}>
            {game.designer && (
              <div className="flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5">
                <span className="text-slate-500">Designer:</span>
                <span className="font-medium text-slate-800">{game.designer}</span>
              </div>
            )}
          </PreferenceGate>
          <PreferenceGate hideKey="hidePublishers" preferences={preferences}>
            {game.publisher && (
              <div className="flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5">
                <span className="text-slate-500">Editora:</span>
                <span className="font-medium text-slate-800">{game.publisher}</span>
              </div>
            )}
          </PreferenceGate>
        </div>
      </div>

      {/* Rankings Ludopedia & BGG */}
      <div className="grid w-full grid-cols-2 gap-3">
        <div className="flex flex-col justify-between rounded-2xl border border-[#fae2a6] bg-gradient-to-b from-[#fffcf2] to-[#fffaf0] p-3">
          <div className="flex items-center justify-between">
            <span className="rounded bg-[#f59e0b] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
              Ludopedia
            </span>
            <div className="flex items-center gap-1">
              <StarIcon className="h-3 w-3 fill-[#f59e0b] text-[#f59e0b]" />
              <span className="text-sm font-extrabold text-slate-800">
                {game.ludoRating ? formatRating(game.ludoRating) : "-"}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1 text-left">
            <span className="text-[9.5px] font-medium text-slate-500">Rank</span>
            <span className="text-[11px] font-bold text-slate-700">
              {game.ludoRank ? `#${game.ludoRank}` : "—"}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#fed7aa] bg-gradient-to-b from-[#fffcf8] to-[#fff7f0] p-3">
          <div className="flex items-center justify-between">
            <span className="rounded bg-[#ea580c] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">
              BGG
            </span>
            <div className="flex items-center gap-1">
              <StarIcon className="h-3 w-3 fill-[#ea580c] text-[#ea580c]" />
              <span className="text-sm font-extrabold text-slate-800">
                {game.bggRating ? formatRating(game.bggRating) : "-"}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1 text-left">
            <span className="text-[9.5px] font-medium text-slate-500">Rank</span>
            <span className="text-[11px] font-bold text-slate-700">
              {game.bggRank ? `#${game.bggRank}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Métricas essenciais */}
      <div className="grid w-full grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-[#fbfcfd] p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm">
            <Users className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug text-slate-900">
              {formatPlayersCompact(game.minPlayers, game.maxPlayers)}
            </p>
            <p className="text-[9.5px] font-medium leading-tight text-slate-500">
              jogadores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-[#fbfcfd] p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm">
            <Clock className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug text-slate-900">
              {formatPlaytime(game.minPlaytime)}
            </p>
            <p className="text-[9.5px] font-medium leading-tight text-slate-500">
              duração
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-[#fbfcfd] p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm">
            <User className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug text-slate-900">
              {game.minAge ? `${game.minAge}+ anos` : "-"}
            </p>
            <p className="text-[9.5px] font-medium leading-tight text-slate-500">
              idade recomendada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-[#fbfcfd] p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-500 shadow-sm">
            <Brain className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[13px] font-bold leading-snug text-slate-900">
                {game.weight ? formatWeight(game.weight) : "-"}
              </span>
              {game.weight && (
                <span className="text-[9.5px] font-medium text-slate-400">/ 5</span>
              )}
            </div>
            <p className="text-[9.5px] font-medium leading-tight text-slate-500">
              {complexity?.label || "complexidade"}
            </p>
          </div>
        </div>
      </div>

      {/* Interação, sorte, downtime e rejogabilidade */}
      <HeroGameplayMetrics game={game} variant="dots" />
    </div>
  );
}

export async function generateMetadata(props: GamePageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return {
      title: "Jogo não encontrado - Meeplix",
    };
  }

  const coverUrl = resolveAssetUrl(game.coverImage);
  const gameTitle = game.year ? `${game.name} (${game.year})` : game.name;
  const title = `${gameTitle} - Meeplix`;
  const description = game.description?.substring(0, 160) || `Detalhes e informações de ${game.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: coverUrl ? [{ url: coverUrl }] : [],
    },
  };
}

export default async function GameDetailPage(props: GamePageProps) {
  const { slug } = await props.params;
  const game = await getGameBySlug(slug);
  const session = await auth();
  const preferences = await getDisplayPreferences();

  if (!game) {
    notFound();
  }

  // Redireciona para o slug canônico caso acesse pelo id
  const canonicalSlug = slugify(game.name);
  if (slug === game.id && canonicalSlug) {
    redirect(`/jogos/${canonicalSlug}`);
  }

  const coverUrl = resolveAssetUrl(game.coverImage);
  const complexity = game.weight ? getComplexityLabel(game.weight) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col selection:bg-orange-500/20 selection:text-orange-900 antialiased">
      {/* BEGIN: NavigationBar */}
      <header className="w-full bg-[#2c274b] text-white shadow-header border-b border-[#3c365c] sticky top-0 z-40">
        {/* Mobile Navbar (sm:hidden) */}
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-2 sm:hidden">
          <Link
            href="/colecao"
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#f39c12] transition-opacity hover:opacity-80"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Jogos
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold tracking-tight text-white/95">
            {game.name}
          </h1>
          <div className="flex w-12 shrink-0 justify-end">
            {session?.user && (
              <Link
                href="/admin/login"
                className="inline-flex items-center rounded-lg px-1 py-0.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        {/* Desktop Navbar (hidden sm:flex) */}
        <div className="hidden sm:flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 items-center justify-between">
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm font-medium">
            <Link
              href="/colecao"
              className="text-slate-300 hover:text-orange-400 transition-colors flex items-center gap-1.5"
              title="Início"
            >
              <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="sr-only">Início</span>
            </Link>
            <span className="text-slate-500">/</span>
            <Link href="/colecao" className="text-orange-400 hover:underline">
              Jogos
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-white font-semibold truncate max-w-xs sm:max-w-md">
              {game.name}
            </span>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/colecao"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 text-xs font-medium transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Voltar para Coleção</span>
            </Link>
            {session?.user && (
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>
      {/* END: NavigationBar */}

      <main className="flex-1 max-w-md sm:max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 w-full space-y-4 sm:space-y-6">
        {/* BEGIN: HeroCard */}
        <section
          className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm sm:rounded-2xl sm:border-slate-200/80"
          data-purpose="game-hero-card"
        >
          {/* Ambient light effects */}
          <div className="absolute -top-32 -left-20 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* MOBILE HERO (sm:hidden) */}
          <div className="sm:hidden">
            <MobileGameHero
              game={game}
              coverUrl={coverUrl}
              complexity={complexity}
              preferences={preferences}
              isAdmin={Boolean(session?.user)}
            />
          </div>

          {/* DESKTOP HERO (hidden sm:flex) */}
          <div className="relative hidden w-full min-w-0 flex-col gap-5 p-4 sm:flex sm:p-6 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-stretch lg:gap-8 lg:p-8">
            {/* A coluna da capa acompanha a altura real do conteúdo, sem largura fixa. */}
            <div className="flex min-w-0 flex-col items-center space-y-3.5 lg:items-stretch">
              <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-md lg:aspect-[4/5] lg:h-full lg:w-auto">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={`Capa do jogo ${game.name}`}
                    fill
                    className="w-full h-full object-cover object-left-top transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 40vw, 100vw"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                    <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <span className="text-xs">Sem Imagem</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Column */}
            <div className="flex min-w-0 flex-col gap-6">
              {/* Title & Credits */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 flex flex-wrap items-baseline gap-2.5">
                      <span>{game.name}</span>
                      {game.year && (
                        <span className="text-xl sm:text-2xl font-normal text-slate-500">
                          ({game.year})
                        </span>
                      )}
                    </h1>

                    {game.originalName && game.originalName !== game.name && (
                      <p className="text-xs text-slate-500 mt-1">
                        Nome original:{" "}
                        <span className="text-slate-800 font-medium">{game.originalName}</span>
                      </p>
                    )}
                  </div>
                  {session?.user && (
                    <div className="flex items-center gap-2.5 shrink-0">
                      <GameActiveToggle
                        gameId={game.id}
                        initialActive={Boolean(game.isActive)}
                        gameName={game.name}
                      />
                      <GameEditButton
                        gameId={game.id}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#ff5100]/20 bg-[#ff5100]/10 hover:bg-[#ff5100]/20 text-[#ff5100] text-xs font-medium transition active:scale-[0.98]"
                      />
                    </div>
                  )}
                </div>

                {/* Credits section */}
                <div className="mt-4 space-y-1.5 text-sm">
                  <PreferenceGate hideKey="hideDesigners" preferences={preferences}>
                    {game.designer && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-slate-800 font-medium">{game.designer}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          Designer
                        </span>
                      </div>
                    )}
                  </PreferenceGate>

                  <PreferenceGate hideKey="hidePublishers" preferences={preferences}>
                    {game.publisher && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-slate-800 font-medium">{game.publisher}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          Editoras
                        </span>
                      </div>
                    )}
                  </PreferenceGate>

                  <PreferenceGate hideKey="hideArtists" preferences={preferences}>
                    {game.artist && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-slate-800 font-medium">{game.artist}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          Artista
                        </span>
                      </div>
                    )}
                  </PreferenceGate>
                </div>

                {/* Categories & Mechanics chips */}
                <PreferenceGate hideKey="hideTags" preferences={preferences}>
                  {(game.categories.length > 0 || game.mechanics.length > 0) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {game.categories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                        >
                          {cat}
                        </span>
                      ))}
                      {game.mechanics.map((mec) => (
                        <span
                          key={mec}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-[#f1edf7] text-[#3a3356] border border-[#ddd7eb] font-medium"
                        >
                          {mec}
                        </span>
                      ))}
                    </div>
                  )}
                </PreferenceGate>
              </div>

              {/* Stats & Attributes Grid */}
              <div className="pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Players Stat */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 tracking-tight">
                      {formatPlayers(game.minPlayers, game.maxPlayers)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {game.bestPlayers && (
                        <span className="text-[10px] text-orange-600 font-medium">(BGG: {game.bestPlayers} ideal)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Duration Stat */}
                <div className="flex items-center gap-3 border-l border-slate-100 pl-2 sm:pl-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 tracking-tight">
                      {formatPlaytime(game.minPlaytime)}
                    </p>
                    <p className="text-xs text-slate-500">duração</p>
                  </div>
                </div>

                {/* Age Stat */}
                <div className="flex items-center gap-3 border-l border-slate-100 pl-2 sm:pl-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900 tracking-tight">
                      {game.minAge ? `${game.minAge}+` : "-"}
                    </p>
                    <p className="text-xs text-slate-500">idade recomendada</p>
                  </div>
                </div>

                {/* Complexity Stat */}
                <div className="flex items-center gap-3 border-l border-slate-100 pl-2 sm:pl-4">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600">
                    <Brain className="w-6 h-6" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-base font-bold text-slate-900 tracking-tight">
                        {game.weight ? formatWeight(game.weight) : "-"}
                      </p>
                      {game.weight && <span className="text-[11px] text-slate-500">/ 5</span>}
                    </div>
                    <p className="text-xs text-slate-500">complexidade</p>
                    <span className="text-[10px] text-orange-600 font-medium block">
                      BGG Weight: {complexity?.label || "Leve"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Métricas de jogabilidade */}
              <HeroGameplayMetrics game={game} />

              {/* Bottom Evaluation & Rank Strip */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {/* Ludopedia Rating & Rank */}
                  <div className="flex items-center gap-3 p-2 px-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white uppercase tracking-wide">
                        Ludopedia
                      </span>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-5 h-5 text-amber-500 fill-amber-500" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xl font-black text-amber-950">
                          {game.ludoRating ? formatRating(game.ludoRating) : "-"}
                        </span>
                      </div>
                    </div>
                    <div className="border-l border-amber-200/80 pl-2.5 text-xs text-amber-900/80">
                      <p className="font-medium text-amber-950">Ludopedia</p>
                      {game.ludoRank && (
                        <p className="text-[11px] text-amber-800">Rank #{game.ludoRank}</p>
                      )}
                    </div>
                  </div>

                  {/* BGG Scraped Rating & Rank */}
                  <div className="flex items-center gap-3 p-2 px-3 rounded-xl bg-orange-50/70 border border-orange-200/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#ff5100] text-white uppercase tracking-wider">
                        BGG
                      </span>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-5 h-5 text-[#ff5100] fill-[#ff5100]" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xl font-black text-orange-950">
                          {game.bggRating ? formatRating(game.bggRating) : "-"}
                        </span>
                      </div>
                    </div>
                    <div className="border-l border-orange-200/80 pl-2.5 text-xs">
                      <p className="text-orange-950 font-medium">BoardGameGeek</p>
                      {game.bggRank && (
                        <p className="text-[11px] text-orange-800">Rank #{game.bggRank}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* END: HeroCard */}

        <GameDetailTabs game={game} />
      </main>
    </div>
  );
}
