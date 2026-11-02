import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";

describe("auth-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("gera hash de senha", async () => {
    const hash = await hashPassword("senha123");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
    expect(hash).not.toBe("senha123");
  });

  it("gera hashes diferentes para a mesma senha (salt)", async () => {
    const hash1 = await hashPassword("senha123");
    const hash2 = await hashPassword("senha123");
    expect(hash1).not.toBe(hash2);
  });

  it("verifica senha correta", async () => {
    const hash = await hashPassword("senha123");
    const isValid = await verifyPassword("senha123", hash);
    expect(isValid).toBe(true);
  });

  it("rejeita senha incorreta", async () => {
    const hash = await hashPassword("senha123");
    const isValid = await verifyPassword("senhaErrada", hash);
    expect(isValid).toBe(false);
  });

  it("rejeita hash inválido", async () => {
    const isValid = await verifyPassword("qualquer", "não-é-um-hash-valido");
    expect(isValid).toBe(false);
  });

  it("não registra senhas em logs (spy em console)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await hashPassword("senha-secreta");
    await verifyPassword("senha-secreta", "algumhash");

    expect(logSpy).not.toHaveBeenCalledWith("senha-secreta");
    expect(errorSpy).not.toHaveBeenCalledWith("senha-secreta");

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
