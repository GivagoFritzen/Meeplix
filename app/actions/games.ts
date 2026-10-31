"use server";

import { prisma } from "@/lib/prisma";
import { GameCreateSchema, GameUpdateSchema, GameFilterSchema } from "@/lib/validations/game";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify } from "@/lib/utils";
import { buildGameWhere } from "@/lib/game-filters";

export async function createGame(data: z.infer<typeof GameCreateSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");

  const validated = GameCreateSchema.parse(data);

  const { mechanics, categories, links, ...gameData } = validated;

  const game = await prisma.game.create({
    data: {
      ...gameData,
      mechanics: mechanics || [],
      categories: categories || [],
      links: links || {},
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/jogos");

  return { success: true, game };
}

export async function updateGame(id: string, data: z.infer<typeof GameUpdateSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");

  const validated = GameUpdateSchema.parse(data);

  const { mechanics, categories, links, ...gameData } = validated;

  const game = await prisma.game.update({
    where: { id },
    data: {
      ...gameData,
      ...(mechanics !== undefined && { mechanics }),
      ...(categories !== undefined && { categories }),
      ...(links !== undefined && { links }),
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/jogos");

  return { success: true, game };
}

export async function deleteGame(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");

  await prisma.game.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/jogos");

  return { success: true };
}

export async function getGames(filters?: z.infer<typeof GameFilterSchema>) {
  const validated = GameFilterSchema.parse(filters || {});
  const { sort = "name", order = "asc", page = 1, limit = 24 } = validated;

  const where = buildGameWhere(validated);
  const orderBy: Record<string, "asc" | "desc"> = { [sort]: order };

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        files: {
          where: { type: "COVER" },
          take: 1,
        },
      },
    }),
    prisma.game.count({ where }),
  ]);

  return {
    games: games.map((g) => ({
      ...g,
      coverImage: g.files[0]?.path || g.coverImage || null,
      bggRating: g.bggRating ? Number(g.bggRating) : null,
      ludoRating: g.ludoRating ? Number(g.ludoRating) : null,
      weight: g.weight ? Number(g.weight) : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getGameById(id: string) {
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      files: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!game) return null;

  return mapGameDetail(game);
}

interface GameDetailSource {
  coverImage: string | null;
  coverImageData: unknown;
  bggRating: unknown;
  ludoRating: unknown;
  weight: unknown;
  files: Array<{ type: string; path: string; size: bigint | number }>;
}

function resolveCoverImage(game: {
  coverImage: string | null;
  coverImageData: unknown;
  files: Array<{ type: string; path: string }>;
}): string | null {
  const coverFile = game.files.find((f) => f.type === "COVER")?.path;
  if (coverFile) return coverFile;
  if (game.coverImage) return game.coverImage;
  const data = game.coverImageData as { base64?: string; mimeType?: string } | null | undefined;
  if (data && typeof data === "object" && data.base64 && data.mimeType) {
    return `data:${data.mimeType};base64,${data.base64}`;
  }
  return null;
}

/** Normaliza um jogo (com arquivos) para o formato consumido pela UI. */
function mapGameDetail<T extends GameDetailSource>(game: T) {
  return {
    ...game,
    coverImage: resolveCoverImage(game),
    bggRating: game.bggRating ? Number(game.bggRating) : null,
    ludoRating: game.ludoRating ? Number(game.ludoRating) : null,
    weight: game.weight ? Number(game.weight) : null,
    files: game.files.map((f) => ({
      ...f,
      size: Number(f.size),
    })),
  };
}

function matchesSlug(
  game: { name: string; originalName: string | null },
  slug: string
): boolean {
  if (slugify(game.name) === slug) return true;
  return game.originalName !== null && slugify(game.originalName) === slug;
}

export async function getGameBySlug(slug: string) {
  const decodedSlug = decodeURIComponent(slug).trim().toLowerCase();
  const filesInclude = {
    files: {
      orderBy: { uploadedAt: "desc" as const },
    },
  };

  // 1. Try finding by ID first
  const gameById = await prisma.game.findUnique({
    where: { id: decodedSlug },
    include: filesInclude,
  });

  if (gameById) return mapGameDetail(gameById);

  // 2. Candidate search with slug words
  const words = decodedSlug.split("-").filter(Boolean);
  const candidates = await prisma.game.findMany({
    where: words.length > 0 ? {
      OR: words.map((w) => ({
        name: { contains: w, mode: "insensitive" },
      })),
    } : undefined,
    include: filesInclude,
  });

  let match = candidates.find((g) => matchesSlug(g, decodedSlug));

  // 3. Fallback: all games search
  if (!match) {
    const allGames = await prisma.game.findMany({ include: filesInclude });
    match = allGames.find((g) => matchesSlug(g, decodedSlug));
  }

  return match ? mapGameDetail(match) : null;
}

export async function searchGames(query: string, limit = 10) {
  if (!query.trim()) return [];

  const games = await prisma.game.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { originalName: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    orderBy: { name: "asc" },
    select: { id: true, name: true, year: true, coverImage: true },
  });

  return games;
}