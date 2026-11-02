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
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando campos obrigatórios ausentes", () => {
    const result = GameCreateSchema.safeParse({
      name: "Jogo",
    });
    expect(result.success).toBe(false);
  });
});
