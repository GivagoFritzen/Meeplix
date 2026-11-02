import { describe, it, expect, beforeEach, vi } from "vitest";

vi.unmock("next/server");

import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { GET, PUT, DELETE } from "@/app/api/admin/games/[id]/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findUnique: mocks.findUnique,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
  default: {},
}));

const session = { user: { id: "user-1", email: "admin@example.com" }, expires: "2030-01-01" };

function params(id = "game-1") {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/admin/games/game-1", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(session);
});

describe("GET /api/admin/games/[id]", () => {
  it("exige autenticação", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/games/game-1"),
      params()
    );

    expect(response.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o jogo não existe", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/games/game-1"),
      params()
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Jogo não encontrado" });
  });

  it("retorna jogo com arquivos serializados", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "game-1",
      name: "Catan",
      files: [{ id: "f1", size: BigInt(99) }],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/games/game-1"),
      params()
    );
    const body = await response.json();

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "game-1" },
      include: { files: true },
    });
    expect(body.files[0].size).toBe(99);
  });
});

describe("PUT /api/admin/games/[id]", () => {
  it("exige autenticação", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await PUT(jsonRequest("PUT", { name: "Novo" }), params());

    expect(response.status).toBe(401);
  });

  it("atualiza jogo e aplica links padrão", async () => {
    mocks.update.mockResolvedValue({ id: "game-1", name: "Novo" });

    const response = await PUT(jsonRequest("PUT", { name: "Novo" }), params());
    const body = await response.json();

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        name: "Novo",
        links: { bgg: "", ludopedia: "", manual: "" },
      },
    });
    expect(body).toMatchObject({ id: "game-1", name: "Novo" });
  });

  it("processa capa em data URI", async () => {
    mocks.update.mockResolvedValue({ id: "game-1" });

    await PUT(
      jsonRequest("PUT", {
        coverImage: "data:image/png;base64,YWJj",
        links: { bgg: "https://boardgamegeek.com/boardgame/13" },
      }),
      params()
    );

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        coverImage: "data:image/png;base64,YWJj",
        coverImageData: { base64: "YWJj", mimeType: "image/png" },
        links: { bgg: "https://boardgamegeek.com/boardgame/13" },
      },
    });
  });

  it("processa URL de capa", async () => {
    mocks.update.mockResolvedValue({ id: "game-1" });

    await PUT(
      jsonRequest("PUT", { coverImage: "https://example.com/capa.png" }),
      params()
    );

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        coverImage: "https://example.com/capa.png",
        coverImageData: Prisma.JsonNull,
        links: { bgg: "", ludopedia: "", manual: "" },
      },
    });
  });

  it("retorna 400 para dados inválidos", async () => {
    const response = await PUT(jsonRequest("PUT", { coverImage: 123 }), params());

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("retorna 500 para erro não-Error", async () => {
    mocks.update.mockRejectedValue("falha");

    const response = await PUT(jsonRequest("PUT", { name: "Novo" }), params());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao atualizar jogo" });
  });
});

describe("DELETE /api/admin/games/[id]", () => {
  it("exige autenticação", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/games/game-1", { method: "DELETE" }),
      params()
    );

    expect(response.status).toBe(401);
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("remove o jogo", async () => {
    mocks.delete.mockResolvedValue({ id: "game-1" });

    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/games/game-1", { method: "DELETE" }),
      params("game-1")
    );

    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "game-1" } });
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
