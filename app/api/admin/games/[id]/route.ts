import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { GameUpdateSchema } from "@/lib/validations/game";
import { parseCoverImage, stringifyCoverImage } from "@/lib/cover-image";

export async function GET(
  request: NextRequest,
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

  const serialized = {
    ...game,
    files: game.files.map((f) => ({ ...f, size: Number(f.size) })),
  };

  return NextResponse.json(serialized);
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

    let coverImageData: { base64: string; mimeType: string } | null | undefined;
    let coverImage: string | null | undefined;
    if (data.coverImage !== undefined) {
      coverImageData = parseCoverImage(data.coverImage);
      coverImage = stringifyCoverImage(
        data.coverImage?.startsWith("data:") ? undefined : data.coverImage ?? null,
        coverImageData
      );
    }

    const game = await prisma.game.update({
      where: { id },
      data: {
        ...data,
        ...(data.coverImage !== undefined && {
          coverImageData: coverImageData ?? Prisma.JsonNull,
          coverImage,
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
  request: NextRequest,
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