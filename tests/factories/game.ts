import { PrismaClient } from "@prisma/client";

export interface TestGameInput {
  name: string;
  originalName?: string | null;
  description?: string | null;
  year?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  minPlaytime?: number | null;
  publisher?: string | null;
  designer?: string | null;
  artist?: string | null;
  bggRating?: number | null;
  ludoRating?: number | null;
  bggRank?: number | null;
  ludoRank?: number | null;
  weight?: number | null;
  bestPlayers?: number | null;
  minAge?: number | null;
  notes?: string | null;
  coverImage?: string | null;
  mechanics?: string[];
  categories?: string[];
  links?: { bgg?: string | null; ludopedia?: string | null; manual?: string | null };
  preparationText?: string | null;
}

export function buildGameInput(overrides: Partial<TestGameInput> = {}): TestGameInput {
  return {
    name: overrides.name ?? "Test Game",
    originalName: overrides.originalName ?? null,
    description: overrides.description ?? null,
    year: overrides.year ?? 2020,
    minPlayers: overrides.minPlayers ?? 1,
    maxPlayers: overrides.maxPlayers ?? 4,
    minPlaytime: overrides.minPlaytime ?? 30,
    publisher: overrides.publisher ?? null,
    designer: overrides.designer ?? null,
    artist: overrides.artist ?? null,
    bggRating: overrides.bggRating ?? null,
    ludoRating: overrides.ludoRating ?? null,
    bggRank: overrides.bggRank ?? null,
    ludoRank: overrides.ludoRank ?? null,
    weight: overrides.weight ?? null,
    bestPlayers: overrides.bestPlayers ?? null,
    minAge: overrides.minAge ?? null,
    notes: overrides.notes ?? null,
    coverImage: overrides.coverImage ?? null,
    mechanics: overrides.mechanics ?? [],
    categories: overrides.categories ?? [],
    links: overrides.links ?? { bgg: null, ludopedia: null, manual: null },
    preparationText: overrides.preparationText ?? null,
  };
}

export async function createTestGame(
  prisma: PrismaClient,
  overrides: Partial<TestGameInput> = {},
) {
  const input = buildGameInput(overrides);

  return prisma.game.create({
    data: {
      name: input.name,
      originalName: input.originalName,
      description: input.description,
      year: input.year,
      minPlayers: input.minPlayers,
      maxPlayers: input.maxPlayers,
      minPlaytime: input.minPlaytime,
      publisher: input.publisher,
      designer: input.designer,
      artist: input.artist,
      bggRating: input.bggRating,
      ludoRating: input.ludoRating,
      bggRank: input.bggRank,
      ludoRank: input.ludoRank,
      weight: input.weight,
      bestPlayers: input.bestPlayers,
      minAge: input.minAge,
      notes: input.notes,
      coverImage: input.coverImage,
      mechanics: input.mechanics,
      categories: input.categories,
      links: input.links ?? {},
      preparationText: input.preparationText,
    },
  });
}

export async function createTestGames(
  prisma: PrismaClient,
  count: number,
  baseOverrides: Partial<TestGameInput> = {},
) {
  const games = [];
  for (let i = 0; i < count; i += 1) {
    games.push(
      await createTestGame(prisma, {
        ...baseOverrides,
        name: `${baseOverrides.name || "Game"} ${i + 1}`,
      }),
    );
  }
  return games;
}
