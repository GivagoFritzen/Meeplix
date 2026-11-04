import { describe, it, expect } from "vitest";
import { GameCreateSchema } from "@/lib/validations/game";

describe("GameCreateSchema - campos obrigatórios", () => {
  it("aceita todos os campos obrigatórios com opcionais ausentes", () => {
    const result = GameCreateSchema.safeParse({
      name: "Jogo",
      minPlayers: 1,
      maxPlayers: 2,
      minPlaytime: 30,
      bestPlayers: 2,
      minAge: 10,
      bggRating: 7.8,
      bggRank: 200,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando campos obrigatórios ausentes", () => {
    const result = GameCreateSchema.safeParse({
      name: "Jogo",
    });
    expect(result.success).toBe(false);
  });

  it("aceita bestPlayers ausente", () => {
    const result = GameCreateSchema.safeParse({
      name: "Jogo",
      minPlayers: 1,
      maxPlayers: 2,
      minPlaytime: 30,
      minAge: 10,
      bggRating: 7.8,
      bggRank: 200,
    });
    expect(result.success).toBe(true);
  });

  it("usa mensagem Campo obrigatório para campos ausentes", () => {
    const result = GameCreateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;

    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Campo obrigatório");
    expect(messages).not.toContain("Required");
  });
});
