import { describe, it, expect } from "vitest";
import {
  parseCoverImage,
  stringifyCoverImage,
  buildCoverImageData,
} from "@/lib/cover-image";

describe("cover-image - parseCoverImage", () => {
  it("retorna null para dados ausentes", () => {
    expect(parseCoverImage(null)).toBeNull();
    expect(parseCoverImage(undefined)).toBeNull();
    expect(parseCoverImage("")).toBeNull();
  });

  it("parseia Data URI válida", () => {
    const result = parseCoverImage("data:image/png;base64,abc123");
    expect(result).toEqual({ base64: "abc123", mimeType: "image/png" });
  });

  it("parseia Data URI com jpeg", () => {
    const result = parseCoverImage("data:image/jpeg;base64,/9j/4AAQ");
    expect(result).toEqual({ base64: "/9j/4AAQ", mimeType: "image/jpeg" });
  });

  it("retorna null para URL comum (não Data URI)", () => {
    expect(parseCoverImage("https://example.com/capa.jpg")).toBeNull();
  });

  it("retorna null para string inválida (não imagem)", () => {
    expect(parseCoverImage("data:text/plain;base64,abc")).toBeNull();
  });
});

describe("cover-image - stringifyCoverImage", () => {
  it("constrói Data URI a partir de objeto base64", () => {
    const result = stringifyCoverImage(null, {
      base64: "abc123",
      mimeType: "image/png",
    });
    expect(result).toBe("data:image/png;base64,abc123");
  });

  it("retorna coverImage original quando não há data", () => {
    const result = stringifyCoverImage("https://example.com/capa.jpg", null);
    expect(result).toBe("https://example.com/capa.jpg");
  });

  it("retorna null quando tudo está ausente", () => {
    expect(stringifyCoverImage(null, null)).toBeNull();
    expect(stringifyCoverImage(undefined, undefined)).toBeNull();
  });

  it("ignora data inválida e retorna coverImage", () => {
    const result = stringifyCoverImage("https://example.com/capa.jpg", {
      base64: "",
      mimeType: "",
    });
    expect(result).toBe("https://example.com/capa.jpg");
  });
});

describe("cover-image - buildCoverImageData", () => {
  it("Data URI: coverImageData preenchido, coverImage é a data URI", () => {
    const result = buildCoverImageData("data:image/png;base64,abc123");
    expect(result.coverImage).toBe("data:image/png;base64,abc123");
    expect(result.coverImageData).toEqual({ base64: "abc123", mimeType: "image/png" });
  });

  it("URL comum: coverImage mantido, coverImageData null", () => {
    const result = buildCoverImageData("https://example.com/capa.jpg");
    expect(result.coverImage).toBe("https://example.com/capa.jpg");
    expect(result.coverImageData).toBeNull();
  });

  it("entrada vazia: ambos null", () => {
    const result = buildCoverImageData(null);
    expect(result.coverImage).toBeNull();
    expect(result.coverImageData).toBeNull();
  });

  it("string vazia: ambos null", () => {
    const result = buildCoverImageData("");
    expect(result.coverImage).toBeNull();
    expect(result.coverImageData).toBeNull();
  });
});
