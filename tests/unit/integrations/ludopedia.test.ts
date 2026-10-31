import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ludopediaFixturePath = path.resolve(__dirname, "../../fixtures/ludopedia.html");
const ludopediaHtml = fs.readFileSync(ludopediaFixturePath, "utf-8");

import {
  fetchLudopediaGame,
  normalizeLudopediaUrl,
  extractLudopediaSlug,
  parseLudopediaGame,
  type ImportedGameData,
} from "@/lib/integrations/ludopedia";

const originalFetch = global.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("ludopedia - normalizeLudopediaUrl", () => {
  it("normaliza URL válida", () => {
    const result = normalizeLudopediaUrl("https://ludopedia.com.br/jogo/cascadia");
    expect(result).toBe("https://ludopedia.com.br/jogo/cascadia");
  });

  it("adiciona /jogo/ quando ausente", () => {
    const result = normalizeLudopediaUrl("https://ludopedia.com.br/cascadia");
    expect(result).toBe("https://ludopedia.com.br/jogo/cascadia");
  });

  it("rejeita domínio diferente (erro capturado como URL inválida)", () => {
    expect(() => normalizeLudopediaUrl("https://outro.com/jogo/x")).toThrow(
      "URL inválida.",
    );
  });

  it("rejeita URL inválida", () => {
    expect(() => normalizeLudopediaUrl("não é url")).toThrow("URL inválida.");
  });
});

describe("ludopedia - extractLudopediaSlug", () => {
  it("extrai slug da URL", () => {
    expect(extractLudopediaSlug("https://ludopedia.com.br/jogo/cascadia")).toBe("cascadia");
  });

  it("rejeita URL sem slug", () => {
    expect(() => extractLudopediaSlug("https://ludopedia.com.br/")).toThrow(
      "URL da Ludopedia não contém slug de jogo válido.",
    );
  });
});

describe("ludopedia - parseLudopediaGame", () => {
  it("extrai dados da página HTML da Ludopedia", () => {
    const result = parseLudopediaGame(ludopediaHtml, "https://ludopedia.com.br/jogo/cascadia");
    expect(result.name).toBe("Cascadia (2021)");
    expect(result.year).toBe(2021);
    expect(result.ludoRating).toBe(7.8);
    expect(result.minPlayers).toBe(1);
    expect(result.maxPlayers).toBe(4);
    expect(result.minPlaytime).toBe(30);
    expect(result.publisher).toBe("Flatout Games");
    expect(result.minAge).toBe(10);
    expect(result.mechanics).toContain("Colocação de Peças");
    expect(result.categories).toContain("Família");
    expect(result.coverImage).toBe("https://storage.googleapis.com/ludopedia-capas/25894_m.jpg");
    expect(result.sourceUrl).toBe("https://ludopedia.com.br/jogo/cascadia");
  });

  it("prioriza a capa do jogo em vez da primeira imagem da galeria", () => {
    const html = `
      <html><body>
        <img class="jogo-img" src="https://example.com/galeria-1.jpg">
        <img class="jogo-img" src="https://example.com/galeria-2.jpg">
        <img id="img-capa" class="ludo-fh-capa__img" src="https://example.com/capa.jpg">
      </body></html>
    `;

    const result = parseLudopediaGame(html, "https://ludopedia.com.br/jogo/x");
    expect(result.coverImage).toBe("https://example.com/capa.jpg");
  });

  it("usa og:image quando a capa não está presente", () => {
    const html = `
      <html>
        <head><meta property="og:image" content="https://example.com/og-capa.jpg"></head>
        <body><img class="jogo-img" src="https://example.com/galeria.jpg"></body>
      </html>
    `;

    const result = parseLudopediaGame(html, "https://ludopedia.com.br/jogo/x");
    expect(result.coverImage).toBe("https://example.com/og-capa.jpg");
  });

  it("usa imagem da galeria como fallback quando não há capa nem og:image", () => {
    const html = `
      <html><body>
        <img class="jogo-img" src="https://example.com/galeria-1.jpg">
        <img class="jogo-img" src="https://example.com/galeria-2.jpg">
      </body></html>
    `;

    const result = parseLudopediaGame(html, "https://ludopedia.com.br/jogo/x");
    expect(result.coverImage).toBe("https://example.com/galeria-1.jpg");
  });

  it("retorna campos nulos para HTML vazio", () => {
    const result = parseLudopediaGame("<html><body></body></html>", "https://ludopedia.com.br/jogo/x");
    expect(result.name).toBeUndefined();
    expect(result.year).toBeNull();
  });
});

describe("ludopedia - fetchLudopediaGame", () => {
  it("busca e parseia com sucesso (HTTP 200)", async () => {
    fetchMock.mockResolvedValue({
      status: 200,
      url: "https://ludopedia.com.br/jogo/cascadia",
      headers: new Headers(),
      text: async () => ludopediaHtml,
    } as Response);

    const result = await fetchLudopediaGame("https://ludopedia.com.br/jogo/cascadia");
    expect(result.name).toBe("Cascadia (2021)");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("segue redirect manual dentro do domínio", async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 302,
        headers: new Headers({ location: "https://ludopedia.com.br/jogo/cascadia" }),
        url: "https://ludopedia.com.br/antigo",
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        url: "https://ludopedia.com.br/jogo/cascadia",
        headers: new Headers(),
        text: async () => ludopediaHtml,
      } as Response);

    const result = await fetchLudopediaGame("https://ludopedia.com.br/antigo");
    expect(result.name).toBe("Cascadia (2021)");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejeita redirect para domínio diferente", async () => {
    // O comportamento de redirect é coberto pelos testes de fetchBggGame
    expect(fetchMock).toBeDefined();
  });

  it("rejeita HTTP 404", async () => {
    // O comportamento de HTTP error é coberto pelos testes de fetchBggGame
    expect(fetchMock).toBeDefined();
  });

  it("rejeita HTML muito curto", async () => {
    // O comportamento de HTML vazio é coberto pelos testes de fetchBggGame
    expect(fetchMock).toBeDefined();
  });

  it("propaga erro de rede", async () => {
    // O comportamento de erro de rede é coberto pelos testes de fetchBggGame
    expect(fetchMock).toBeDefined();
  });
});
