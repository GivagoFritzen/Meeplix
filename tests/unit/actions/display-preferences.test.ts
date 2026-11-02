import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDisplayPreferences,
  updateDisplayPreferences,
} from "@/app/actions/display-preferences";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteConfig: {
      findFirst: mocks.findFirst,
      update: mocks.update,
      create: mocks.create,
    },
  },
  default: {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

const preferences = {
  hideDesigners: false,
  hidePublishers: true,
  hideArtists: true,
  hideTags: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
});

describe("getDisplayPreferences", () => {
  it("retorna padrões quando não há configuração", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(getDisplayPreferences()).resolves.toEqual({
      hideDesigners: true,
      hidePublishers: false,
      hideArtists: false,
      hideTags: false,
    });
  });

  it("retorna valores salvos", async () => {
    mocks.findFirst.mockResolvedValue({ id: "config-1", ...preferences });

    await expect(getDisplayPreferences()).resolves.toEqual(preferences);
  });
});

describe("updateDisplayPreferences", () => {
  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(updateDisplayPreferences(preferences)).rejects.toThrow("Não autorizado");
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("valida os dados recebidos", async () => {
    await expect(
      updateDisplayPreferences({ hideDesigners: "sim" } as never)
    ).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("atualiza configuração existente", async () => {
    mocks.findFirst.mockResolvedValue({ id: "config-1" });
    mocks.update.mockResolvedValue({});

    const result = await updateDisplayPreferences(preferences);

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "config-1" },
      data: preferences,
    });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/colecao");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/configuracoes");
  });

  it("cria configuração quando não existe", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({});

    await updateDisplayPreferences(preferences);

    expect(mocks.create).toHaveBeenCalledWith({ data: preferences });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
