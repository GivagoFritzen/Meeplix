import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth-utils";
import { cleanTestDb, getTestPrisma } from "../helpers/test-db";

export interface TestAdminUser {
  id: string;
  email: string;
  password: string;
}

export async function createTestAdminUser(
  prisma: PrismaClient,
  overrides: Partial<{
    email: string;
    password: string;
    name: string | null;
  }> = {},
): Promise<TestAdminUser> {
  const email = overrides.email || "test@meeplix.local";
  const password = overrides.password || "password123";
  const name = overrides.name ?? "Test User";

  const passwordHash = await hashPassword(password);

  const user = await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      name,
    },
  });

  return { id: user.id, email: user.email, password };
}

export async function createTestSiteConfig(
  prisma: PrismaClient,
  overrides: Partial<{
    hideDesigners: boolean;
    hidePublishers: boolean;
    hideArtists: boolean;
    hideTags: boolean;
  }> = {},
) {
  return prisma.siteConfig.create({
    data: {
      hideDesigners: overrides.hideDesigners ?? true,
      hidePublishers: overrides.hidePublishers ?? false,
      hideArtists: overrides.hideArtists ?? false,
      hideTags: overrides.hideTags ?? false,
    },
  });
}

export async function resetTestDb(): Promise<void> {
  await cleanTestDb();
}

export { getTestPrisma };
