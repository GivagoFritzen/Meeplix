import { describe, it, expect, beforeEach, vi } from "vitest";
import { changePassword } from "@/app/actions/auth";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
  default: {},
}));

vi.mock("@/lib/auth-utils", () => ({
  verifyPassword: mocks.verifyPassword,
  hashPassword: mocks.hashPassword,
}));

const validInput = {
  currentPassword: "senha-atual",
  newPassword: "nova-senha-123",
  confirmNewPassword: "nova-senha-123",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  mocks.findUnique.mockResolvedValue({ id: "user-1", passwordHash: "hash-antigo" });
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.hashPassword.mockResolvedValue("hash-novo");
  mocks.update.mockResolvedValue({ id: "user-1" });
});

describe("changePassword", () => {
  it("rejeita dados inválidos", async () => {
    await expect(
      changePassword({ ...validInput, newPassword: "curta", confirmNewPassword: "curta" })
    ).rejects.toThrow();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejeita quando as senhas não conferem", async () => {
    await expect(
      changePassword({ ...validInput, confirmNewPassword: "outra-senha" })
    ).rejects.toThrow();
  });

  it("exige usuário autenticado", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(changePassword(validInput)).rejects.toThrow("Não autorizado");
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejeita usuário inexistente", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(changePassword(validInput)).rejects.toThrow("Usuário não encontrado");
  });

  it("rejeita senha atual incorreta", async () => {
    mocks.verifyPassword.mockResolvedValue(false);

    await expect(changePassword(validInput)).rejects.toThrow("Senha atual incorreta");
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("atualiza o hash da senha", async () => {
    const result = await changePassword(validInput);

    expect(mocks.verifyPassword).toHaveBeenCalledWith("senha-atual", "hash-antigo");
    expect(mocks.hashPassword).toHaveBeenCalledWith("nova-senha-123");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hash-novo" },
    });
    expect(result).toEqual({ success: true });
  });
});
