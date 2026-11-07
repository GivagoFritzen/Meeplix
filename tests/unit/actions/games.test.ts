import { describe, it, expect, beforeEach, vi } from "vitest";
import { getGames, getGameBySlug, toggleGameActive } from "@/app/actions/games";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  transaction: vi.fn((operations) => Promise.all(operations)),
  game: {
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    game: mocks.game,
    $transaction: mocks.transaction,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

function buildDbGame(overrides: Record<string, unknown> = {}) {
  return {
    id: "game-1",
    name: "Catan",
    originalName: null,
    description: null,
    coverImage: null,
    coverImageData: null,
    bggRating: null,
    ludoRating: null,
    weight: null,
    isActive: false,
    files: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  mocks.game.findFirst.mockResolvedValue(null);
});

describe("getGames", () => {
  it("usa paginação e ordenação padrão", async () => {
    mocks.game.findMany.mockResolvedValue([]);
    mocks.game.count.mockResolvedValue(0);

    const result = await getGames();

    expect(mocks.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        orderBy: { name: "asc" },
        skip: 0,
        take: 24,
      })
    );
    expect(result).toEqual({ games: [], total: 0, page: 1, totalPages: 0 });
  });

  it("normaliza capa e notas dos jogos", async () => {
    mocks.game.findMany.mockResolvedValue([
      buildDbGame({
        files: [{ path: "games/game-1/cover.png" }],
        bggRating: "8.5",
        ludoRating: 0,
        weight: "2.75",
      }),
      buildDbGame({
        id: "game-2",
        name: "Azul",
        files: [],
        coverImage: "https://example.com/azul.jpg",
        bggRating: null,
        ludoRating: "7.2",
        weight: null,
      }),
    ]);
    mocks.game.count.mockResolvedValue(45);

    const result = await getGames();

    expect(result.games[0]).toMatchObject({
      coverImage: "games/game-1/cover.png",
      bggRating: 8.5,
      ludoRating: null,
      weight: 2.75,
    });
    expect(result.games[1]).toMatchObject({
      coverImage: "https://example.com/azul.jpg",
      bggRating: null,
      ludoRating: 7.2,
      weight: null,
    });
    expect(result).toMatchObject({ total: 45, page: 1, totalPages: 2 });
  });

  it("aplica filtros no where e na ordenação", async () => {
    mocks.game.findMany.mockResolvedValue([]);
    mocks.game.count.mockResolvedValue(0);

    await getGames({
      search: "catan",
      players: "3-4",
      duration: "medium",
      complexity: "heavy",
      mechanic: "Trading",
      sort: "year",
      order: "desc",
      page: 2,
      limit: 10,
    });

    expect(mocks.game.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.any(Array),
          AND: [{ maxPlayers: { gte: 3 } }, { minPlayers: { lte: 4 } }],
          minPlaytime: { gte: 30, lte: 60 },
          weight: { gte: 3.0 },
          mechanics: { has: "Trading" },
        },
        orderBy: { year: "desc" },
        skip: 10,
        take: 10,
      })
    );
  });

  it("retorna o jogo ativo fixado como primeiro mesmo se não bater com o filtro selecionado", async () => {
    const activeGame = buildDbGame({ id: "active-1", name: "Jogo Ativo", isActive: true });
    const regularGame = buildDbGame({ id: "game-2", name: "Catan", isActive: false });

    mocks.game.findFirst.mockResolvedValue(activeGame);
    mocks.game.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    mocks.game.findMany.mockResolvedValue([regularGame]);

    const result = await getGames({ search: "catan", page: 1, limit: 10 });

    expect(result.games[0].id).toBe("active-1");
    expect(result.games[0].isActive).toBe(true);
    expect(result.games[1].id).toBe("game-2");
    expect(result.total).toBe(2);
  });

  it("não duplica o jogo ativo quando ele corresponde ao filtro selecionado", async () => {
    const activeGame = buildDbGame({ id: "active-1", name: "Catan", isActive: true });
    const regularGame = buildDbGame({ id: "game-2", name: "Catan: Seafarers", isActive: false });

    mocks.game.findFirst.mockResolvedValue(activeGame);
    mocks.game.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    mocks.game.findMany.mockResolvedValue([regularGame]);

    const result = await getGames({ search: "catan", page: 1, limit: 10 });

    expect(result.games).toHaveLength(2);
    expect(result.games[0].id).toBe("active-1");
    expect(result.games[1].id).toBe("game-2");
    expect(result.total).toBe(2);
  });
});

describe("toggleGameActive", () => {
  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    await expect(toggleGameActive("game-1", true)).rejects.toThrow("Não autorizado");
  });

  it("ativa um jogo desativando outros jogos e revalidando caminhos", async () => {
    mocks.game.updateMany.mockResolvedValue({ count: 1 });
    mocks.game.update.mockResolvedValue(buildDbGame({ id: "game-1", name: "Catan", isActive: true }));
    mocks.game.findUnique.mockResolvedValue({ name: "Catan" });

    const result = await toggleGameActive("game-1", true);

    expect(result).toEqual({ success: true, isActive: true });
    expect(mocks.game.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
    expect(mocks.game.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { isActive: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/colecao");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/jogos/catan");
  });

  it("desativa um jogo com sucesso", async () => {
    mocks.game.update.mockResolvedValue(buildDbGame({ id: "game-1", name: "Catan", isActive: false }));
    mocks.game.findUnique.mockResolvedValue({ name: "Catan" });

    const result = await toggleGameActive("game-1", false);

    expect(result).toEqual({ success: true, isActive: false });
    expect(mocks.game.updateMany).not.toHaveBeenCalled();
    expect(mocks.game.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { isActive: false },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/colecao");
  });
});

describe("getGameBySlug", () => {
  it("busca primeiro por id", async () => {
    const game = buildDbGame({ id: "catan" });
    mocks.game.findUnique.mockResolvedValue(game);

    const result = await getGameBySlug("catan");

    expect(mocks.game.findUnique).toHaveBeenCalledWith({
      where: { id: "catan" },
      include: { files: { orderBy: { uploadedAt: "desc" } } },
    });
    expect(result?.id).toBe("catan");
    expect(mocks.game.findMany).not.toHaveBeenCalled();
  });

  it("normaliza slug codificado", async () => {
    mocks.game.findUnique.mockResolvedValue(buildDbGame({ id: "cafe" }));

    await getGameBySlug("%20CAFE%20");

    expect(mocks.game.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cafe" } })
    );
  });

  it("encontra por nome usando candidatos", async () => {
    mocks.game.findUnique.mockResolvedValue(null);
    mocks.game.findMany.mockResolvedValueOnce([buildDbGame({ name: "Wingspan" })]);

    const result = await getGameBySlug("wingspan");

    expect(result?.name).toBe("Wingspan");
    expect(mocks.game.findMany).toHaveBeenCalledTimes(1);
  });

  it("encontra por nome original", async () => {
    mocks.game.findUnique.mockResolvedValue(null);
    mocks.game.findMany.mockResolvedValueOnce([
      buildDbGame({ name: "Nome Traduzido", originalName: "Original Name" }),
    ]);

    const result = await getGameBySlug("original-name");

    expect(result?.name).toBe("Nome Traduzido");
  });

  it("recorre à busca completa quando candidatos não batem", async () => {
    mocks.game.findUnique.mockResolvedValue(null);
    mocks.game.findMany
      .mockResolvedValueOnce([buildDbGame({ name: "Outro" })])
      .mockResolvedValueOnce([buildDbGame({ name: "Catan" })]);

    const result = await getGameBySlug("catan");

    expect(result?.name).toBe("Catan");
    expect(mocks.game.findMany).toHaveBeenCalledTimes(2);
  });

  it("retorna null quando nada corresponde", async () => {
    mocks.game.findUnique.mockResolvedValue(null);
    mocks.game.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await expect(getGameBySlug("inexistente")).resolves.toBeNull();
  });

  it("busca todos os jogos quando o slug não tem palavras", async () => {
    mocks.game.findUnique.mockResolvedValue(null);
    mocks.game.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildDbGame({ name: "Qualquer" })]);

    await getGameBySlug("-");

    expect(mocks.game.findMany).toHaveBeenNthCalledWith(1, {
      where: undefined,
      include: { files: { orderBy: { uploadedAt: "desc" } } },
    });
  });
});
