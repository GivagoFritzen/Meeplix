import { PrismaClient } from "@prisma/client";

export interface TestGameFileInput {
  gameId: string;
  originalName: string;
  displayName: string;
  mimeType: string;
  extension: string;
  size: number | bigint;
  path: string;
  type?: "COVER" | "MANUAL" | "RULEBOOK" | "ERRATA" | "QUICK_REFERENCE" | "IMAGE" | "OTHER";
}

export function buildGameFileInput(
  gameId: string,
  overrides: Partial<TestGameFileInput> = {},
): TestGameFileInput {
  return {
    gameId,
    originalName: overrides.originalName ?? "manual.pdf",
    displayName: overrides.displayName ?? "Manual do Jogo",
    mimeType: overrides.mimeType ?? "application/pdf",
    extension: overrides.extension ?? "pdf",
    size: overrides.size ?? 1024,
    path: overrides.path ?? `games/${gameId}/file.pdf`,
    type: overrides.type ?? "OTHER",
  };
}

export async function createTestGameFile(
  prisma: PrismaClient,
  gameId: string,
  overrides: Partial<TestGameFileInput> = {},
) {
  const input = buildGameFileInput(gameId, overrides);

  return prisma.gameFile.create({
    data: {
      gameId: input.gameId,
      originalName: input.originalName,
      displayName: input.displayName,
      mimeType: input.mimeType,
      extension: input.extension,
      size: BigInt(input.size),
      path: input.path,
      type: input.type,
    },
  });
}
