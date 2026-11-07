interface GameSummarySource {
  coverImage: string | null;
  bggRating: unknown;
  ludoRating: unknown;
  weight: unknown;
  isActive: unknown;
  files: Array<{ path: string }>;
}

interface GameSummary {
  coverImage: string | null;
  bggRating: number | null;
  ludoRating: number | null;
  weight: number | null;
  isActive: boolean;
}

export function toGameSummary<T extends GameSummarySource>(game: T): T & GameSummary {
  return {
    ...game,
    coverImage: game.files[0]?.path || game.coverImage || null,
    bggRating: game.bggRating ? Number(game.bggRating) : null,
    ludoRating: game.ludoRating ? Number(game.ludoRating) : null,
    weight: game.weight ? Number(game.weight) : null,
    isActive: Boolean(game.isActive),
  };
}

interface GameDetailSource extends GameSummarySource {
  coverImageData: unknown;
  files: Array<{ type: string; path: string; size: bigint | number }>;
}

export function resolveCoverImage(game: {
  coverImage: string | null;
  coverImageData: unknown;
  files: Array<{ type: string; path: string }>;
}): string | null {
  const coverFile = game.files.find((f) => f.type === "COVER")?.path;
  if (coverFile) return coverFile;
  if (game.coverImage) return game.coverImage;
  const data = game.coverImageData as
    | { base64?: string; mimeType?: string }
    | null
    | undefined;
  if (data && typeof data === "object" && data.base64 && data.mimeType) {
    return `data:${data.mimeType};base64,${data.base64}`;
  }
  return null;
}

export function toGameDetail<T extends GameDetailSource>(game: T) {
  return {
    ...game,
    coverImage: resolveCoverImage(game),
    bggRating: game.bggRating ? Number(game.bggRating) : null,
    ludoRating: game.ludoRating ? Number(game.ludoRating) : null,
    weight: game.weight ? Number(game.weight) : null,
    isActive: Boolean(game.isActive),
    files: game.files.map(serializeGameFile),
  };
}

export function serializeGameFile<T extends { size: bigint | number }>(
  file: T
): Omit<T, "size"> & { size: number } {
  return { ...file, size: Number(file.size) };
}

export function serializeGame<T extends { files: Array<{ size: bigint | number }> }>(
  game: T
) {
  return {
    ...game,
    files: game.files.map(serializeGameFile),
  };
}
