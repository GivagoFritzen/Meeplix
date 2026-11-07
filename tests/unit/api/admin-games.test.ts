import { describe, it, expect, beforeEach, vi } from "vitest";

vi.unmock("next/server");

import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { GET, POST } from "@/app/api/admin/games/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  game: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { game: mocks.game },
  default: {},
}));

const session = { user: { id: "user-1", email: "admin@example.com" }, expires: "2030-01-01" };

const validCreateBody = {
  name: "Catan",
  minPlayers: 3,
  maxPlayers: 4,
  minPlaytime: 60,
  bestPlayers: 4,
  minAge: 10,
  bggRating: 7.8,
  bggRank: 200,
};

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(session);
  mocks.game.findMany.mockResolvedValue([]);
  mocks.game.count.mockResolvedValue(0);
});

describe("GET /api/admin/games", () => {
  it("exige autenticação", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/admin/games"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Não autorizado" });
    expect(mocks.game.findMany).not.toHaveBeenCalled();
  });

  it("lista jogos com paginação padrão", async () => {
    mocks.game.findMany.mockResolvedValue([
      {
        id: "game-1",
        name: "Catan",
        files: [{ id: "f1", size: BigInt(10), path: "cover.png" }],
      },
    ]);
    mocks.game.count.mockResolvedValue(45);

    const response = await GET(new NextRequest("http://localhost/api/admin/games"));
    const body = await response.json();

    expect(mocks.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { name: "asc" }, skip: 0, take: 50 })
    );
    expect(body.games[0].files[0].size).toBe(10);
    expect(body).toMatchObject({ total: 45, page: 1, totalPages: 1 });
  });

  it("aplica filtros e paginação", async () => {
    await GET(
      new NextRequest(
        "http://localhost/api/admin/games?search=catan&players=3-4&duration=long&complexity=heavy&mechanic=Trading&sort=year&page=3&limit=10"
      )
    );

    expect(mocks.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.any(Array),
          AND: [{ maxPlayers: { gte: 3 } }, { minPlayers: { lte: 4 } }],
          minPlaytime: { gte: 90 },
          weight: { gte: 3.0 },
          mechanics: { has: "Trading" },
        },
        orderBy: { year: "asc" },
        skip: 20,
        take: 10,
      })
    );
  });

  it("propaga filtros inválidos", async () => {
    await expect(
      GET(new NextRequest("http://localhost/api/admin/games?players=invalido"))
    ).rejects.toThrow();
  });
});

describe("POST /api/admin/games", () => {
  it("exige autenticação", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(
      jsonRequest("http://localhost/api/admin/games", "POST", validCreateBody)
    );

    expect(response.status).toBe(401);
    expect(mocks.game.create).not.toHaveBeenCalled();
  });

  it("cria jogo e normaliza links padrão", async () => {
    mocks.game.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "game-1",
      ...data,
    }));

    const response = await POST(
      jsonRequest("http://localhost/api/admin/games", "POST", validCreateBody)
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("game-1");
    expect(mocks.game.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Catan",
        links: { bgg: "", ludopedia: "", manual: "" },
        coverImage: null,
        coverImageData: Prisma.JsonNull,
      }),
    });
  });

  it("converte data URI de capa em dados JSON", async () => {
    mocks.game.create.mockResolvedValue({ id: "game-1" });
    const dataUri = "data:image/png;base64,YWJj";

    await POST(
      jsonRequest("http://localhost/api/admin/games", "POST", {
        ...validCreateBody,
        coverImage: dataUri,
      })
    );

    expect(mocks.game.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        coverImage: dataUri,
        coverImageData: { base64: "YWJj", mimeType: "image/png" },
      }),
    });
  });

  it("mantém URL de capa informada", async () => {
    mocks.game.create.mockResolvedValue({ id: "game-1" });
    const url = "https://example.com/cover.jpg";

    await POST(
      jsonRequest("http://localhost/api/admin/games", "POST", {
        ...validCreateBody,
        coverImage: url,
      })
    );

    expect(mocks.game.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ coverImage: url, coverImageData: Prisma.JsonNull }),
    });
  });

  it("retorna 400 para dados inválidos", async () => {
    const response = await POST(
      jsonRequest("http://localhost/api/admin/games", "POST", { name: "" })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toHaveProperty("error");
    expect(mocks.game.create).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o banco rejeita", async () => {
    mocks.game.create.mockRejectedValue(new Error("registro duplicado"));

    const response = await POST(
      jsonRequest("http://localhost/api/admin/games", "POST", validCreateBody)
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "registro duplicado" });
  });

  it("retorna 500 para erro não-Error", async () => {
    mocks.game.create.mockRejectedValue("falha");

    const response = await POST(
      jsonRequest("http://localhost/api/admin/games", "POST", validCreateBody)
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro ao criar jogo" });
  });
});
