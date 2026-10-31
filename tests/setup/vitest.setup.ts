import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(() => undefined),
  revalidateTag: vi.fn(() => undefined),
}));

vi.mock("next/server", () => ({}));

Object.assign(process.env, {
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://meeplix_test:meeplix_test@localhost:5433/meeplix_test?schema=public",
  NEXTAUTH_SECRET: "test-secret-do-not-use-in-production-1234567890",
  NEXTAUTH_URL: "http://localhost:3000",
  STORAGE_PATH: process.env.STORAGE_PATH || "",
  MAX_FILE_SIZE: "104857600",
  BGG_API_TOKEN: "test-bgg-token",
});
