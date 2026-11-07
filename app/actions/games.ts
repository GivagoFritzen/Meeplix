"use server";

import { prisma } from "@/lib/prisma";
import { GameFilterSchema } from "@/lib/validations/game";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify } from "@/lib/utils";
import { buildGameWhere } from "@/lib/game-filters";
import { toGameDetail, toGameSummary } from "@/lib/game-mappers";

export async function toggleGameActive(id: string, active: boolean) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");

  if (active) {
    await prisma.$transaction([
      prisma.game.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      }),
      prisma.game.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);
  } else {
    await prisma.game.update({
      where: { id },
      data: { isActive: false },
    });
  }

  const game = await prisma.game.findUnique({
    where: { id },
    select: { name: true },
  });

  revalidatePath("/");
  revalidatePath("/colecao");
  revalidatePath("/admin");
  revalidatePath("/admin/jogos");
  if (game?.name) {
    const slug = slugify(game.name);
    if (slug) revalidatePath(`/jogos/${slug}`);
  }
  revalidatePath(`/jogos/${id}`);

  return { success: true, isActive: active };
}

export async function getGames(filters?: z.infer<typeof GameFilterSchema>) {
  const validated = GameFilterSchema.parse(filters || {});
  const { sort = "name", order = "asc", page = 1, limit = 24 } = validated;

  const where = buildGameWhere(validated);
  const orderBy: Record<string, "asc" | "desc"> = { [sort]: order };

  const filesInclude = {
    files: {
      where: { type: "COVER" as const },
      take: 1,
    },
  };

  const activeGame = await prisma.game.findFirst({
    where: { isActive: true },
    include: filesInclude,
  });

  if (!activeGame) {
    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: filesInclude,
      }),
      prisma.game.count({ where }),
    ]);

    return {
      games: games.map(toGameSummary),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Jogo ativo encontrado: ele deve sempre vir fixado como primeiro
  const [activeMatchesCount, totalMatching] = await Promise.all([
    prisma.game.count({
      where: {
        AND: [where, { id: activeGame.id }],
      },
    }),
    prisma.game.count({ where }),
  ]);

  const activeMatches = activeMatchesCount > 0;
  const total = activeMatches ? totalMatching : totalMatching + 1;
  const totalPages = Math.ceil(total / limit);

  const otherWhere = {
    AND: [where, { id: { not: activeGame.id } }],
  };

  if (page === 1) {
    const otherGames = limit > 1
      ? await prisma.game.findMany({
          where: otherWhere,
          orderBy,
          skip: 0,
          take: limit - 1,
          include: filesInclude,
        })
      : [];
    return {
      games: [toGameSummary(activeGame), ...otherGames.map(toGameSummary)],
      total,
      page,
      totalPages,
    };
  }

  const skip = (page - 1) * limit - 1;
  const otherGames = await prisma.game.findMany({
    where: otherWhere,
    orderBy,
    skip: Math.max(0, skip),
    take: limit,
    include: filesInclude,
  });

  return {
    games: otherGames.map(toGameSummary),
    total,
    page,
    totalPages,
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

  if (gameById) return toGameDetail(gameById);

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

  return match ? toGameDetail(match) : null;
}
