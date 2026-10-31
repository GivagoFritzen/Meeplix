import { XMLParser } from "fast-xml-parser";

export type ImportedGameData = {
  name?: string;
  originalName?: string | null;
  description?: string | null;
  year?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  minPlaytime?: number | null;
  publisher?: string | null;
  designer?: string | null;
  artist?: string | null;
  bggRating?: number | null;
  ludoRating?: number | null;
  bggRank?: number | null;
  ludoRank?: number | null;
  weight?: number | null;
  interaction?: number | null;
  luck?: number | null;
  downtime?: number | null;
  replayability?: number | null;
  bestPlayers?: number | null;
  minAge?: number | null;
  coverImage?: string | null;
  mechanics?: string[];
  categories?: string[];
  sourceUrl?: string;
};

type XmlNode = Record<string, unknown>;
type XmlNodeList = XmlNode | XmlNode[] | undefined;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: false,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function attr(node: unknown, key: string): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const value = (node as XmlNode)[`@_${key}`];
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : undefined;
}

function numberAttr(node: unknown, key: string): number | null {
  const raw = attr(node, key);
  if (!raw || /^(not ranked|n\/a|none)$/i.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function intAttr(node: unknown, key: string): number | null {
  const value = numberAttr(node, key);
  return value !== null && Number.isInteger(value) && value > 0 ? value : null;
}

function textValue(node: unknown): string | null {
  if (typeof node === "string") return node.trim() || null;
  if (typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return null;
  const text = (node as XmlNode)["#text"];
  return typeof text === "string" ? text.trim() || null : null;
}

function nameValue(value: unknown): string | null {
  const names = asArray(value as XmlNodeList);
  const primary = names.find((item) => attr(item, "type") === "primary");
  return attr(primary ?? names[0], "value") ?? null;
}

function linkedNames(links: unknown, wantedType: string): string[] {
  return asArray(links as XmlNodeList)
    .filter((item) => attr(item, "type") === wantedType)
    .map((item) => attr(item, "value"))
    .filter((value): value is string => Boolean(value))
    .filter((value, index, all) => all.indexOf(value) === index);
}

function cleanDescription(value: unknown): string | null {
  const raw = textValue(value);
  if (!raw) return null;
  const normalized = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li)\s*>/gi, "\n")
    .replace(/<[^<>]*>/g, "")
    .replace(/\r/g, "");
  return normalized
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim() || null;
}

export function extractBggId(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Informe uma URL válida do BoardGameGeek.");
  }

  if (url.protocol !== "https:") {
    throw new Error("A URL do BGG deve usar HTTPS.");
  }
  const host = url.hostname.toLowerCase();
  if (host !== "boardgamegeek.com" && host !== "www.boardgamegeek.com") {
    throw new Error("A URL informada não pertence ao BoardGameGeek.");
  }
  const match = url.pathname.match(/^\/boardgame\/(\d+)(?:\/|$)/);
  if (!match) throw new Error("A URL não contém um ID válido de jogo do BGG.");
  return match[1];
}

export function parseBggXml(xml: string, sourceUrl: string): ImportedGameData {
  const parsed = xmlParser.parse(xml) as {
    items?: { item?: XmlNode | XmlNode[] };
  };
  const item = asArray(parsed.items?.item)[0];
  if (!item) throw new Error("O BGG não retornou um jogo para esse ID.");

  const name = nameValue(item.name);
  if (!name) throw new Error("O BGG retornou um jogo sem nome principal.");

  const ratings = (item.statistics as XmlNode | undefined)?.ratings as
    | XmlNode
    | undefined;
  const ranksContainer = ratings?.ranks as XmlNode | undefined;
  const ranks = asArray(ranksContainer?.rank as XmlNode | XmlNode[] | undefined);
  const overallRank = ranks.find((rank) => {
    const rankName = attr(rank, "name");
    const friendlyName = attr(rank, "friendlyname");
    return rankName === "boardgame" || friendlyName === "Board Game Rank";
  });

  const links = asArray(item.link as XmlNode | XmlNode[] | undefined);
  const getValue = (key: string) => numberAttr(item[key], "value");
  const publishers = linkedNames(links, "boardgamepublisher");
  const designers = linkedNames(links, "boardgamedesigner");
  const artists = linkedNames(links, "boardgameartist");
  const mechanics = linkedNames(links, "boardgamemechanic");
  const categories = linkedNames(links, "boardgamecategory");

  return {
    name,
    originalName: name,
    description: cleanDescription(item.description),
    year: getValue("yearpublished"),
    minPlayers: getValue("minplayers"),
    maxPlayers: getValue("maxplayers"),
    minPlaytime: getValue("minplaytime") ?? getValue("playingtime"),
    minAge: getValue("minage"),
    publisher: publishers.length ? publishers.join(", ") : null,
    designer: designers.length ? designers.join(", ") : null,
    artist: artists.length ? artists.join(", ") : null,
    bggRating: numberAttr(ratings?.average, "value"),
    bggRank: intAttr(overallRank, "value"),
    weight: numberAttr(ratings?.averageweight, "value"),
    coverImage: textValue(item.image) ?? textValue(item.thumbnail),
    mechanics,
    categories,
    sourceUrl,
  };
}

export async function fetchBggGame(sourceUrl: string): Promise<ImportedGameData> {
  const token = process.env.BGG_API_TOKEN;
  if (!token) {
    throw new Error("BGG_API_TOKEN não está configurado no servidor.");
  }

  const id = extractBggId(sourceUrl);
  const endpoint = `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(id)}&stats=1`;
  let lastStatus = 0;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/xml, text/xml;q=0.9",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    lastStatus = response.status;
    if (response.status === 200) {
      const xml = await response.text();
      return parseBggXml(xml, sourceUrl);
    }

    if (![202, 429, 500, 503].includes(response.status)) {
      throw new Error(`Falha na API do BGG (HTTP ${response.status}).`);
    }
    if (attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 5000)
        : (attempt + 1) * 1500;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    lastStatus === 202
      ? "A consulta do BGG continua na fila. Tente importar novamente em alguns instantes."
      : `O BGG está temporariamente indisponível (HTTP ${lastStatus}). Tente novamente.`,
  );
}