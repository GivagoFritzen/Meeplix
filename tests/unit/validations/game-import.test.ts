import { describe, it, expect } from "vitest";
import { GameImportRequestSchema } from "@/lib/validations/game-import";

describe("GameImportRequestSchema", () => {
  it("aceita apenas ludopediaUrl", () => {
    const result = GameImportRequestSchema.safeParse({
      ludopediaUrl: "https://ludopedia.com.br/jogo/cascadia",
    });
    expect(result.success).toBe(true);
  });

  it("aceita apenas bggUrl", () => {
    const result = GameImportRequestSchema.safeParse({
      bggUrl: "https://boardgamegeek.com/boardgame/12345",
    });
    expect(result.success).toBe(true);
  });

  it("aceita ambas as URLs", () => {
    const result = GameImportRequestSchema.safeParse({
      ludopediaUrl: "https://ludopedia.com.br/jogo/cascadia",
      bggUrl: "https://boardgamegeek.com/boardgame/12345",
    });
    expect(result.success).toBe(true);
  });

  it("aceita gameId opcional válido", () => {
    const result = GameImportRequestSchema.safeParse({
      ludopediaUrl: "https://ludopedia.com.br/jogo/cascadia",
      gameId: "clx1234567890abcdef",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita gameId inválido (não cuid)", () => {
    const result = GameImportRequestSchema.safeParse({
      ludopediaUrl: "https://ludopedia.com.br/jogo/cascadia",
      gameId: "não-é-cuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quando nenhuma URL é informada", () => {
    const result = GameImportRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === "custom")).toBe(true);
    }
  });

  it("rejeita quando ambas as URLs estão vazias", () => {
    const result = GameImportRequestSchema.safeParse({
      ludopediaUrl: "",
      bggUrl: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita ludopediaUrl inválida", () => {
    const result = GameImportRequestSchema.safeParse({
      ludopediaUrl: "não é uma url",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita bggUrl inválida", () => {
    const result = GameImportRequestSchema.safeParse({
      bggUrl: "não é uma url",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita campos adicionais (strict)", () => {
    const result = GameImportRequestSchema.safeParse({
      ludopediaUrl: "https://ludopedia.com.br/jogo/cascadia",
      campoExtra: "valor" as any,
    });
    expect(result.success).toBe(false);
  });

  it("converte string vazia em undefined para URLs opcionais", () => {
    const result = GameImportRequestSchema.safeParse({
      ludopediaUrl: " ",
      bggUrl: "https://boardgamegeek.com/boardgame/12345",
    });
    expect(result.success).toBe(true);
  });
});
