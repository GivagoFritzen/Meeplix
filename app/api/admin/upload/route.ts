import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFile, saveTempFile } from "@/lib/storage";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/epub+zip",
  "audio/mpeg",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/aac",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
];

const VALID_FILE_TYPES = ["COVER", "MANUAL", "RULEBOOK", "ERRATA", "QUICK_REFERENCE", "IMAGE", "OTHER"] as const;

type ValidFileType = (typeof VALID_FILE_TYPES)[number];

function isValidFileType(type: string): type is ValidFileType {
  return (VALID_FILE_TYPES as readonly string[]).includes(type);
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `Arquivo ${file.name} excede 100MB`;
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Tipo de arquivo não permitido: ${file.type}`;
  }
  return null;
}

async function persistGameFile(file: File, gameId: string, type: ValidFileType) {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveFile(gameId, buffer, file.name);
  const extension = saved.filename.split(".").pop()?.toLowerCase() || "";
  const gameFile = await prisma.gameFile.create({
    data: {
      gameId,
      originalName: file.name,
      displayName: file.name,
      mimeType: file.type,
      extension,
      size: BigInt(saved.size),
      path: saved.path,
      type,
    },
  });

  return {
    originalName: file.name,
    displayName: file.name,
    mimeType: file.type,
    extension,
    size: saved.size,
    path: saved.path,
    type,
    id: gameFile.id,
    gameId: gameFile.gameId,
  };
}

async function buildTempFileMeta(file: File, type: ValidFileType) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  // Upload sem gameId (legado): salva em STORAGE_PATH/temp para que o
  // diretório esteja dentro do volume montado (/app/storage) com
  // permissão de escrita, em vez de <cwd>/uploads (EACCES no Docker).
  const saved = await saveTempFile(Buffer.from(await file.arrayBuffer()), file.name);

  return {
    originalName: file.name,
    displayName: file.name,
    mimeType: file.type,
    extension,
    size: file.size,
    path: saved.path,
    type,
  };
}

async function processUploadedFiles(
  files: File[],
  gameId: string | null,
  type: ValidFileType
): Promise<{ files: Record<string, unknown>[] } | { error: string; status: number }> {
  const uploadedFiles: Record<string, unknown>[] = [];

  for (const file of files) {
    const validationError = validateFile(file);
    if (validationError) {
      return { error: validationError, status: 400 };
    }

    // Com gameId, salva via storage central (STORAGE_PATH) para que o
    // arquivo seja servido por /api/files/[...path] e persiste GameFile
    // no banco para aparecer na aba Áudio/Arquivos.
    if (gameId) {
      const persisted = await persistGameFile(file, gameId, type);
      if (!persisted) {
        return { error: "Jogo não encontrado", status: 404 };
      }
      uploadedFiles.push(persisted);
      continue;
    }

    uploadedFiles.push(await buildTempFileMeta(file, type));
  }

  return { files: uploadedFiles };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const type = (formData.get("type") as string) || "OTHER";
    const gameId = formData.get("gameId") as string | null;

    if (!files.length) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!isValidFileType(type)) {
      return NextResponse.json({ error: `Tipo inválido: ${type}` }, { status: 400 });
    }

    const result = await processUploadedFiles(files, gameId, type);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ files: result.files });
  } catch (error) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const code = (error as NodeJS.ErrnoException)?.code;
    return NextResponse.json({ error: "Erro ao fazer upload", details: code ? `${code}: ${message}` : message }, { status: 500 });
  }
}
