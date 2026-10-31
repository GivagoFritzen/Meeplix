import { describe, it, expect } from "vitest";
import { buildGameWhere } from "@/lib/game-filters";
import type { GameFilterInput } from "@/lib/validations/game";

function build(input: Record<string, unknown>) {
  return buildGameWhere({ page: 1, limit: 24, ...input } as GameFilterInput);
}

describe("buildGameWhere", () => {
  it("retorna objeto vazio sem filtros", () => {
    expect(build({})).toEqual({});
  });

  it("monta condição de busca textual", () => {
    const where = build({ search: "catan" }) as { OR: unknown };
    expect(where.OR).toEqual([
      { name: { contains: "catan", mode: "insensitive" } },
      { originalName: { contains: "catan", mode: "insensitive" } },
      { designer: { contains: "catan", mode: "insensitive" } },
      { publisher: { contains: "catan", mode: "insensitive" } },
      { mechanics: { hasSome: ["catan"] } },
    ]);
  });

  it("filtro solo limita pelo número máximo de jogadores", () => {
    expect(build({ players: "solo" })).toEqual({
      AND: [{ minPlayers: { lte: 1 } }],
    });
  });

  it("filtro 2 exige suporte a dois jogadores", () => {
    expect(build({ players: "2" })).toEqual({
      AND: [{ maxPlayers: { gte: 2 } }, { minPlayers: { lte: 2 } }],
    });
  });

  it("filtro 3-4 exige faixa de três a quatro jogadores", () => {
    expect(build({ players: "3-4" })).toEqual({
      AND: [{ maxPlayers: { gte: 3 } }, { minPlayers: { lte: 4 } }],
    });
  });

  it("filtro 5+ não impõe limite superior", () => {
    expect(build({ players: "5+" })).toEqual({
      AND: [{ maxPlayers: { gte: 5 } }],
    });
  });

  it("ignora players all e valores vazios", () => {
    expect(build({ players: "all", minPlayers: "", maxPlayers: "" })).toEqual({});
  });

  it("aceita mínimo e máximo explícitos", () => {
    expect(build({ minPlayers: "2", maxPlayers: "5" })).toEqual({
      AND: [{ maxPlayers: { gte: 2 } }, { minPlayers: { lte: 5 } }],
    });
  });

  it("ignora mínimo e máximo não numéricos", () => {
    expect(build({ minPlayers: "abc", maxPlayers: "x" })).toEqual({});
  });

  it("combina players com mínimo e máximo", () => {
    expect(build({ players: "2", minPlayers: "3" })).toEqual({
      AND: [
        { maxPlayers: { gte: 2 } },
        { minPlayers: { lte: 2 } },
        { maxPlayers: { gte: 3 } },
      ],
    });
  });

  it.each([
    ["quick", { minPlaytime: { lte: 30 } }],
    ["medium", { minPlaytime: { gte: 30, lte: 60 } }],
    ["long", { minPlaytime: { gte: 90 } }],
  ] as const)("aplica duração %s", (duration, expected) => {
    expect(build({ duration })).toEqual(expected);
  });

  it("ignora duração all", () => {
    expect(build({ duration: "all" })).toEqual({});
  });

  it.each([
    ["light", { weight: { lt: 2.0 } }],
    ["medium", { weight: { gte: 2.0, lt: 3.0 } }],
    ["heavy", { weight: { gte: 3.0 } }],
  ] as const)("aplica complexidade %s", (complexity, expected) => {
    expect(build({ complexity })).toEqual(expected);
  });

  it("ignora complexidade all", () => {
    expect(build({ complexity: "all" })).toEqual({});
  });

  it("aplica mecânica específica", () => {
    expect(build({ mechanic: "Deck Building" })).toEqual({
      mechanics: { has: "Deck Building" },
    });
  });

  it("ignora mecânica all", () => {
    expect(build({ mechanic: "all" })).toEqual({});
  });

  it("combina vários filtros", () => {
    const where = build({
      search: "wingspan",
      players: "3-4",
      duration: "medium",
      complexity: "heavy",
      mechanic: "Engine Building",
    });

    expect(where).toEqual({
      OR: expect.any(Array),
      AND: [{ maxPlayers: { gte: 3 } }, { minPlayers: { lte: 4 } }],
      minPlaytime: { gte: 30, lte: 60 },
      weight: { gte: 3.0 },
      mechanics: { has: "Engine Building" },
    });
  });
});
