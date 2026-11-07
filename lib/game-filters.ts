import type { Prisma } from "@prisma/client";
import type { GameFilterInput } from "@/lib/validations/game";

const PLAYER_RANGES = {
  solo: { min: 1, max: 1 },
  "2": { min: 2, max: 2 },
  "3-4": { min: 3, max: 4 },
  "5+": { min: 5, max: null },
} as const;

const DURATION_FILTERS: Record<string, Prisma.GameWhereInput> = {
  quick: { minPlaytime: { lte: 30 } },
  medium: { minPlaytime: { gte: 30, lte: 60 } },
  long: { minPlaytime: { gte: 90 } },
};

const COMPLEXITY_FILTERS: Record<string, Prisma.GameWhereInput> = {
  light: { weight: { lt: 2.0 } },
  medium: { weight: { gte: 2.0, lt: 3.0 } },
  heavy: { weight: { gte: 3.0 } },
};

function buildSearchCondition(search: string): Prisma.GameWhereInput[] {
  return [
    { name: { contains: search, mode: "insensitive" } },
    { originalName: { contains: search, mode: "insensitive" } },
    { designer: { contains: search, mode: "insensitive" } },
    { publisher: { contains: search, mode: "insensitive" } },
    { mechanics: { hasSome: [search] } },
  ];
}

function buildPlayerConditions(filters: GameFilterInput): Prisma.GameWhereInput[] {
  const conditions: Prisma.GameWhereInput[] = [];
  const { players, minPlayers, maxPlayers } = filters;

  if (players && players !== "all") {
    const range = PLAYER_RANGES[players];
    if (range.min > 1) conditions.push({ maxPlayers: { gte: range.min } });
    if (range.max !== null) conditions.push({ minPlayers: { lte: range.max } });
  }

  // Compatibilidade: mínimo/máximo explícitos (ex.: "suporta pelo menos N jogadores")
  if (minPlayers) {
    const n = parseInt(minPlayers, 10);
    if (!isNaN(n)) conditions.push({ maxPlayers: { gte: n } });
  }
  if (maxPlayers) {
    const n = parseInt(maxPlayers, 10);
    if (!isNaN(n)) conditions.push({ minPlayers: { lte: n } });
  }

  return conditions;
}

/**
 * Monta o `where` do Prisma a partir dos filtros de busca de jogos.
 * Compartilhado entre a página pública e a listagem administrativa.
 */
export function buildGameWhere(filters: GameFilterInput): Prisma.GameWhereInput {
  const where: Prisma.GameWhereInput = {};

  if (filters.search) {
    where.OR = buildSearchCondition(filters.search);
  }

  const playerConditions = buildPlayerConditions(filters);
  if (playerConditions.length > 0) {
    where.AND = playerConditions;
  }

  if (filters.duration && filters.duration !== "all") {
    Object.assign(where, DURATION_FILTERS[filters.duration]);
  }

  if (filters.complexity && filters.complexity !== "all") {
    Object.assign(where, COMPLEXITY_FILTERS[filters.complexity]);
  }

  if (filters.mechanic && filters.mechanic !== "all") {
    where.mechanics = { has: filters.mechanic };
  }

  return where;
}
