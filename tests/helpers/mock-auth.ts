import { vi } from "vitest";
import { Session } from "next-auth";

export interface MockSession {
  user?: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  } | null;
  expires: string;
}

export function mockAuth(session: MockSession | null): void {
  vi.mock("@/lib/auth", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/auth")>();
    return {
      ...actual,
      auth: vi.fn(() => Promise.resolve(session as unknown as Session | null)),
      getCurrentUser: vi.fn(() => Promise.resolve(session?.user ?? null)),
    };
  });
}

export function unmockAuth(): void {
  vi.unmock("@/lib/auth");
}
