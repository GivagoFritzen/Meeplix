import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createGame,
  updateGame,
  deleteGame,
  getGames,
  getGameById,
  getGameBySlug,
  searchGames,
} from "@/app/actions/games";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  game: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { game: mocks.game },
  default: { game: mocks.game },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

const validCreateInput = {
  name: "Catan",
  minPlayers: 3,
  maxPlayers: 4,
  minPlaytime: 60,
  bestPlayers: 4,
  minAge: 10,
  mechanics: [],
  categories: [],
};

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
    files: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
});

describe("createGame", () => {
  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(createGame(validCreateInput)).rejects.toThrow("Não autorizado");
    expect(mocks.game.create).not.toHaveBeenCalled();
  });

  it("valida os dados antes de criar", async () => {
    await expect(createGame({ ...validCreateInput, name: "" })).rejects.toThrow();
    expect(mocks.game.create).not.toHaveBeenCalled();
  });

  it("cria jogo com listas padrão e revalida páginas", async () => {
    const created = { id: "game-1", ...validCreateInput };
    mocks.game.create.mockResolvedValue(created);

    const result = await createGame(validCreateInput);

    expect(mocks.game.create).toHaveBeenCalledWith({
      data: {
        ...validCreateInput,
        mechanics: [],
        categories: [],
        links: {},
      },
    });
    expect(result).toEqual({ success: true, game: created });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/jogos");
  });

  it("preserva mecânicas, categorias e links informados", async () => {
    mocks.game.create.mockResolvedValue({ id: "game-1" });

    await createGame({
      ...validCreateInput,
      mechanics: ["Trading"],
      categories: ["Economy"],
      links: { bgg: "https://boardgamegeek.com/boardgame/13" },
    });

    expect(mocks.game.create).toHaveBeenCalledWith({
      data: {
        ...validCreateInput,
        mechanics: ["Trading"],
        categories: ["Economy"],
        links: { bgg: "https://boardgamegeek.com/boardgame/13" },
      },
    });
  });
});

describe("updateGame", () => {
  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(updateGame("game-1", { name: "Novo" })).rejects.toThrow("Não autorizado");
    expect(mocks.game.update).not.toHaveBeenCalled();
  });

  it("atualiza apenas campos enviados", async () => {
    mocks.game.update.mockResolvedValue({ id: "game-1", name: "Novo" });

    const result = await updateGame("game-1", { name: "Novo" });

    expect(mocks.game.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { name: "Novo" },
    });
    expect(result).toEqual({ success: true, game: { id: "game-1", name: "Novo" } });
  });

  it("inclui listas quando informadas", async () => {
    mocks.game.update.mockResolvedValue({ id: "game-1" });

    await updateGame("game-1", {
      mechanics: ["Drafting"],
      categories: ["Fantasy"],
      links: { manual: "https://example.com/manual.pdf" },
    });

    expect(mocks.game.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        mechanics: ["Drafting"],
        categories: ["Fantasy"],
        links: { manual: "https://example.com/manual.pdf" },
      },
    });
  });

  it("rejeita dados inválidos", async () => {
    await expect(updateGame("game-1", { coverImage: "url-invalida" })).rejects.toThrow();
    expect(mocks.game.update).not.toHaveBeenCalled();
  });
});

describe("deleteGame", () => {
  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(deleteGame("game-1")).rejects.toThrow("Não autorizado");
    expect(mocks.game.delete).not.toHaveBeenCalled();
  });

  it("remove o jogo e revalida páginas", async () => {
    mocks.game.delete.mockResolvedValue({ id: "game-1" });

    const result = await deleteGame("game-1");

    expect(mocks.game.delete).toHaveBeenCalledWith({ where: { id: "game-1" } });
    expect(result).toEqual({ success: true });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(3);
  });
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
});

describe("getGameById", () => {
  it("retorna null quando o jogo não existe", async () => {
    mocks.game.findUnique.mockResolvedValue(null);

    await expect(getGameById("missing")).resolves.toBeNull();
  });

  it("prioriza capa de arquivo e converte valores", async () => {
    mocks.game.findUnique.mockResolvedValue(
      buildDbGame({
        coverImage: "https://example.com/fallback.jpg",
        files: [
          { id: "f1", type: "COVER", path: "games/game-1/cover.png", size: BigInt(123) },
        ],
        bggRating: "7.9",
        ludoRating: "8.1",
        weight: "3.2",
      })
    );

    const result = await getGameById("game-1");

    expect(result).toMatchObject({
      coverImage: "games/game-1/cover.png",
      bggRating: 7.9,
      ludoRating: 8.1,
      weight: 3.2,
    });
    expect(result?.files[0].size).toBe(123);
  });

  it("usa coverImage como fallback", async () => {
    mocks.game.findUnique.mockResolvedValue(
      buildDbGame({ coverImage: "https://example.com/cover.jpg" })
    );

    const result = await getGameById("game-1");

    expect(result?.coverImage).toBe("https://example.com/cover.jpg");
  });

  it("converte coverImageData em data URI", async () => {
    mocks.game.findUnique.mockResolvedValue(
      buildDbGame({
        coverImageData: { base64: "YWJj", mimeType: "image/png" },
      })
    );

    const result = await getGameById("game-1");

    expect(result?.coverImage).toBe("data:image/png;base64,YWJj");
  });

  it("retorna capa nula quando não há dados", async () => {
    mocks.game.findUnique.mockResolvedValue(buildDbGame());

    const result = await getGameById("game-1");

    expect(result?.coverImage).toBeNull();
    expect(result?.bggRating).toBeNull();
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

describe("searchGames", () => {
  it("retorna lista vazia para busca em branco", async () => {
    const result = await searchGames("   ");

    expect(result).toEqual([]);
    expect(mocks.game.findMany).not.toHaveBeenCalled();
  });

  it("busca por nome e nome original com limite", async () => {
    const games = [{ id: "game-1", name: "Catan", year: 1995, coverImage: null }];
    mocks.game.findMany.mockResolvedValue(games);

    const result = await searchGames("catan", 5);

    expect(mocks.game.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "catan", mode: "insensitive" } },
          { originalName: { contains: "catan", mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
      select: { id: true, name: true, year: true, coverImage: true },
    });
    expect(result).toEqual(games);
  });
});
