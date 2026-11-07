"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export async function deleteGameFiles(fileIds: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");

  const uniqueIds = Array.from(new Set(fileIds.filter(Boolean)));
  if (uniqueIds.length === 0) return { success: true, deleted: [] as string[] };

  const files = await prisma.gameFile.findMany({
    where: { id: { in: uniqueIds } },
  });

  const deleted: string[] = [];
  const failed: string[] = [];
  const coverPathsByGame = new Map<string, string[]>();

  for (const file of files) {
    if (file.type === "COVER") {
      const paths = coverPathsByGame.get(file.gameId) ?? [];
      paths.push(file.path);
      coverPathsByGame.set(file.gameId, paths);
    }
  }

  for (const file of files) {
    try {
      await deleteFile(file.path);
      await prisma.gameFile.delete({ where: { id: file.id } });
      deleted.push(file.id);
    } catch {
      failed.push(file.id);
    }
  }

  // Se a capa atual apontava para um arquivo removido, limpa a referência.
  for (const [gameId, paths] of Array.from(coverPathsByGame.entries())) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { coverImage: true },
    });
    if (game?.coverImage && paths.includes(game.coverImage)) {
      await prisma.game.update({
        where: { id: gameId },
        data: { coverImage: null },
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/jogos");

  if (failed.length > 0) {
    throw new Error(
      `Não foi possível remover ${failed.length} arquivo(s). Tente novamente.`
    );
  }

  return { success: true, deleted };
}