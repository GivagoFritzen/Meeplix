import { describe, it, expect, beforeEach, vi } from "vitest";

vi.unmock("next/server");

import { NextRequest } from "next/server";
import { POST } from "@/app/api/games/import/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchBgg: vi.fn(),
  fetchLudo: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
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
    },
  },
  default: {},
}));

vi.mock("@/lib/integrations/bgg", () => ({
  fetchBggGame: mocks.fetchBgg,
}));

vi.mock("@/lib/integrations/ludopedia", () => ({
  fetchLudopediaGame: mocks.fetchLudo,
}));

const session = { user: { id: "user-1", email: "admin@example.com" }, expires: "2030-01-01" };

const GAME_ID = "clh3am9qg0000qzrmn831i7rn";

const ludoData = {
  name: "Catan",
  originalName: null,
  description: "Descrição Ludopedia",
  year: 1995,
  minPlayers: 3,
  maxPlayers: 4,
  minPlaytime: 60,
  publisher: "Devir",
  designer: "Klaus Teuber",
  artist: null,
  ludoRating: 8.2,
  ludoRank: 10,
  coverImage: "https://ludopedia.com.br/capa.jpg",
  bestPlayers: 4,
  minAge: 10,
  interaction: 2,
  luck: 1,
  downtime: 2,
  replayability: 4,
  mechanics: ["Trading"],
  categories: ["Economy"],
  sourceUrl: "https://ludopedia.com.br/jogo/catan",
};

const bggData = {
  name: "Catan",
  originalName: "Die Siedler von Catan",
  description: "Descrição BGG",
  year: 1995,
  minPlayers: 3,
  maxPlayers: 4,
  minAge: 10,
  publisher: "Kosmos",
  designer: "Klaus Teuber",
  artist: "Michael Menzel",
  bggRating: 7.8,
  bggRank: 200,
  weight: 2.3,
  interaction: 2,
  luck: 1,
  downtime: 2,
  replayability: 4,
  mechanics: ["Trading", "Negotiation"],
  categories: ["Economy", "Dice"],
  sourceUrl: "https://boardgamegeek.com/boardgame/13",
};

function importRequest(body: unknown) {
  return new NextRequest("http://localhost/api/games/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(session);
  mocks.fetchLudo.mockResolvedValue(ludoData);
  mocks.fetchBgg.mockResolvedValue(bggData);
  mocks.update.mockResolvedValue({ id: GAME_ID, name: "Catan" });
});

describe("POST /api/games/import", () => {
  it("exige autenticação", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(
      importRequest({ ludopediaUrl: "https://ludopedia.com.br/jogo/catan" })
    );

    expect(response.status).toBe(401);
    expect(mocks.fetchLudo).not.toHaveBeenCalled();
  });

  it("rejeita corpo sem URLs", async () => {
    const response = await POST(importRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toHaveProperty(
      "error",
      "Dados de importação inválidos"
    );
  });

  it("rejeita URL inválida", async () => {
    const response = await POST(importRequest({ ludopediaUrl: "nao-e-url" }));

    expect(response.status).toBe(400);
    expect(mocks.fetchLudo).not.toHaveBeenCalled();
  });

  it("importa apenas da Ludopedia", async () => {
    const response = await POST(
      importRequest({ ludopediaUrl: "https://ludopedia.com.br/jogo/catan" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.fetchLudo).toHaveBeenCalledWith("https://ludopedia.com.br/jogo/catan");
    expect(mocks.fetchBgg).not.toHaveBeenCalled();
    expect(body.sources).toEqual({ ludopedia: "success", bgg: "failed" });
    expect(body.warnings).toEqual(["Dados priorizados da Ludopedia"]);
    expect(body.data).toMatchObject({
      name: "Catan",
      description: "Descrição Ludopedia",
      ludoRating: 8.2,
      links: { ludopedia: "https://ludopedia.com.br/jogo/catan" },
    });
    expect(body.game).toEqual(body.data);
  });

  it("importa apenas do BGG", async () => {
    const response = await POST(
      importRequest({ bggUrl: "https://boardgamegeek.com/boardgame/13" })
    );
    const body = await response.json();

    expect(mocks.fetchLudo).not.toHaveBeenCalled();
    expect(body.sources).toEqual({ ludopedia: "failed", bgg: "success" });
    expect(body.warnings).toEqual(["Dados complementares do BoardGameGeek"]);
    expect(body.data).toMatchObject({
      name: "Catan",
      originalName: "Die Siedler von Catan",
      bggRating: 7.8,
      links: { bgg: "https://boardgamegeek.com/boardgame/13" },
    });
  });

  it("combina fontes priorizando a Ludopedia", async () => {
    const response = await POST(
      importRequest({
        ludopediaUrl: "https://ludopedia.com.br/jogo/catan",
        bggUrl: "https://boardgamegeek.com/boardgame/13",
      })
    );
    const body = await response.json();

    expect(body.sources).toEqual({ ludopedia: "success", bgg: "success" });
    expect(body.warnings).toEqual([
      "Dados priorizados da Ludopedia",
      "Dados complementares do BoardGameGeek",
    ]);
    expect(body.data).toMatchObject({
      name: "Catan",
      originalName: "Die Siedler von Catan",
      description: "Descrição Ludopedia",
      publisher: "Devir",
      bggRating: 7.8,
      ludoRating: 8.2,
      weight: 2.3,
      mechanics: ["Trading", "Negotiation"],
      categories: ["Economy", "Dice"],
      links: {
        ludopedia: "https://ludopedia.com.br/jogo/catan",
        bgg: "https://boardgamegeek.com/boardgame/13",
      },
    });
  });

  it("tolera falha de uma das fontes", async () => {
    mocks.fetchLudo.mockRejectedValue(new Error("Ludopedia fora do ar"));

    const response = await POST(
      importRequest({
        ludopediaUrl: "https://ludopedia.com.br/jogo/catan",
        bggUrl: "https://boardgamegeek.com/boardgame/13",
      })
    );
    const body = await response.json();

    expect(body.sources).toEqual({ ludopedia: "failed", bgg: "success" });
    expect(body.warnings).toEqual(["Dados complementares do BoardGameGeek"]);
    expect(body.data.name).toBe("Catan");
    expect(body.errors).toBeUndefined();
  });

  it("retorna resultado vazio quando ambas as fontes falham", async () => {
    mocks.fetchLudo.mockRejectedValue(new Error("erro ludo"));
    mocks.fetchBgg.mockRejectedValue(new Error("erro bgg"));

    const response = await POST(
      importRequest({
        ludopediaUrl: "https://ludopedia.com.br/jogo/catan",
        bggUrl: "https://boardgamegeek.com/boardgame/13",
      })
    );
    const body = await response.json();

    expect(body.sources).toEqual({ ludopedia: "failed", bgg: "failed" });
    expect(body.warnings).toEqual([]);
    expect(body.errors).toBeUndefined();
    expect(body.data.mechanics).toEqual([]);
    expect(body.data.categories).toEqual([]);
  });

  it("atualiza jogo existente preservando links antigos", async () => {
    mocks.findUnique.mockResolvedValue({
      links: {
        bgg: "https://boardgamegeek.com/boardgame/1",
        manual: "https://example.com/manual.pdf",
      },
    });

    const response = await POST(
      importRequest({
        ludopediaUrl: "https://ludopedia.com.br/jogo/catan",
        bggUrl: "https://boardgamegeek.com/boardgame/13",
        gameId: GAME_ID,
      })
    );
    const body = await response.json();

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: GAME_ID },
      select: { links: true },
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: GAME_ID },
      data: expect.objectContaining({
        name: "Catan",
        description: "Descrição Ludopedia",
        bggRating: 7.8,
        mechanics: ["Trading", "Negotiation"],
        categories: ["Economy", "Dice"],
        links: {
          bgg: "https://boardgamegeek.com/boardgame/13",
          manual: "https://example.com/manual.pdf",
          ludopedia: "https://ludopedia.com.br/jogo/catan",
        },
      }),
    });
    expect(body.game).toMatchObject({ id: GAME_ID, name: "Catan" });
  });

  it("não envia campos indefinidos nem listas vazias na atualização", async () => {
    mocks.findUnique.mockResolvedValue({ links: null });
    mocks.fetchBgg.mockResolvedValue({
      name: "Jogo BGG",
      mechanics: [],
      categories: [],
      bggRating: 7.1,
      sourceUrl: "https://boardgamegeek.com/boardgame/13",
    });

    await POST(
      importRequest({
        bggUrl: "https://boardgamegeek.com/boardgame/13",
        gameId: GAME_ID,
      })
    );

    const updateCall = mocks.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };

    expect(updateCall.data).not.toHaveProperty("ludoRating");
    expect(updateCall.data).not.toHaveProperty("mechanics");
    expect(updateCall.data).not.toHaveProperty("categories");
    expect(updateCall.data).toMatchObject({
      name: "Jogo BGG",
      bggRating: 7.1,
      links: { bgg: "https://boardgamegeek.com/boardgame/13" },
    });
  });

  it("retorna 500 quando a atualização falha", async () => {
    mocks.findUnique.mockResolvedValue({ links: {} });
    mocks.update.mockRejectedValue(new Error("db offline"));

    const response = await POST(
      importRequest({
        ludopediaUrl: "https://ludopedia.com.br/jogo/catan",
        gameId: GAME_ID,
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno no servidor de importação",
    });
  });

  it("retorna 500 para JSON inválido", async () => {
    const request = new NextRequest("http://localhost/api/games/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalido",
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
