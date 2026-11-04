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
  bggRating: 7.8,
  bggRank: 200,
  ludoRating: 8.2,
  ludoRank: 10,
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
      bggRating: Number.NaN,
      bggRank: Number.NaN,
      interaction: Number.NaN,
      luck: Number.NaN,
      downtime: Number.NaN,
      replayability: Number.NaN,
    });

    expect(parsed.year).toBeUndefined();
    expect(parsed.bggRating).toBeUndefined();
    expect(parsed.bggRank).toBeUndefined();
    expect(parsed.interaction).toBeUndefined();
    expect(parsed.luck).toBeUndefined();
    expect(parsed.downtime).toBeUndefined();
    expect(parsed.replayability).toBeUndefined();
  });

  it("aceita somente o par de notas e rankings da Ludopedia", () => {
    const parsed = GameCreateSchema.parse({
      ...validGame,
      bggRating: undefined,
      bggRank: undefined,
    });

    expect(parsed.ludoRating).toBe(8.2);
    expect(parsed.ludoRank).toBe(10);
    expect(parsed.bggRating).toBeUndefined();
    expect(parsed.bggRank).toBeUndefined();
  });

  it("aceita somente o par de notas e rankings do BGG", () => {
    const parsed = GameCreateSchema.parse({
      ...validGame,
      ludoRating: undefined,
      ludoRank: undefined,
    });

    expect(parsed.bggRating).toBe(7.8);
    expect(parsed.bggRank).toBe(200);
    expect(parsed.ludoRating).toBeUndefined();
    expect(parsed.ludoRank).toBeUndefined();
  });

  it("rejeita quando nenhum par de nota e ranking está completo", () => {
    const result = GameCreateSchema.safeParse({
      ...validGame,
      bggRating: undefined,
      bggRank: undefined,
      ludoRating: undefined,
      ludoRank: undefined,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita nota sem ranking na mesma fonte", () => {
    const result = GameCreateSchema.safeParse({
      ...validGame,
      ludoRating: undefined,
      ludoRank: undefined,
      bggRank: undefined,
    });

    expect(result.success).toBe(false);
  });

  it("rejeita ranking sem nota na mesma fonte", () => {
    const result = GameCreateSchema.safeParse({
      ...validGame,
      ludoRating: undefined,
      ludoRank: undefined,
      bggRating: undefined,
    });

    expect(result.success).toBe(false);
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
