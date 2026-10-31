import { describe, it, expect, beforeEach, vi } from "vitest";

vi.unmock("next/server");

import { NextRequest } from "next/server";
import { GET } from "@/app/api/files/[...path]/route";

const mocks = vi.hoisted(() => ({
  fileExists: vi.fn(),
  getFileBuffer: vi.fn(),
  getMimeType: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  fileExists: mocks.fileExists,
  getFileBuffer: mocks.getFileBuffer,
  getMimeType: mocks.getMimeType,
}));

vi.mock("fs", () => ({
  promises: { readFile: mocks.readFile },
}));

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/files/${path}`, { headers });
}

function params(...segments: string[]) {
  return { params: Promise.resolve({ path: segments }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fileExists.mockResolvedValue(true);
  mocks.getFileBuffer.mockResolvedValue(Buffer.from("hello"));
  mocks.getMimeType.mockReturnValue("image/png");
  mocks.readFile.mockResolvedValue(Buffer.from("legacy"));
});

describe("GET /api/files/[...path]", () => {
  it("rejeita caminho com ..", async () => {
    const response = await GET(request("../secret"), params("..", "secret"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Caminho inválido" });
    expect(mocks.fileExists).not.toHaveBeenCalled();
  });

  it("rejeita caminho absoluto", async () => {
    const response = await GET(request("/etc/passwd"), params("/etc/passwd"));

    expect(response.status).toBe(400);
  });

  it("serve imagem inline", async () => {
    const response = await GET(request("games/game-1/capa.png"), params("games", "game-1", "capa.png"));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("hello");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe("5");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
  });

  it("serve PDF inline", async () => {
    mocks.getMimeType.mockReturnValue("application/pdf");

    const response = await GET(request("games/game-1/manual.pdf"), params("games", "game-1", "manual.pdf"));

    expect(response.headers.get("content-disposition")).toContain("inline");
  });

  it("serve outros tipos como anexo", async () => {
    mocks.getMimeType.mockReturnValue("application/zip");

    const response = await GET(request("games/game-1/arquivo.zip"), params("games", "game-1", "arquivo.zip"));

    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("content-disposition")).toContain("arquivo.zip");
  });

  it("respeita intervalo de bytes", async () => {
    const response = await GET(
      request("games/game-1/capa.png", { range: "bytes=1-3" }),
      params("games", "game-1", "capa.png")
    );

    expect(response.status).toBe(206);
    await expect(response.text()).resolves.toBe("ell");
    expect(response.headers.get("content-range")).toBe("bytes 1-3/5");
    expect(response.headers.get("content-length")).toBe("3");
  });

  it("usa o fim do arquivo quando o intervalo é aberto", async () => {
    const response = await GET(
      request("games/game-1/capa.png", { range: "bytes=2-" }),
      params("games", "game-1", "capa.png")
    );

    expect(response.status).toBe(206);
    await expect(response.text()).resolves.toBe("llo");
    expect(response.headers.get("content-range")).toBe("bytes 2-4/5");
  });

  it("serve arquivo legado quando não está no storage", async () => {
    mocks.fileExists.mockResolvedValue(false);

    const response = await GET(request("uploads/antiga.png"), params("uploads", "antiga.png"));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("legacy");
    expect(mocks.readFile).toHaveBeenCalled();
  });

  it("retorna 404 quando não encontra nem no legado", async () => {
    mocks.fileExists.mockResolvedValue(false);
    mocks.readFile.mockRejectedValue(new Error("ENOENT"));

    const response = await GET(request("uploads/antiga.png"), params("uploads", "antiga.png"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Arquivo não encontrado" });
  });

  it("retorna 404 quando o buffer é nulo", async () => {
    mocks.getFileBuffer.mockResolvedValue(null);

    const response = await GET(request("games/game-1/capa.png"), params("games", "game-1", "capa.png"));

    expect(response.status).toBe(404);
  });

  it("retorna 500 quando a verificação falha", async () => {
    mocks.fileExists.mockRejectedValue(new Error("falha"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request("games/game-1/capa.png"), params("games", "game-1", "capa.png"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro interno do servidor" });
  });
});
