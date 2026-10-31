import { describe, it, expect } from "vitest";
import {
  GameCreateSchema,
  GameFilterSchema,
  GameUpdateSchema,
  LoginSchema,
} from "@/lib/validations/game";

const validGame = {
  name: "Catan",
  minPlayers: 3,
  maxPlayers: 4,
  minPlaytime: 60,
  bestPlayers: 4,
  minAge: 10,
};

describe("GameCreateSchema", () => {
  it("aplica padrões de listas", () => {
    const parsed = GameCreateSchema.parse(validGame);

    expect(parsed.mechanics).toEqual([]);
    expect(parsed.categories).toEqual([]);
  });

  it("converte números enviados como texto", () => {
    const parsed = GameCreateSchema.parse({
      ...validGame,
      year: "1995",
      bggRating: "8,5",
      weight: "2.75",
    });

    expect(parsed.year).toBe(1995);
    expect(parsed.bggRating).toBe(8.5);
    expect(parsed.weight).toBe(2.75);
  });

  it("trata NaN em campos opcionais como ausente", () => {
    const parsed = GameCreateSchema.parse({
      ...validGame,
      year: Number.NaN,
      bggRank: Number.NaN,
      ludoRank: Number.NaN,
      interaction: Number.NaN,
      luck: Number.NaN,
      downtime: Number.NaN,
      replayability: Number.NaN,
    });

    expect(parsed.year).toBeUndefined();
    expect(parsed.bggRank).toBeUndefined();
    expect(parsed.ludoRank).toBeUndefined();
    expect(parsed.interaction).toBeUndefined();
    expect(parsed.luck).toBeUndefined();
    expect(parsed.downtime).toBeUndefined();
    expect(parsed.replayability).toBeUndefined();
  });

  it("rejeita NaN em campos obrigatórios", () => {
    expect(
      GameCreateSchema.safeParse({ ...validGame, minPlayers: Number.NaN }).success
    ).toBe(false);
    expect(
      GameCreateSchema.safeParse({ ...validGame, minPlaytime: Number.NaN }).success
    ).toBe(false);
  });

  it("rejeita inteiro enviado com separador decimal", () => {
    expect(
      GameCreateSchema.safeParse({ ...validGame, minPlayers: "3.5" }).success
    ).toBe(false);
  });

  it("rejeita nome vazio e jogadores invertidos", () => {
    expect(GameCreateSchema.safeParse({ ...validGame, name: "" }).success).toBe(false);
    expect(
      GameCreateSchema.safeParse({ ...validGame, minPlayers: 5, maxPlayers: 2 }).success
    ).toBe(false);
  });

  it("normaliza capa e links vazios", () => {
    const parsed = GameCreateSchema.parse({
      ...validGame,
      coverImage: "",
      links: { bgg: "", ludopedia: "", manual: "" },
    });

    expect(parsed.coverImage).toBeNull();
    expect(parsed.links).toEqual({ bgg: null, ludopedia: null, manual: null });
  });

  it("aceita data URI como capa", () => {
    const parsed = GameCreateSchema.parse({
      ...validGame,
      coverImage: "data:image/png;base64,YWJj",
    });

    expect(parsed.coverImage).toBe("data:image/png;base64,YWJj");
  });

  it("rejeita capa e URLs inválidas", () => {
    expect(
      GameCreateSchema.safeParse({ ...validGame, coverImage: "nao-e-url" }).success
    ).toBe(false);
    expect(
      GameCreateSchema.safeParse({
        ...validGame,
        links: { bgg: "nao-e-url" },
      }).success
    ).toBe(false);
  });
});

describe("GameUpdateSchema", () => {
  it("aceita atualização vazia", () => {
    expect(GameUpdateSchema.parse({})).toEqual({});
  });

  it("ignora NaN em campos opcionais", () => {
    const parsed = GameUpdateSchema.parse({ bggRank: Number.NaN, name: "Novo" });

    expect(parsed).toEqual({ bggRank: undefined, name: "Novo" });
  });
});

describe("GameFilterSchema", () => {
  it("aplica paginação padrão", () => {
    expect(GameFilterSchema.parse({})).toEqual({ page: 1, limit: 24 });
  });

  it("rejeita filtros fora do enum", () => {
    expect(GameFilterSchema.safeParse({ players: "invalido" }).success).toBe(false);
    expect(GameFilterSchema.safeParse({ sort: "peso" }).success).toBe(false);
    expect(GameFilterSchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("valida e-mail e senha", () => {
    expect(LoginSchema.safeParse({ email: "admin@example.com", password: "x" }).success).toBe(
      true
    );
    expect(LoginSchema.safeParse({ email: "invalido", password: "x" }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: "admin@example.com", password: "" }).success).toBe(
      false
    );
  });
});
