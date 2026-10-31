import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  uploadGameFiles,
  deleteGameFiles,
  deleteGameFile,
  listGameFiles,
  setCoverImage,
} from "@/app/actions/files";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  saveFile: vi.fn(),
  deleteFile: vi.fn(),
  validateFile: vi.fn(),
  game: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  gameFile: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { game: mocks.game, gameFile: mocks.gameFile },
  default: {},
}));

vi.mock("@/lib/storage", () => ({
  saveFile: mocks.saveFile,
  deleteFile: mocks.deleteFile,
  validateFile: mocks.validateFile,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

function fileInput(overrides: Partial<{ name: string; type: string; size: number }> = {}) {
  return {
    buffer: Buffer.from("conteudo"),
    name: "cover.png",
    type: "image/png",
    size: 8,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  mocks.validateFile.mockReturnValue({ valid: true });
  mocks.saveFile.mockResolvedValue({
    path: "games/game-1/uuid.png",
    filename: "uuid.png",
    size: 8,
  });
  mocks.gameFile.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "file-1",
    ...data,
  }));
});

describe("uploadGameFiles", () => {
  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(uploadGameFiles("game-1", [fileInput()])).rejects.toThrow("Não autorizado");
    expect(mocks.game.findUnique).not.toHaveBeenCalled();
  });

  it("rejeita jogo inexistente", async () => {
    mocks.game.findUnique.mockResolvedValue(null);

    await expect(uploadGameFiles("game-1", [fileInput()])).rejects.toThrow("Jogo não encontrado");
  });

  it("registra arquivo válido com tipo padrão", async () => {
    mocks.game.findUnique.mockResolvedValue({ id: "game-1" });

    const result = await uploadGameFiles("game-1", [fileInput()]);

    expect(mocks.saveFile).toHaveBeenCalledWith("game-1", Buffer.from("conteudo"), "cover.png");
    expect(mocks.gameFile.create).toHaveBeenCalledWith({
      data: {
        gameId: "game-1",
        originalName: "cover.png",
        displayName: "cover.png",
        mimeType: "image/png",
        extension: "png",
        size: BigInt(8),
        path: "games/game-1/uuid.png",
        type: "OTHER",
      },
    });
    expect(result.success).toBe(true);
    expect(result.results[0]).toMatchObject({ success: true, file: { id: "file-1" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/jogos");
  });

  it("aceita tipo explícito", async () => {
    mocks.game.findUnique.mockResolvedValue({ id: "game-1" });

    await uploadGameFiles("game-1", [fileInput()], "COVER");

    expect(mocks.gameFile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "COVER" }) })
    );
  });

  it("retorna erro de validação e continua com os demais", async () => {
    mocks.game.findUnique.mockResolvedValue({ id: "game-1" });
    mocks.validateFile
      .mockReturnValueOnce({ valid: false, error: "Tipo inválido" })
      .mockReturnValueOnce({ valid: true });

    const result = await uploadGameFiles("game-1", [
      fileInput({ name: "script.exe", type: "application/x-msdownload" }),
      fileInput({ name: "capa.png" }),
    ]);

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({
      success: false,
      error: "Tipo inválido",
      fileName: "script.exe",
    });
    expect(result.results[1].success).toBe(true);
  });

  it("captura falha ao salvar arquivo", async () => {
    mocks.game.findUnique.mockResolvedValue({ id: "game-1" });
    mocks.saveFile.mockRejectedValue(new Error("disco cheio"));

    const result = await uploadGameFiles("game-1", [fileInput()]);

    expect(result.results[0]).toEqual({
      success: false,
      error: "Erro ao salvar arquivo",
      fileName: "cover.png",
    });
  });
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

  it("deleteGameFile delega para deleteGameFiles", async () => {
    mocks.gameFile.findMany.mockResolvedValue([]);

    const result = await deleteGameFile("file-1");

    expect(result).toEqual({ success: true, deleted: [] });
    expect(mocks.gameFile.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["file-1"] } },
    });
  });
});

describe("listGameFiles", () => {
  it("lista arquivos convertendo tamanho para número", async () => {
    mocks.gameFile.findMany.mockResolvedValue([
      { id: "file-1", gameId: "game-1", size: BigInt(42) },
    ]);

    const result = await listGameFiles("game-1");

    expect(mocks.gameFile.findMany).toHaveBeenCalledWith({
      where: { gameId: "game-1" },
      orderBy: { uploadedAt: "desc" },
    });
    expect(result[0].size).toBe(42);
  });
});

describe("setCoverImage", () => {
  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(setCoverImage("game-1", "file-1")).rejects.toThrow("Não autorizado");
  });

  it("rejeita arquivo inexistente ou de outro jogo", async () => {
    mocks.gameFile.findUnique.mockResolvedValue(null);
    await expect(setCoverImage("game-1", "file-1")).rejects.toThrow("Arquivo não encontrado");

    mocks.gameFile.findUnique.mockResolvedValue({ id: "file-1", gameId: "game-2", path: "x.png" });
    await expect(setCoverImage("game-1", "file-1")).rejects.toThrow("Arquivo não encontrado");
  });

  it("define a capa e reclassifica as demais", async () => {
    mocks.gameFile.findUnique.mockResolvedValue({
      id: "file-1",
      gameId: "game-1",
      path: "games/game-1/cover.png",
    });
    mocks.game.update.mockResolvedValue({});
    mocks.gameFile.updateMany.mockResolvedValue({ count: 1 });
    mocks.gameFile.update.mockResolvedValue({});

    const result = await setCoverImage("game-1", "file-1");

    expect(mocks.game.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { coverImage: "games/game-1/cover.png" },
    });
    expect(mocks.gameFile.updateMany).toHaveBeenCalledWith({
      where: { gameId: "game-1", type: "COVER" },
      data: { type: "IMAGE" },
    });
    expect(mocks.gameFile.update).toHaveBeenCalledWith({
      where: { id: "file-1" },
      data: { type: "COVER" },
    });
    expect(result).toEqual({ success: true });
  });
});
