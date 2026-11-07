import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const bggFixturePath = path.resolve(__dirname, "../../fixtures/bgg.xml");
const validBggXml = fs.readFileSync(bggFixturePath, "utf-8");
const validBggXmlNoItem = `<?xml version="1.0" encoding="UTF-8"?>
<items/>
`;
const invalidBggXml = `<?xml version="1.0" encoding="UTF-8"?>
<not-bgg/>
`;

import {
  extractBggId,
  parseBggXml,
  fetchBggGame,
} from "@/lib/integrations/bgg";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.BGG_API_TOKEN = "test-token";
  (globalThis as any).fetch = fetchMock;
  fetchMock.mockClear();
});

afterEach(() => {
  delete (globalThis as any).fetch;
  delete process.env.BGG_API_TOKEN;
});

describe("bgg - extractBggId", () => {
  it("extrai ID de URL válida", () => {
    expect(extractBggId("https://boardgamegeek.com/boardgame/12345")).toBe("12345");
    expect(extractBggId("https://www.boardgamegeek.com/boardgame/67890/")).toBe("67890");
  });

  it("rejeita URL inválida", () => {
    expect(() => extractBggId("não é uma url")).toThrow("Informe uma URL válida do BoardGameGeek.");
  });

  it("rejeita protocolo não HTTPS", () => {
    expect(() => extractBggId("http://boardgamegeek.com/boardgame/123")).toThrow(
      "A URL do BGG deve usar HTTPS.",
    );
  });

  it("rejeita domínio diferente", () => {
    expect(() => extractBggId("https://outro.com/boardgame/123")).toThrow(
      "A URL informada não pertence ao BoardGameGeek.",
    );
  });

  it("rejeita URL sem ID de jogo", () => {
    expect(() => extractBggId("https://boardgamegeek.com/")).toThrow(
      "A URL não contém um ID válido de jogo do BGG.",
    );
  });
});

describe("bgg - parseBggXml", () => {
  it("parseia XML válido do BGG", () => {
    const result = parseBggXml(validBggXml, "https://boardgamegeek.com/boardgame/12345");
    expect(result.name).toBe("Cascadia");
    expect(result.originalName).toBe("Cascadia");
    expect(result.year).toBe(2021);
    expect(result.minPlayers).toBe(1);
    expect(result.maxPlayers).toBe(4);
    expect(result.minPlaytime).toBe(30);
    expect(result.publisher).toBe("Flatout Games");
    expect(result.designer).toBe("Flatout Games");
    expect(result.mechanics).toContain("Tile Placement");
    expect(result.categories).toContain("Family Game");
    expect(result.bggRating).toBe(7.5);
    expect(result.weight).toBe(2.1);
    expect(result.bggRank).toBe(100);
    expect(result.sourceUrl).toBe("https://boardgamegeek.com/boardgame/12345");
  });

  it("lança erro quando não há item", () => {
    expect(() => parseBggXml(validBggXmlNoItem, "https://boardgamegeek.com/boardgame/1")).toThrow(
      "O BGG não retornou um jogo para esse ID.",
    );
  });

  it("lança erro quando XML é inválido", () => {
    expect(() => parseBggXml(invalidBggXml, "https://boardgamegeek.com/boardgame/1")).toThrow(
      "O BGG não retornou um jogo para esse ID.",
    );
  });

  it("retorna fields nulos quando dados ausentes", () => {
    const xml = `<?xml version="1.0"?><items><item type="boardgame" id="1"><name type="primary" value="Solo"/></item></items>`;
    const result = parseBggXml(xml, "https://boardgamegeek.com/boardgame/1");
    expect(result.name).toBe("Solo");
    expect(result.year).toBeNull();
    expect(result.minPlayers).toBeNull();
  });
});

describe("bgg - fetchBggGame", () => {
  it("busca e parseia jogo com sucesso (HTTP 200)", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      text: async () => validBggXml,
    } as Response);

    const result = await fetchBggGame("https://boardgamegeek.com/boardgame/12345");
    expect(result.name).toBe("Cascadia");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("xmlapi2/thing");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
  });

  it("retry em HTTP 202 e então sucesso", async () => {
    fetchMock
      .mockResolvedValueOnce({ status: 202, headers: new Headers(), text: async () => "" } as Response)
      .mockResolvedValueOnce({ status: 200, headers: new Headers(), text: async () => validBggXml } as Response);
    vi.useFakeTimers();
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: any) => {
      fn();
      return 1 as unknown as NodeJS.Timeout;
    });

    const result = await fetchBggGame("https://boardgamegeek.com/boardgame/12345");
    expect(result.name).toBe("Cascadia");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("rejeita quando BGG_API_TOKEN não configurado", async () => {
    const origToken = process.env.BGG_API_TOKEN;
    delete process.env.BGG_API_TOKEN;
    await expect(fetchBggGame("https://boardgamegeek.com/boardgame/12345")).rejects.toThrow(
      "BGG_API_TOKEN não está configurado",
    );
    if (origToken) process.env.BGG_API_TOKEN = origToken;
  });

  it("lança erro em HTTP 404 (não retryável)", async () => {
    fetchMock.mockResolvedValue({
      status: 404,
      headers: new Headers(),
      text: async () => "",
    } as Response);

    await expect(fetchBggGame("https://boardgamegeek.com/boardgame/12345")).rejects.toThrow(
      "Falha na API do BGG",
    );
  });

  it("lança erro após esgotar tentativas (HTTP 500 persistente)", async () => {
    fetchMock.mockResolvedValue({
      status: 500,
      headers: new Headers(),
      text: async () => "",
    } as Response);
    vi.useFakeTimers();
    vi.spyOn(globalThis, "setTimeout").mockImplementation((fn: any) => {
      fn();
      return 1 as unknown as NodeJS.Timeout;
    });

    await expect(fetchBggGame("https://boardgamegeek.com/boardgame/12345")).rejects.toThrow(
      "indisponível",
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it("propaga erro de rede (fetch rejeita)", async () => {
    fetchMock.mockRejectedValue(new TypeError("falha de rede"));

    await expect(fetchBggGame("https://boardgamegeek.com/boardgame/12345")).rejects.toThrow(
      "falha de rede",
    );
  });
});
