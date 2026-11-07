import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { GameUpdateSchema } from "@/lib/validations/game";
import { buildCoverImageData } from "@/lib/cover-image";
import { serializeGame } from "@/lib/game-mappers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id },
    include: { files: true },
  });

  if (!game) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }

  return NextResponse.json(serializeGame(game));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = GameUpdateSchema.parse(body);

    const cover = data.coverImage !== undefined ? buildCoverImageData(data.coverImage) : null;

    const game = await prisma.game.update({
      where: { id },
      data: {
        ...data,
        ...(cover && {
          coverImageData: cover.coverImageData ?? Prisma.JsonNull,
          coverImage: cover.coverImage,
        }),
        links: data.links || { bgg: "", ludopedia: "", manual: "" },
      },
    });

    return NextResponse.json(game);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao atualizar jogo" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.game.delete({ where: { id } });

  return NextResponse.json({ success: true });
}