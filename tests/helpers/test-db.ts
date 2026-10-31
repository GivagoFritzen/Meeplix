import { PrismaClient } from "@prisma/client";
import { assertTestEnvironment } from "./db-guard";

let testPrisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  assertTestEnvironment();

  if (!testPrisma) {
    testPrisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }

  return testPrisma;
}

export async function connectTestDb(): Promise<void> {
  const prisma = getTestPrisma();
  await prisma.$connect();
}

export async function disconnectTestDb(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

export async function cleanTestDb(): Promise<void> {
  assertTestEnvironment();

  const prisma = getTestPrisma();

  await prisma.gameFile.deleteMany();
  await prisma.game.deleteMany();
  await prisma.siteConfig.deleteMany();
  await prisma.adminUser.deleteMany();
}
