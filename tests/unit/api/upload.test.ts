import { describe, it, expect, beforeEach, vi } from "vitest";

vi.unmock("next/server");

import { NextRequest } from "next/server";
import { POST as adminUpload } from "@/app/api/admin/upload/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  saveFile: vi.fn(),
  saveTempFile: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    game: { findUnique: mocks.findUnique },
    gameFile: { create: mocks.create },
  },
  default: {},
}));

vi.mock("@/lib/storage", () => ({
  saveFile: mocks.saveFile,
  saveTempFile: mocks.saveTempFile,
}));

const session = { user: { id: "user-1", email: "admin@example.com" }, expires: "2030-01-01" };

const oversized = 101 * 1024 * 1024;

function makeFile(name = "capa.png", type = "image/png", content = "abc") {
  return new File([content], name, { type });
}

function formRequest(
  path: string,
  files: File[],
  fields: Record<string, string> = {}
) {
  const formData = new FormData();
  for (const file of files) formData.append("files", file);
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);

  return new NextRequest(`http://localhost${path}`, { method: "POST", body: formData });
}

function oversizedRequest(path: string, name = "grande.pdf", type = "application/pdf") {
  const request = new NextRequest(`http://localhost${path}`, { method: "POST" });
  const formData = {
    getAll: () => [{ name, type, size: oversized, arrayBuffer: async () => new ArrayBuffer(0) }],
    get: (key: string) => (key === "type" ? "OTHER" : null),
  };

  vi.spyOn(request, "formData").mockResolvedValue(formData as unknown as FormData);
  return request;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(session);
  mocks.findUnique.mockResolvedValue({ id: "game-1" });
  mocks.saveFile.mockResolvedValue({
    path: "games/game-1/uuid.png",
    filename: "uuid.png",
    size: 3,
  });
  mocks.saveTempFile.mockResolvedValue({
    path: "temp/uuid.png",
    filename: "uuid.png",
    size: 3,
  });
  mocks.create.mockResolvedValue({ id: "file-1", gameId: "game-1" });
});

describe("POST /api/admin/upload", () => {
  it("exige autenticação", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await adminUpload(
      formRequest("/api/admin/upload", [makeFile()])
    );

    expect(response.status).toBe(401);
    expect(mocks.saveFile).not.toHaveBeenCalled();
  });

  it("rejeita requisição sem arquivos", async () => {
    const response = await adminUpload(formRequest("/api/admin/upload", []));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Nenhum arquivo enviado" });
  });

  it("rejeita tipo de arquivo desconhecido", async () => {
    const response = await adminUpload(
      formRequest("/api/admin/upload", [makeFile()], { type: "INVALIDO" })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Tipo inválido: INVALIDO" });
  });

  it("rejeita MIME não permitido", async () => {
    const response = await adminUpload(
      formRequest("/api/admin/upload", [makeFile("script.exe", "application/x-msdownload")])
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Tipo de arquivo não permitido: application/x-msdownload",
    });
  });

  it("rejeita arquivo acima de 100MB", async () => {
    const response = await adminUpload(oversizedRequest("/api/admin/upload"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Arquivo grande.pdf excede 100MB",
    });
  });

  it("retorna 404 quando o jogo não existe", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await adminUpload(
      formRequest("/api/admin/upload", [makeFile()], { gameId: "game-1" })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Jogo não encontrado" });
    expect(mocks.saveFile).not.toHaveBeenCalled();
  });

  it("persiste arquivo vinculado ao jogo", async () => {
    const response = await adminUpload(
      formRequest("/api/admin/upload", [makeFile()], { gameId: "game-1", type: "COVER" })
    );
    const body = await response.json();

    expect(mocks.saveFile).toHaveBeenCalledWith("game-1", Buffer.from("abc"), "capa.png");
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        gameId: "game-1",
        originalName: "capa.png",
        displayName: "capa.png",
        mimeType: "image/png",
        extension: "png",
        size: BigInt(3),
        path: "games/game-1/uuid.png",
        type: "COVER",
      },
    });
    expect(body.files[0]).toMatchObject({
      originalName: "capa.png",
      extension: "png",
      path: "games/game-1/uuid.png",
      type: "COVER",
      id: "file-1",
    });
  });

  it("usa tipo OTHER por padrão", async () => {
    await adminUpload(
      formRequest("/api/admin/upload", [makeFile()], { gameId: "game-1" })
    );

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "OTHER" }) })
    );
  });

  it("salva em temp quando não há gameId", async () => {
    const response = await adminUpload(
      formRequest("/api/admin/upload", [makeFile()], { type: "IMAGE" })
    );
    const body = await response.json();

    expect(mocks.saveTempFile).toHaveBeenCalledWith(Buffer.from("abc"), "capa.png");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(body.files[0]).toMatchObject({
      originalName: "capa.png",
      path: "temp/uuid.png",
      type: "IMAGE",
    });
  });

  it("retorna 500 com detalhes quando o storage falha", async () => {
    const error = Object.assign(new Error("sem permissão"), { code: "EACCES" });
    mocks.saveTempFile.mockRejectedValue(error);

    const response = await adminUpload(formRequest("/api/admin/upload", [makeFile()]));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: "Erro ao fazer upload",
      details: "EACCES: sem permissão",
    });
  });

  it("retorna 500 sem código quando o erro é desconhecido", async () => {
    mocks.saveTempFile.mockRejectedValue("falha");

    const response = await adminUpload(formRequest("/api/admin/upload", [makeFile()]));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.details).toBe("Erro desconhecido");
  });
});

