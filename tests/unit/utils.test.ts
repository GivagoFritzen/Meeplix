import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatRating,
  formatWeight,
  formatPlaytime,
  formatPlayers,
  formatPlayersCompact,
  getComplexityLabel,
  getLabelFromValue,
  resolveAssetUrl,
  isAudioFile,
  slugify,
  getFileTypeFromExtension,
  formatFileSize,
} from "@/lib/utils";

describe("utils - formatNumber", () => {
  it("formata número com separador de milhar", () => {
    const result = formatNumber(1234);
    expect(result).toMatch(/1[.,]234/);
  });

  it("retorna '-' para null/undefined", () => {
    expect(formatNumber(null)).toBe("-");
    expect(formatNumber(undefined)).toBe("-");
  });
});

describe("utils - formatRating", () => {
  it("formata nota com vírgula ou ponto conforme locale", () => {
    const result = formatRating(8.5);
    expect(result).toMatch(/^[\d.,]+$/);
  });

  it("retorna '-' para null/undefined", () => {
    expect(formatRating(null)).toBe("-");
    expect(formatRating(undefined)).toBe("-");
  });
});

describe("utils - formatWeight", () => {
  it("formata peso com 2 casas", () => {
    const result = formatWeight(2.5);
    expect(result).toMatch(/^[\d.,]+$/);
  });

  it("retorna '-' para null/undefined", () => {
    expect(formatWeight(null)).toBe("-");
  });
});

describe("utils - formatPlaytime", () => {
  it("formata duração", () => {
    expect(formatPlaytime(30)).toBe("30 min");
  });

  it("retorna '-' para 0/null/undefined", () => {
    expect(formatPlaytime(0)).toBe("-");
    expect(formatPlaytime(null)).toBe("-");
    expect(formatPlaytime(undefined)).toBe("-");
  });
});

describe("utils - formatPlayers", () => {
  it("retorna '-' quando ambos ausentes", () => {
    expect(formatPlayers(null, null)).toBe("-");
  });

  it("retorna valor único quando min === max", () => {
    expect(formatPlayers(1, 1)).toBe("1 jogador");
    expect(formatPlayers(2, 2)).toBe("2 jogadores");
    expect(formatPlayers(4, 4)).toBe("4 jogadores");
  });

  it("retorna intervalo", () => {
    expect(formatPlayers(2, 4)).toBe("2–4 jogadores");
  });

  it("retorna ≥min quando só min", () => {
    expect(formatPlayers(2, null)).toBe("≥2 jogadores");
  });

  it("retorna ≤max quando só max", () => {
    expect(formatPlayers(null, 4)).toBe("≤4 jogadores");
  });
});

describe("utils - formatPlayersCompact", () => {
  it("retorna compacto", () => {
    expect(formatPlayersCompact(2, 4)).toBe("2–4");
    expect(formatPlayersCompact(3, 3)).toBe("3");
    expect(formatPlayersCompact(2, null)).toBe("≥2");
    expect(formatPlayersCompact(null, 4)).toBe("≤4");
    expect(formatPlayersCompact(null, null)).toBe("-");
  });
});

describe("utils - getComplexityLabel", () => {
  it("classifica leve", () => {
    expect(getComplexityLabel(1.5)).toEqual({ label: "Leve", class: "complexity-light" });
  });

  it("classifica médio leve", () => {
    expect(getComplexityLabel(2.5)).toEqual({ label: "Médio Leve", class: "complexity-medium" });
  });

  it("classifica médio pesado", () => {
    expect(getComplexityLabel(3.2)).toEqual({ label: "Médio Pesado", class: "complexity-medium" });
  });

  it("classifica pesado", () => {
    expect(getComplexityLabel(4.0)).toEqual({ label: "Pesado", class: "complexity-heavy" });
  });
});

describe("utils - getLabelFromValue", () => {
  it("retorna rótulos por faixa", () => {
    expect(getLabelFromValue(null)).toBe("Não avaliado");
    expect(getLabelFromValue(1)).toBe("Muito baixo");
    expect(getLabelFromValue(2)).toBe("Baixo");
    expect(getLabelFromValue(3)).toBe("Médio");
    expect(getLabelFromValue(4)).toBe("Alto");
    expect(getLabelFromValue(5)).toBe("Muito alto");
  });
});

describe("utils - resolveAssetUrl", () => {
  it("retorna null para entrada vazia", () => {
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl(undefined)).toBeNull();
    expect(resolveAssetUrl("")).toBeNull();
  });

  it("retorna Data URI como está", () => {
    expect(resolveAssetUrl("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
  });

  it("retorna URLs http/https como estão", () => {
    expect(resolveAssetUrl("https://example.com/capa.jpg")).toBe("https://example.com/capa.jpg");
    expect(resolveAssetUrl("http://example.com/capa.jpg")).toBe("http://example.com/capa.jpg");
  });

  it("retorna caminhos absolutos como estão", () => {
    expect(resolveAssetUrl("/images/capa.jpg")).toBe("/images/capa.jpg");
  });

  it("converte caminho relativo para /api/files/", () => {
    expect(resolveAssetUrl("games/abc/file.pdf")).toBe("/api/files/games/abc/file.pdf");
  });
});

describe("utils - isAudioFile", () => {
  it("identifica por mimeType", () => {
    expect(isAudioFile({ mimeType: "audio/mpeg" })).toBe(true);
    expect(isAudioFile({ mimeType: "image/png" })).toBe(false);
  });

  it("identifica por extensão", () => {
    expect(isAudioFile({ extension: "mp3" })).toBe(true);
    expect(isAudioFile({ extension: "pdf" })).toBe(false);
  });

  it("identifica por originalName", () => {
    expect(isAudioFile({ originalName: "musica.ogg" })).toBe(true);
  });

  it("retorna false quando nada informado", () => {
    expect(isAudioFile({})).toBe(false);
  });
});

describe("utils - slugify", () => {
  it("gera slug", () => {
    expect(slugify("Cascadia")).toBe("cascadia");
    expect(slugify("Nome com Acentuação")).toBe("nome-com-acentuacao");
    expect(slugify("Título--duplo")).toBe("titulo-duplo");
  });
});

describe("utils - getFileTypeFromExtension", () => {
  it("classifica imagem", () => {
    expect(getFileTypeFromExtension("jpg")).toBe("IMAGE");
    expect(getFileTypeFromExtension("png")).toBe("IMAGE");
  });

  it("classifica pdf como manual", () => {
    expect(getFileTypeFromExtension("pdf")).toBe("MANUAL");
  });

  it("classifica desconhecido como OTHER", () => {
    expect(getFileTypeFromExtension("xyz")).toBe("OTHER");
  });
});

describe("utils - formatFileSize", () => {
  it("formata bytes", () => {
    const r1 = formatFileSize(500);
    expect(r1).toBe("500 B");
    const r2 = formatFileSize(1500);
    expect(r2).toMatch(/KB/);
    const r3 = formatFileSize(1500000);
    expect(r3).toMatch(/MB/);
    const r4 = formatFileSize(1500000000);
    expect(r4).toMatch(/GB/);
  });

  it("aceita bigint", () => {
    const result = formatFileSize(BigInt(1024));
    expect(result).toMatch(/KB/);
  });
});
