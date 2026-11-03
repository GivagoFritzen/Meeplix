import { describe, it, expect, vi } from "vitest";

describe("lib/prisma", () => {
  it("exporta a mesma instância como named e default", async () => {
    const prismaModule = await import("@/lib/prisma");

    expect(prismaModule.default).toBe(prismaModule.prisma);
    expect(typeof prismaModule.prisma.game.findMany).toBe("function");
  });

  it("reutiliza a instância global fora de produção", async () => {
    vi.resetModules();

    const first = await import("@/lib/prisma");
    vi.resetModules();
    const second = await import("@/lib/prisma");

    expect(second.prisma).toBe(first.prisma);
  });
});
