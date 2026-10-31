import { describe, it, expect } from "vitest";
import {
  playerOptions,
  durationOptions,
  complexityOptions,
  mechanicOptions,
} from "@/components/shared/filter-options";

describe("filter-options - playerOptions", () => {
  it("contém todas as opções de jogadores", () => {
    const values = playerOptions.map((o) => o.value);
    expect(values).toContain("all");
    expect(values).toContain("solo");
    expect(values).toContain("2");
    expect(values).toContain("3-4");
    expect(values).toContain("5+");
  });

  it("cada opção tem valor e label", () => {
    for (const opt of playerOptions) {
      expect(typeof opt.value).toBe("string");
      expect(typeof opt.label).toBe("string");
      expect(opt.value.length).toBeGreaterThan(0);
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});

describe("filter-options - durationOptions", () => {
  it("contém todas as opções de duração", () => {
    const values = durationOptions.map((o) => o.value);
    expect(values).toContain("all");
    expect(values).toContain("quick");
    expect(values).toContain("medium");
    expect(values).toContain("long");
  });

  it("cada opção tem valor e label", () => {
    for (const opt of durationOptions) {
      expect(typeof opt.value).toBe("string");
      expect(typeof opt.label).toBe("string");
    }
  });
});

describe("filter-options - complexityOptions", () => {
  it("contém todas as opções de complexidade", () => {
    const values = complexityOptions.map((o) => o.value);
    expect(values).toContain("all");
    expect(values).toContain("light");
    expect(values).toContain("medium");
    expect(values).toContain("heavy");
  });

  it("cada opção tem valor e label", () => {
    for (const opt of complexityOptions) {
      expect(typeof opt.value).toBe("string");
      expect(typeof opt.label).toBe("string");
    }
  });
});

describe("filter-options - mechanicOptions", () => {
  it("contém mecânicas esperadas", () => {
    const values = mechanicOptions.map((o) => o.value);
    expect(values).toContain("all");
    expect(values).toContain("engine");
    expect(values).toContain("hand");
    expect(values).toContain("draft");
    expect(values).toContain("dice");
    expect(values).toContain("worker");
    expect(values).toContain("deck");
    expect(values).toContain("area");
    expect(values).toContain("tile");
    expect(values).toContain("pattern");
  });

  it("cada opção tem valor e label únicos", () => {
    const values = mechanicOptions.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    for (const opt of mechanicOptions) {
      expect(typeof opt.value).toBe("string");
      expect(typeof opt.label).toBe("string");
    }
  });
});

describe("filter-options - consistência com GameFilterSchema", () => {
  it("valores de players são válidos para o schema", async () => {
    const { GameFilterSchema } = await import("@/lib/validations/game");
    const validPlayers = playerOptions.map((o) => o.value).filter((v) => v !== "all");
    for (const v of validPlayers) {
      const result = GameFilterSchema.safeParse({ players: v });
      expect(result.success).toBe(true);
    }
  });

  it("valores de duration são válidos para o schema", async () => {
    const { GameFilterSchema } = await import("@/lib/validations/game");
    const validDuration = durationOptions.map((o) => o.value).filter((v) => v !== "all");
    for (const v of validDuration) {
      const result = GameFilterSchema.safeParse({ duration: v });
      expect(result.success).toBe(true);
    }
  });

  it("valores de complexity são válidos para o schema", async () => {
    const { GameFilterSchema } = await import("@/lib/validations/game");
    const validComplexity = complexityOptions.map((o) => o.value).filter((v) => v !== "all");
    for (const v of validComplexity) {
      const result = GameFilterSchema.safeParse({ complexity: v });
      expect(result.success).toBe(true);
    }
  });
});
