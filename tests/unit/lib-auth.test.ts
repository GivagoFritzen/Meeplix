import { describe, it, expect, beforeEach, vi } from "vitest";
import { authOptions, getCurrentUser } from "@/lib/auth";

const mocks = vi.hoisted(() => ({
  session: null as { user?: { id: string; email: string; name?: string | null } } | null,
  findUnique: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(async () => mocks.session),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => config),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { adminUser: { findUnique: mocks.findUnique } },
  default: {},
}));

vi.mock("@/lib/auth-utils", () => ({
  verifyPassword: mocks.verifyPassword,
}));

interface CredentialsProviderConfig {
  authorize: (credentials: Record<string, string>) => Promise<unknown>;
}

const provider = authOptions.providers[0] as unknown as CredentialsProviderConfig;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = null;
});

describe("credentials provider", () => {
  it("rejeita credenciais inválidas", async () => {
    await expect(provider.authorize({ email: "invalido", password: "" })).resolves.toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejeita usuário inexistente", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(
      provider.authorize({ email: "admin@example.com", password: "senha" })
    ).resolves.toBeNull();
  });

  it("busca o e-mail em minúsculas", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await provider.authorize({ email: "ADMIN@Example.COM", password: "senha" });

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
    });
  });

  it("rejeita usuário sem hash de senha", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      name: "Admin",
      passwordHash: null,
    });

    await expect(
      provider.authorize({ email: "admin@example.com", password: "senha" })
    ).resolves.toBeNull();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
  });

  it("rejeita senha incorreta", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hash",
    });
    mocks.verifyPassword.mockResolvedValue(false);

    await expect(
      provider.authorize({ email: "admin@example.com", password: "senha" })
    ).resolves.toBeNull();
  });

  it("retorna o usuário autenticado", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hash",
    });
    mocks.verifyPassword.mockResolvedValue(true);

    await expect(
      provider.authorize({ email: "admin@example.com", password: "senha" })
    ).resolves.toEqual({
      id: "user-1",
      email: "admin@example.com",
      name: "Admin",
    });
    expect(mocks.verifyPassword).toHaveBeenCalledWith("senha", "hash");
  });
});

describe("getCurrentUser", () => {
  it("retorna null sem sessão", async () => {
    mocks.session = null;

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("retorna o usuário da sessão", async () => {
    const user = { id: "user-1", email: "admin@example.com", name: "Admin" };
    mocks.session = { user };

    await expect(getCurrentUser()).resolves.toEqual(user);
  });

  it("retorna null quando a sessão não tem usuário", async () => {
    mocks.session = {};

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
