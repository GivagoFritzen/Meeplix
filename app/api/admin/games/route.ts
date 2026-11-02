import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { GameCreateSchema, GameUpdateSchema, GameFilterSchema } from "@/lib/validations/game";
import type { GameFilterInput } from "@/lib/validations/game";
import { parseCoverImage, stringifyCoverImage } from "@/lib/cover-image";
import { buildGameWhere } from "@/lib/game-filters";

function parseGameFilters(searchParams: URLSearchParams): GameFilterInput {
  return GameFilterSchema.parse({
    search: searchParams.get("search") || undefined,
    players: searchParams.get("players") || undefined,
    minPlayers: searchParams.get("minPlayers") || undefined,
    maxPlayers: searchParams.get("maxPlayers") || undefined,
    duration: searchParams.get("duration") || undefined,
    complexity: searchParams.get("complexity") || undefined,
    mechanic: searchParams.get("mechanic") || undefined,
    sort: searchParams.get("sort") || undefined,
    order: searchParams.get("order") || undefined,
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

  const validated = parseGameFilters(searchParams);
  const where = buildGameWhere(validated);

  const sort = validated.sort ?? "name";
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (sort.startsWith("-")) {
    orderBy[sort.slice(1)] = "desc";
  } else {
    orderBy[sort] = "asc";
  }

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        files: { where: { type: "COVER" }, take: 1 },
      },
    }),
    prisma.game.count({ where }),
  ]);

  const serialized = games.map((g) => ({
    ...g,
    files: g.files.map((f) => ({ ...f, size: Number(f.size) })),
  }));

  return NextResponse.json({ games: serialized, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = GameCreateSchema.parse(body);

    // Processar coverImage - converter data URI para JSON ou manter URL
    const coverImageData = parseCoverImage(data.coverImage);
    const coverImage = stringifyCoverImage(
      data.coverImage?.startsWith("data:") ? undefined : data.coverImage ?? null,
      coverImageData
    );

    const processedData = {
      ...data,
      coverImageData: coverImageData ?? Prisma.JsonNull,
      coverImage,
      links: data.links || { bgg: "", ludopedia: "", manual: "" },
    };

    const game = await prisma.game.create({
      data: processedData,
    });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar jogo" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("id");

    if (!gameId) {
      return NextResponse.json({ error: "ID do jogo é obrigatório"}, { status: 400 });
    }

    const body = await request.json();
    const data = GameUpdateSchema.parse(body);

    // Processar coverImage - converter data URI para JSON ou manter URL
    // Apenas processa se coverImage foi enviado (update parcial)
    let coverImageData: { base64: string; mimeType: string } | null | undefined;
    let coverImage: string | null | undefined;
    if (data.coverImage !== undefined) {
      coverImageData = parseCoverImage(data.coverImage);
      coverImage = stringifyCoverImage(
        data.coverImage?.startsWith("data:") ? undefined : data.coverImage ?? null,
        coverImageData
      );
    }

    // Se estiver substituindo a capa, o antigo fica por conta da aplicação
    // (não há arquivos de imagem no filesystem para excluir, apenas dados no DB)

    const processedData = {
      ...data,
      ...(data.coverImage !== undefined && {
        coverImageData: coverImageData ?? Prisma.JsonNull,
        coverImage,
      }),
      links: data.links || undefined,
    };

    const game = await prisma.game.update({
      where: { id: gameId },
      data: processedData,
    });

    return NextResponse.json(game, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao atualizar jogo" }, { status: 500 });
  }
}