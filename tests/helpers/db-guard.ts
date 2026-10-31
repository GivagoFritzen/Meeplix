import { parse } from "url";

const TEST_DB_NAME = "meeplix_test";
const TEST_HOST_PORT = "5433";

export function isTestDatabase(url: string): boolean {
  try {
    const parsed = parse(url);
    const pathname = parsed.pathname || "";
    const dbName = pathname.replace(/^\//, "");

    const isTestDb = dbName === TEST_DB_NAME;

    let isTestPort = false;
    if (parsed.host) {
      const hostParts = parsed.host.split(":");
      if (hostParts.length > 1) {
        isTestPort = hostParts[1] === TEST_HOST_PORT;
      }
    }

    return isTestDb && isTestPort;
  } catch {
    return false;
  }
}

export function requireTestDatabase(url: string): void {
  if (!isTestDatabase(url)) {
    throw new Error(
      `Operação destrutiva bloqueada: DATABASE_URL não aponta para o banco de teste. ` +
        `Esperado: db="${TEST_DB_NAME}" na porta ${TEST_HOST_PORT}. ` +
        `Atual: ${url}`,
    );
  }
}

export function assertTestEnvironment(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definida.");
  }
  requireTestDatabase(url);
}
