// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "meeplix-test-"));
  process.env.STORAGE_PATH = tempDir;
  process.env.MAX_FILE_SIZE = "10485760";
  vi.resetModules();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

async function importStorage() {
  const mod = await import("@/lib/storage");
  return mod;
}

describe("storage - caminhos", () => {
  it("getGameStoragePath constrói caminho do jogo", async () => {
    const { getGameStoragePath } = await importStorage();
    expect(getGameStoragePath("abc123")).toBe(path.join(tempDir, "games", "abc123"));
  });

  it("getFileStoragePath constrói caminho do arquivo", async () => {
    const { getFileStoragePath } = await importStorage();
    expect(getFileStoragePath("abc123", "file.pdf")).toBe(
      path.join(tempDir, "games", "abc123", "file.pdf"),
    );
  });
});

describe("storage - validateFile", () => {
  it("aceita arquivo válido", async () => {
    const { validateFile } = await importStorage();
    const result = validateFile({ size: 1000, type: "image/png", name: "foto.png" });
    expect(result.valid).toBe(true);
  });

  it("rejeita tamanho excedido", async () => {
    const { validateFile } = await importStorage();
    const result = validateFile({ size: 20000000, type: "image/png", name: "foto.png" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("muito grande");
  });

  it("rejeita MIME não permitido", async () => {
    const { validateFile } = await importStorage();
    const result = validateFile({
      size: 1000,
      type: "application/x-msdownload",
      name: "virus.exe",
    });
    expect(result.valid).toBe(false);
  });

  it("rejeita extensão não permitida", async () => {
    const { validateFile } = await importStorage();
    const result = validateFile({ size: 1000, type: "image/png", name: "foto.xyz" });
    expect(result.valid).toBe(false);
  });
});

describe("storage - gravação e leitura", () => {
  it("salva e lê arquivo temporário", async () => {
    const { saveTempFile, getFileBuffer, fileExists } = await importStorage();
    const content = Buffer.from("conteúdo de teste");
    const saved = await saveTempFile(content, "documento.pdf");
    expect(saved.size).toBe(content.length);
    expect(saved.filename).toMatch(/\.pdf$/);

    const exists = await fileExists(saved.path);
    expect(exists).toBe(true);

    const buffer = await getFileBuffer(saved.path);
    expect(buffer).toEqual(content);
  });

  it("salva arquivo no diretório do jogo", async () => {
    const { saveFile, getFileBuffer } = await importStorage();
    const content = Buffer.from("dados do jogo");
    const saved = await saveFile("game-1", content, "manual.pdf");
    expect(saved.path).toBe("games/game-1/" + saved.filename);
    expect(saved.size).toBe(content.length);

    const buffer = await getFileBuffer(saved.path);
    expect(buffer).toEqual(content);
  });

  it("getFileBuffer retorna null para arquivo inexistente", async () => {
    const { getFileBuffer } = await importStorage();
    const buffer = await getFileBuffer("games/nao-existe/arquivo.pdf");
    expect(buffer).toBeNull();
  });

  it("fileExists retorna false para inexistente", async () => {
    const { fileExists } = await importStorage();
    expect(await fileExists("games/nao-existe/arquivo.pdf")).toBe(false);
  });
});

describe("storage - exclusão", () => {
  it("deleta arquivo existente", async () => {
    const { saveTempFile, deleteFile, fileExists } = await importStorage();
    const content = Buffer.from("para deletar");
    const saved = await saveTempFile(content, "temp.txt");
    expect(await fileExists(saved.path)).toBe(true);

    const deleted = await deleteFile(saved.path);
    expect(deleted).toBe(true);
    expect(await fileExists(saved.path)).toBe(false);
  });

  it("retorna false ao deletar inexistente", async () => {
    const { deleteFile } = await importStorage();
    const deleted = await deleteFile("games/nao-existe/arquivo.pdf");
    expect(deleted).toBe(false);
  });
});

describe("storage - MIME e tipo", () => {
  it("getMimeType mapeia extensões", async () => {
    const { getMimeType } = await importStorage();
    expect(getMimeType("foto.jpg")).toBe("image/jpeg");
    expect(getMimeType("doc.pdf")).toBe("application/pdf");
    expect(getMimeType("musica.mp3")).toBe("audio/mpeg");
    expect(getMimeType("desconhecido.xyz")).toBe("application/octet-stream");
  });
});

describe("storage - path traversal", () => {
  it("deleteFile previne path traversal (caminho absoluto)", async () => {
    const { deleteFile } = await importStorage();
    const deleted = await deleteFile("/etc/passwd");
    expect(deleted).toBe(false);
  });

  it("deleteFile previne path traversal (ponto ponto)", async () => {
    const { deleteFile } = await importStorage();
    const deleted = await deleteFile("../../../etc/passwd");
    expect(deleted).toBe(false);
  });
});
