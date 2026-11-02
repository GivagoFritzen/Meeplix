import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChangePasswordSchema } from "@/lib/validations/auth";

describe("ChangePasswordSchema", () => {
  it("aceita senhas válidas", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "senhaAtual123",
      newPassword: "NovaSenha123",
      confirmNewPassword: "NovaSenha123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentPassword).toBe("senhaAtual123");
      expect(result.data.newPassword).toBe("NovaSenha123");
    }
  });

  it("rejeita senha atual vazia", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "NovaSenha123",
      confirmNewPassword: "NovaSenha123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const field = result.error.errors.find((e) => e.path.includes("currentPassword"));
      expect(field).toBeDefined();
      expect(field?.message).toBe("Senha atual é obrigatória");
    }
  });

  it("rejeita nova senha curta", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "senhaAtual123",
      newPassword: "curta",
      confirmNewPassword: "curta",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const field = result.error.errors.find((e) => e.path.includes("newPassword"));
      expect(field).toBeDefined();
    }
  });

  it("rejeita quando senhas não conferem", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "senhaAtual123",
      newPassword: "NovaSenha123",
      confirmNewPassword: "OutraSenha123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const field = result.error.errors.find((e) => e.path.includes("confirmNewPassword"));
      expect(field).toBeDefined();
      expect(field?.message).toBe("Senhas não conferem");
    }
  });

  it("rejeita campos obrigatórios ausentes", () => {
    const result = ChangePasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejeita valores vazios em todos os campos", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita tipos incorretos", () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 123 as unknown as string,
      newPassword: "NovaSenha123",
      confirmNewPassword: "NovaSenha123",
    });
    expect(result.success).toBe(false);
  });
});
