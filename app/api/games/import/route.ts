import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GameImportRequestSchema } from "@/lib/validations/game-import";
import { fetchBggGame, type ImportedGameData } from "@/lib/integrations/bgg";
import { fetchLudopediaGame } from "@/lib/integrations/ludopedia";
import type { Game } from "@prisma/client";

type ImportSourceStatus = "success" | "failed" | "not_requested";

interface ImportedLinks {
  bgg?: string;
  ludopedia?: string;
}

interface MergeResult {
  data: ImportedGameData & { links: ImportedLinks };
  sources: {
    ludopedia: ImportSourceStatus;
    bgg: ImportSourceStatus;
  };
  warnings: string[];
  errors?: { ludopedia?: string; bgg?: string };
}

interface SourceResult {
  success: ImportedGameData | null;
  error: string | null;
}

const LUDOPEDIA_FIELDS = [
  "name",
  "originalName",
  "description",
  "year",
  "minPlayers",
  "maxPlayers",
  "minPlaytime",
  "publisher",
  "designer",
  "artist",
  "ludoRating",
  "ludoRank",
  "coverImage",
  "bestPlayers",
  "minAge",
  "interaction",
  "luck",
  "downtime",
  "replayability",
] as const satisfies readonly (keyof ImportedGameData)[];

const BGG_FIELDS = [
  "description",
  "year",
  "minPlayers",
  "maxPlayers",
  "minAge",
  "publisher",
  "designer",
  "artist",
  "bggRating",
  "bggRank",
  "weight",
  "interaction",
  "luck",
  "downtime",
  "replayability",
] as const satisfies readonly (keyof ImportedGameData)[];

const UPDATE_FIELDS = [
  "name",
  "originalName",
  "description",
  "year",
  "minPlayers",
  "maxPlayers",
  "minPlaytime",
  "publisher",
  "designer",
  "artist",
  "bggRating",
  "ludoRating",
  "bggRank",
  "ludoRank",
  "weight",
  "bestPlayers",
  "minAge",
  "coverImage",
  "interaction",
  "luck",
  "downtime",
  "replayability",
] as const satisfies readonly (keyof ImportedGameData)[];

function createEmptyGameData(): ImportedGameData {
  return {
    name: undefined,
    originalName: undefined,
    description: undefined,
    year: undefined,
    minPlayers: undefined,
    maxPlayers: undefined,
    minPlaytime: undefined,
    publisher: undefined,
    designer: undefined,
    artist: undefined,
    bggRating: undefined,
    ludoRating: undefined,
    bggRank: undefined,
    ludoRank: undefined,
    weight: undefined,
    interaction: undefined,
    luck: undefined,
    downtime: undefined,
    replayability: undefined,
    bestPlayers: undefined,
    minAge: undefined,
    coverImage: undefined,
    mechanics: [],
    categories: [],
    sourceUrl: undefined,
  };
}

function hasImportedName(data: ImportedGameData | null): data is ImportedGameData {
  return data != null && data.name != null;
}

function applyField<K extends keyof ImportedGameData>(
  target: ImportedGameData,
  source: ImportedGameData,
  key: K,
  overwrite: boolean,
  nullIsUnset = false
): void {
  if (!overwrite) {
    const current = target[key];
    const isUnset = current === undefined || (nullIsUnset && current === null);
    if (!isUnset) return;
  }
  const value = source[key];
  if (value !== undefined) {
    target[key] = value;
  }
}

function applyFields(
  target: ImportedGameData,
  source: ImportedGameData,
  keys: readonly (keyof ImportedGameData)[],
  overwrite: boolean
): void {
  for (const key of keys) {
    applyField(target, source, key, overwrite);
  }
}

function mergeUnique(target: string[] | undefined, extra: string[] | undefined): string[] {
  return Array.from(new Set([...(target ?? []), ...(extra ?? [])]));
}

function toSourceStatus(success: boolean): ImportSourceStatus {
  return success ? "success" : "failed";
}

function mergeGameData(
  ludopediaData: ImportedGameData | null,
  bggData: ImportedGameData | null,
): MergeResult {
  const merged = createEmptyGameData();
  const links: ImportedLinks = {};
  const warnings: string[] = [];

  const ludoSuccess = hasImportedName(ludopediaData);
  const bggSuccess = hasImportedName(bggData);

  // Ludopedia has priority for most fields
  if (ludoSuccess) {
    applyFields(merged, ludopediaData, LUDOPEDIA_FIELDS, true);
    merged.mechanics = [...(ludopediaData.mechanics || [])];
    merged.categories = [...(ludopediaData.categories || [])];
    links.ludopedia = ludopediaData.sourceUrl;
    warnings.push("Dados priorizados da Ludopedia");
  }

  // Only merge BGG fields that are not already set from Ludopedia
  if (bggSuccess) {
    applyField(merged, bggData, "name", false, true);
    applyField(merged, bggData, "originalName", false, true);
    applyFields(merged, bggData, BGG_FIELDS, false);
    merged.mechanics = mergeUnique(merged.mechanics, bggData.mechanics);
    merged.categories = mergeUnique(merged.categories, bggData.categories);
    if (bggData.sourceUrl) {
      links.bgg = bggData.sourceUrl;
    }
    warnings.push("Dados complementares do BoardGameGeek");
  }

  // Ensure mechanics and categories have at least empty arrays
  merged.mechanics = merged.mechanics || [];
  merged.categories = merged.categories || [];

  return {
    data: { ...merged, links },
    sources: {
      ludopedia: toSourceStatus(ludoSuccess),
      bgg: toSourceStatus(bggSuccess),
    },
    warnings,
  };
}

function fetchLudopediaSource(url?: string): Promise<SourceResult> {
  if (!url) return Promise.resolve({ success: null, error: null });
  return fetchLudopediaGame(url)
    .then((data) => ({ success: data, error: null }))
    .catch((err) => ({ success: null, error: err.message }));
}

function fetchBggSource(url?: string): Promise<SourceResult> {
  if (!url) return Promise.resolve({ success: null, error: null });
  return fetchBggGame(url)
    .then((data) => ({ success: data, error: null }))
    .catch((err) => ({ success: null, error: err.message }));
}

async function fetchImportSources(ludopediaUrl?: string, bggUrl?: string) {
  const [ludoResult, bggResult] = await Promise.allSettled([
    fetchLudopediaSource(ludopediaUrl),
    fetchBggSource(bggUrl),
  ]);

  return {
    ludoData:
      ludoResult.status === "fulfilled"
        ? ludoResult.value
        : { success: null, error: "Erro ao processar Ludopedia" },
    bggData:
      bggResult.status === "fulfilled"
        ? bggResult.value
        : { success: null, error: "Erro ao processar BGG" },
  };
}

function mergeLinks(existing: ImportedLinks | null, imported: ImportedLinks | undefined): ImportedLinks {
  const merged: ImportedLinks = { ...(existing ?? {}) };
  if (imported?.ludopedia !== undefined) {
    merged.ludopedia = imported.ludopedia;
  }
  if (imported?.bgg !== undefined) {
    merged.bgg = imported.bgg;
  }
  return merged;
}

function buildUpdatePayload(
  data: ImportedGameData,
  links: ImportedLinks
): Record<string, unknown> {
  const payload: Record<string, unknown> = { links };

  for (const key of UPDATE_FIELDS) {
    if (data[key] !== undefined) {
      payload[key] = data[key];
    }
  }

  // Somente sobrescreve listas quando a fonte retornou ao menos um item,
  // evitando apagar os valores já cadastrados com arrays vazios.
  if ((data.mechanics ?? []).length > 0) {
    payload.mechanics = data.mechanics;
  }
  if ((data.categories ?? []).length > 0) {
    payload.categories = data.categories;
  }

  return payload;
}

async function updateGameFromImport(
  gameId: string,
  importedData: MergeResult["data"]
): Promise<Game> {
  const existing = await prisma.game.findUnique({
    where: { id: gameId },
    select: { links: true },
  });

  const mergedLinks = mergeLinks(
    (existing?.links as ImportedLinks | null) ?? null,
    importedData.links
  );
  const updatePayload = buildUpdatePayload(importedData, mergedLinks);

  return prisma.game.update({
    where: { id: gameId },
    data: updatePayload as Parameters<typeof prisma.game.update>[0]["data"],
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 },
    );
  }

  try {
    const result = GameImportRequestSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json(
        { error: "Dados de importação inválidos", issues: result.error.issues },
        { status: 400 },
      );
    }

    const { ludopediaUrl, bggUrl, gameId } = result.data;
    const { ludoData, bggData } = await fetchImportSources(ludopediaUrl, bggUrl);
    const { data: mergedData, sources, warnings } = mergeGameData(
      ludoData.success,
      bggData.success,
    );
    const errors = {
      ...(ludoData.error ? { ludopedia: ludoData.error } : {}),
      ...(bggData.error ? { bgg: bggData.error } : {}),
    };

    const updatedGame = gameId
      ? await updateGameFromImport(gameId, mergedData)
      : null;

    return NextResponse.json({
      data: mergedData,
      game: updatedGame ?? mergedData,
      sources,
      warnings,
      ...(Object.keys(errors).length > 0 && { errors }),
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno no servidor de importação" },
      { status: 500 },
    );
  }
}
