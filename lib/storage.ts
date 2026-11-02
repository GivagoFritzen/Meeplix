import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { formatFileSize } from "@/lib/utils";

const STORAGE_PATH = process.env.STORAGE_PATH || "/app/storage";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "104857600", 10);

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
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

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "mp3", "wav", "ogg", "m4a", "aac"];

export function getGameStoragePath(gameId: string): string {
  return path.join(STORAGE_PATH, "games", gameId);
}

export function getFileStoragePath(gameId: string, filename: string): string {
  return path.join(getGameStoragePath(gameId), filename);
}

export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase().substring(1);
  const name = path.basename(filename, path.extname(filename))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);
  return `${name}.${ext}`;
}

export function validateFile(file: { size: number; type: string; name: string }): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Arquivo muito grande. Máximo: ${formatFileSize(MAX_FILE_SIZE)}` };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: "Tipo de arquivo não permitido. Use: JPG, PNG, WebP, GIF, PDF, MP3, WAV, OGG, M4A, AAC" };
  }

  const ext = path.extname(file.name).toLowerCase().substring(1);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "Extensão de arquivo não permitida" };
  }

  return { valid: true };
}

export async function ensureGameDirectory(gameId: string): Promise<string> {
  const gamePath = getGameStoragePath(gameId);
  await fs.mkdir(gamePath, { recursive: true });
  return gamePath;
}

export function getTempStoragePath(): string {
  return path.join(STORAGE_PATH, "temp");
}

export async function ensureTempDirectory(): Promise<string> {
  const tempPath = getTempStoragePath();
  await fs.mkdir(tempPath, { recursive: true });
  return tempPath;
}

export async function saveTempFile(
  file: Buffer,
  originalName: string
): Promise<{ path: string; filename: string; size: number }> {
  await ensureTempDirectory();

  const ext = path.extname(originalName).toLowerCase();
  const uuid = randomUUID();
  const filename = `${uuid}${ext}`;
  const filePath = path.join(getTempStoragePath(), filename);

  await fs.writeFile(filePath, file);

  return {
    path: `temp/${filename}`,
    filename,
    size: file.length,
  };
}

export async function saveFile(
  gameId: string,
  file: Buffer,
  originalName: string
): Promise<{ path: string; filename: string; size: number }> {
  await ensureGameDirectory(gameId);

  const ext = path.extname(originalName).toLowerCase().substring(1);
  const uuid = randomUUID();
  const filename = `${uuid}.${ext}`;
  const filePath = getFileStoragePath(gameId, filename);

  await fs.writeFile(filePath, file);

  return {
    path: `games/${gameId}/${filename}`,
    filename,
    size: file.length,
  };
}

export async function deleteFile(relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(/* turbopackIgnore: true */ STORAGE_PATH, relativePath);
    await fs.access(fullPath);
    await fs.unlink(fullPath);

    const dir = path.dirname(fullPath);
    const files = await fs.readdir(dir);
    if (files.length === 0) {
      await fs.rmdir(dir);
      const parentDir = path.dirname(dir);
      const parentFiles = await fs.readdir(parentDir);
      if (parentFiles.length === 0) {
        await fs.rmdir(parentDir);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function getFileBuffer(relativePath: string): Promise<Buffer | null> {
  try {
    const fullPath = path.join(/* turbopackIgnore: true */ STORAGE_PATH, relativePath);
    return await fs.readFile(fullPath);
  } catch {
    return null;
  }
}

export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(/* turbopackIgnore: true */ STORAGE_PATH, relativePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

export function getFileTypeFromMime(mimeType: string): "COVER" | "MANUAL" | "RULEBOOK" | "ERRATA" | "QUICK_REFERENCE" | "IMAGE" | "OTHER" {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType === "application/pdf") return "MANUAL";
  if (mimeType.startsWith("audio/")) return "OTHER";
  return "OTHER";
}