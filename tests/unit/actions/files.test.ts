import { describe, it, expect, beforeEach, vi } from "vitest";
import { deleteGameFiles } from "@/app/actions/files";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  deleteFile: vi.fn(),
  game: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  gameFile: {
    findMany: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { game: mocks.game, gameFile: mocks.gameFile },
}));

vi.mock("@/lib/storage", () => ({
  deleteFile: mocks.deleteFile,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
});

describe("deleteGameFiles", () => {
  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(deleteGameFiles(["file-1"])).rejects.toThrow("Não autorizado");
  });

  it("não consulta o banco quando a lista fica vazia", async () => {
    const result = await deleteGameFiles(["", ""]);

    expect(result).toEqual({ success: true, deleted: [] });
    expect(mocks.gameFile.findMany).not.toHaveBeenCalled();
  });

  it("remove arquivos e limpa capa referenciada", async () => {
    mocks.gameFile.findMany.mockResolvedValue([
      { id: "file-1", gameId: "game-1", path: "games/game-1/cover.png", type: "COVER" },
    ]);
    mocks.deleteFile.mockResolvedValue(true);
    mocks.gameFile.delete.mockResolvedValue({});
    mocks.game.findUnique.mockResolvedValue({ coverImage: "games/game-1/cover.png" });
    mocks.game.update.mockResolvedValue({});

    const result = await deleteGameFiles(["file-1", "file-1"]);

    expect(mocks.gameFile.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["file-1"] } },
    });
    expect(mocks.deleteFile).toHaveBeenCalledWith("games/game-1/cover.png");
    expect(mocks.gameFile.delete).toHaveBeenCalledWith({ where: { id: "file-1" } });
    expect(mocks.game.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { coverImage: null },
    });
    expect(result).toEqual({ success: true, deleted: ["file-1"] });
  });

  it("não limpa capa quando o caminho é diferente", async () => {
    mocks.gameFile.findMany.mockResolvedValue([
      { id: "file-1", gameId: "game-1", path: "games/game-1/cover.png", type: "COVER" },
    ]);
    mocks.deleteFile.mockResolvedValue(true);
    mocks.gameFile.delete.mockResolvedValue({});
    mocks.game.findUnique.mockResolvedValue({ coverImage: "games/game-1/outra.png" });

    await deleteGameFiles(["file-1"]);

    expect(mocks.game.update).not.toHaveBeenCalled();
  });

  it("ignora arquivos que não são capa", async () => {
    mocks.gameFile.findMany.mockResolvedValue([
      { id: "file-1", gameId: "game-1", path: "games/game-1/manual.pdf", type: "MANUAL" },
    ]);
    mocks.deleteFile.mockResolvedValue(true);
    mocks.gameFile.delete.mockResolvedValue({});

    await deleteGameFiles(["file-1"]);

    expect(mocks.game.findUnique).not.toHaveBeenCalled();
  });

  it("lança erro quando algum arquivo falha", async () => {
    mocks.gameFile.findMany.mockResolvedValue([
      { id: "file-1", gameId: "game-1", path: "games/game-1/cover.png", type: "COVER" },
      { id: "file-2", gameId: "game-1", path: "games/game-1/manual.pdf", type: "MANUAL" },
    ]);
    mocks.deleteFile
      .mockRejectedValueOnce(new Error("sem permissão"))
      .mockResolvedValueOnce(true);
    mocks.gameFile.delete.mockResolvedValue({});
    mocks.game.findUnique.mockResolvedValue({ coverImage: null });

    await expect(deleteGameFiles(["file-1", "file-2"])).rejects.toThrow(
      "Não foi possível remover 1 arquivo(s). Tente novamente."
    );
    expect(mocks.gameFile.delete).toHaveBeenCalledTimes(1);
  });
});
