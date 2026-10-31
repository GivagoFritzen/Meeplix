import { CheerioAPI, load as loadCheerio } from "cheerio";

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
  ludoRating?: number | null;
  bggRating?: number | null;
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

interface EnqData {
  playersRange?: string;
  bestPlayers?: number;
  duration?: string;
  age?: string;
  interaction?: number;
  luck?: number;
  downtime?: number;
  replayability?: number;
}

const LUDOPEDIA_DOMAINS = ["ludopedia.com.br", "www.ludopedia.com.br"];
const MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const REQUEST_HEADERS = {
  "User-Agent": "Meeplix-Importer/1.0 (https://github.com/givago/meeplix)",
  Accept: "text/html,application/xhtml+xml",
};

function isLudopediaDomain(hostname: string): boolean {
  return LUDOPEDIA_DOMAINS.includes(hostname.toLowerCase());
}

function normalizeLudopediaUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!isLudopediaDomain(parsed.hostname)) {
      throw new Error("URL não pertence ao domínio da Ludopedia.");
    }
    let pathname = parsed.pathname;
    if (!pathname.startsWith("/jogo/")) {
      pathname = "/jogo" + pathname;
    }
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    throw new Error("URL inválida.");
  }
}

function extractLudopediaSlug(url: string): string {
  const normalized = normalizeLudopediaUrl(url);
  const match = normalized.match(/\/jogo\/([^\/]+)/);
  if (!match) {
    throw new Error("URL da Ludopedia não contém slug de jogo válido.");
  }
  return match[1];
}

function getNormalizedPageText($: CheerioAPI): string {
  const body = $("body").clone();
  body.find("script, style, noscript, svg").remove();
  body.find("br").replaceWith(" ");
  body.find("h1, h2, h3, p, li, dt, dd, div, section, article, tr, td")
    .each((_, element) => {
      const node = $(element);
      node.prepend(" ");
      node.append(" ");
    });
  return body.text().replace(/[\s\u00a0]+/g, " ").trim();
}

function extractEnqData($: CheerioAPI): EnqData {
  const result: EnqData = {};

  const jsonScript = $("#ludo-enq-dados").first();
  if (jsonScript.length === 0) {
    return result;
  }

  try {
    const jsonText = jsonScript.text() || jsonScript.html() || "{}";
    
    // Check if the content looks like JSON (starts with { or [)
    const trimmed = jsonText.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      // Content is not JSON (likely HTML), skip parsing
      return result;
    }
    
    const data = JSON.parse(jsonText);

    // Player range from "oficial" field (e.g., "2 a 8")
    if (data.enquetes?.J?.oficial) {
      result.playersRange = data.enquetes.J.oficial;
    }
    // Best players from "melhor_min" / "melhor_max"
    if (
      data.enquetes?.J?.resultado?.melhor_min !== undefined &&
      data.enquetes?.J?.resultado?.melhor_max !== undefined
    ) {
      result.bestPlayers = data.enquetes.J.resultado.melhor_min;
    }

    // Duration from "oficial" field (e.g., "20 min")
    if (data.enquetes?.D?.oficial) {
      result.duration = data.enquetes.D.oficial;
    }
    // Age from "oficial" field (e.g., "8+")
    if (data.enquetes?.I?.oficial) {
      result.age = data.enquetes.I.oficial;
    }

    // N - Interação
    if (data.enquetes?.N?.resultado?.media !== undefined) {
      result.interaction = data.enquetes.N.resultado.media;
    }
    // S - Sorte
    if (data.enquetes?.S?.resultado?.media !== undefined) {
      result.luck = data.enquetes.S.resultado.media;
    }
    // T - Downtime
    if (data.enquetes?.T?.resultado?.media !== undefined) {
      result.downtime = data.enquetes.T.resultado.media;
    }
    // R - Rejogabilidade
    if (data.enquetes?.R?.resultado?.media !== undefined) {
      result.replayability = data.enquetes.R.resultado.media;
    }
  } catch {
    // If JSON parsing fails, just return empty results
  }

  return result;
}

function extractFromDtDd($: CheerioAPI, labelKeyword: string): string {
  /** Extract the text content from the <dd> sibling of a <dt> whose text contains the keyword. */
  const dtElements = $("dt");
  for (const dtElement of dtElements.toArray()) {
    const dt = $(dtElement);
    const dtText = dt.text().trim().toLowerCase();
    if (dtText.includes(labelKeyword)) {
      const dd = dt.next("dd");
      if (dd.length) {
        return dd.text().trim();
      }
    }
  }
  return "";
}

function extractName($: CheerioAPI): string | null {
  const h1Element = $("h1").first();
  if (!h1Element.length) return null;

  // Get text from the <a> inside h1, or the h1 itself
  const aElement = h1Element.find("a").first();
  return (aElement.length ? aElement.text() : h1Element.text()).trim();
}

function extractYear(name: string | null, normalizedText: string): number | null {
  // Year extraction: from h1 small tag (e.g., "(2016)")
  const h1SmallMatch = /\((\d{4})\)/.exec(name ?? "");
  if (h1SmallMatch) {
    return parseInt(h1SmallMatch[1], 10);
  }

  // Fallback: search normalized text for "ano/year + year"
  const yearMatch = normalizedText.match(/(?:ano|year)[\s:]*(\d{4})/i);
  return yearMatch ? parseInt(yearMatch[1], 10) : null;
}

function extractRating($: CheerioAPI, normalizedText: string): number | null {
  // The rating appears as "8,1" in the .ludo-fh-nota__n element
  const ratingElement = $("div.ludo-fh-nota__n").first();
  if (ratingElement.length) {
    const ratingNumMatch = ratingElement.text().trim().match(/(\d{1,4}[,.]\d{1,3})/);
    if (ratingNumMatch) {
      return parseFloat(ratingNumMatch[1].replace(",", "."));
    }
  }

  // Fallback: search normalized text for rating pattern
  const ratingMatch = normalizedText.match(/(\d{1,4}[,.]\d{1,3})/i);
  if (ratingMatch) {
    // Don't use if it's likely the complexity rating (typically < 3)
    const ratingVal = parseFloat(ratingMatch[1].replace(",", "."));
    if (ratingVal >= 5) {
      return ratingVal;
    }
  }

  // Another fallback: try "nota" keyword
  const notaMatch = normalizedText.match(/nota[\s:]*(\d+(?:\.?\d+)?)/i);
  return notaMatch ? parseFloat(notaMatch[1]) : null;
}

function extractRank($: CheerioAPI, normalizedText: string): number | null {
  // Try CSS selectors near the rating component
  const rankCandidates = $("div.ludo-fh-nota__rank, .ludo-rank, [class*='rank'], span:contains('#')");
  for (const el of rankCandidates.toArray()) {
    const elText = $(el).text().trim();
    const rankMatch = elText.match(/#\s*(\d+)\s*rank/i) || elText.match(/#\s*(\d+)/);
    if (rankMatch) {
      return parseInt(rankMatch[1], 10);
    }
  }

  // Fallback: search normalized text for "#NNN rank BG" pattern
  const rankMatch = normalizedText.match(/#\s*(\d+)\s*rank/i);
  return rankMatch ? parseInt(rankMatch[1], 10) : null;
}

function extractPlayersRange(
  enqData: EnqData,
  normalizedText: string
): { minPlayers: number | null; maxPlayers: number | null } {
  if (enqData.playersRange) {
    const rangeMatch = enqData.playersRange.match(/(\d{1,3})\s*[aA]\s*(\d{1,3})/);
    if (rangeMatch) {
      return {
        minPlayers: parseInt(rangeMatch[1], 10),
        maxPlayers: parseInt(rangeMatch[2], 10),
      };
    }
  } else {
    const playersMatch = normalizedText.match(
      /(?:jogadores?|players?)[\s:]{0,3}(\d{1,3})\s*(?:a|to|-)\s*(\d{1,3})/i,
    );
    if (playersMatch) {
      return {
        minPlayers: parseInt(playersMatch[1], 10),
        maxPlayers: parseInt(playersMatch[2], 10),
      };
    }
  }

  return { minPlayers: null, maxPlayers: null };
}

function extractBestPlayers(enqData: EnqData, normalizedText: string): number | null {
  if (enqData.bestPlayers !== undefined) {
    return enqData.bestPlayers;
  }

  const bestPlayersMatch = normalizedText.match(
    /(?:melhor\s*com|best\s*with)\s*(\d+)/i,
  );
  return bestPlayersMatch ? parseInt(bestPlayersMatch[1], 10) : null;
}

function extractPlaytime(enqData: EnqData, normalizedText: string): number | null {
  if (enqData.duration) {
    const durationMatch = enqData.duration.match(/(\d{1,4})\s*min/i);
    return durationMatch ? parseInt(durationMatch[1], 10) : null;
  }

  const durationMatch = normalizedText.match(
    /(?:duração|duration|tempo)[\s:]*(\d+)\s*min/i,
  );
  return durationMatch ? parseInt(durationMatch[1], 10) : null;
}

function extractMinAge(enqData: EnqData, normalizedText: string): number | null {
  if (enqData.age) {
    const ageMatch = enqData.age.match(/(\d{1,3})\+/);
    return ageMatch ? parseInt(ageMatch[1], 10) : null;
  }

  const ageMatch = normalizedText.match(/(?:idade|age)[\s:]*(\d+)\+?/i);
  return ageMatch ? parseInt(ageMatch[1], 10) : null;
}

function extractPublisher($: CheerioAPI): string | null {
  const publisherText = extractFromDtDd($, "editora");
  if (!publisherText) return null;

  // Publisher: take the first part before "ver todas" link
  return publisherText
    .replace(/ver\s+todas[^)]*\)/i, "")
    .split("\n")
    .filter((line: string) => line.trim().length > 0)
    .shift()
    ?.trim() ?? null;
}

const ROLE_LABELS = /designer|editora|artista|mecânicas|categorias/gi;

function extractRole($: CheerioAPI, label: string): string | null {
  const text = extractFromDtDd($, label);
  if (!text) return null;

  return text
    .replace(ROLE_LABELS, "")
    .replace(/ver\s+todas[^)]*\)/i, "")
    .trim();
}

function extractCoverImage($: CheerioAPI): string | null {
  const candidates = [
    $("#img-capa").first().attr("src"),
    $("img.ludo-fh-capa__img").first().attr("src"),
    $('meta[property="og:image"]').first().attr("content"),
    $("img.cover").first().attr("src"),
    $("img.jogo-img").first().attr("src"),
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function extractList($: CheerioAPI, keywords: string[]): string[] {
  const result: string[] = [];

  $("dt").each((_, dtElement) => {
    const dt = $(dtElement);
    const dtText = dt.text().trim().toLowerCase();
    if (!keywords.some((keyword) => dtText.includes(keyword))) return;

    const dd = dt.next("dd");
    if (!dd.length) return;

    dd.find("a")
      .filter((_, el): boolean => $(el).text().trim().length > 0)
      .each((_, el) => {
        const text = $(el).text().trim();
        if (text && !result.includes(text)) {
          result.push(text);
        }
      });
  });

  return result;
}

export function parseLudopediaGame(html: string, sourceUrl: string): ImportedGameData {
  const $ = loadCheerio(html);
  const normalizedText = getNormalizedPageText($);
  const enqData = extractEnqData($);

  const name = extractName($);
  const { minPlayers, maxPlayers } = extractPlayersRange(enqData, normalizedText);

  return {
    name: name ?? undefined,
    originalName: name,
    description: null,
    year: extractYear(name, normalizedText),
    minPlayers,
    maxPlayers,
    minPlaytime: extractPlaytime(enqData, normalizedText),
    publisher: extractPublisher($),
    designer: extractRole($, "designer"),
    artist: extractRole($, "artista"),
    ludoRating: extractRating($, normalizedText),
    bggRating: null,
    bggRank: null,
    ludoRank: extractRank($, normalizedText),
    weight: null,
    interaction: enqData.interaction ?? null,
    luck: enqData.luck ?? null,
    downtime: enqData.downtime ?? null,
    replayability: enqData.replayability ?? null,
    bestPlayers: extractBestPlayers(enqData, normalizedText),
    minAge: extractMinAge(enqData, normalizedText),
    coverImage: extractCoverImage($),
    mechanics: extractList($, ["mec", "mecanica"]),
    categories: extractList($, ["categor", "categori"]),
    sourceUrl,
  };
}

function isRedirectStatus(status: number): boolean {
  return REDIRECT_STATUSES.includes(status);
}

async function fetchPage(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(url, {
      method: "GET",
      headers: REQUEST_HEADERS,
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveRedirectLocation(response: Response, currentUrl: string): string {
  const location = response.headers.get("location");
  if (!location) {
    throw new Error("Redirect sem header Location.");
  }

  const locationUrl = new URL(location, currentUrl).toString();
  const hostname = locationUrl.split("/")[2];
  if (!isLudopediaDomain(hostname)) {
    throw new Error(`Redirect para host não permitido: ${hostname}`);
  }

  return locationUrl;
}

interface PageResult {
  html?: string;
  redirectUrl?: string;
}

async function loadLudopediaPage(url: string): Promise<PageResult> {
  const response = await fetchPage(url);

  if (
    !isLudopediaDomain(new URL(response.url).hostname) &&
    !isRedirectStatus(response.status)
  ) {
    throw new Error(
      `Redirect para host diferente não permitido: ${new URL(response.url).hostname}`,
    );
  }

  if (isRedirectStatus(response.status)) {
    return { redirectUrl: resolveRedirectLocation(response, url) };
  }

  if (response.status !== 200) {
    throw new Error(`Erro ${response.status} ao carregar a página.`);
  }

  const html = await response.text();
  const $ = loadCheerio(html);
  const bodyText = $("body").text();

  if (!bodyText || bodyText.trim().length < 500) {
    throw new Error("Página HTML vazia ou muito curta.");
  }

  return { html };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLudopediaGame(sourceUrl: string): Promise<ImportedGameData> {
  let currentUrl: string;

  try {
    currentUrl = normalizeLudopediaUrl(sourceUrl);
  } catch (error) {
    throw new Error(`URL da Ludopedia inválida: ${(error as Error).message}`);
  }

  let errorMessage = "";

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    try {
      const page = await loadLudopediaPage(currentUrl);
      if (page.redirectUrl) {
        currentUrl = page.redirectUrl;
        continue;
      }

      return parseLudopediaGame(page.html ?? "", currentUrl);
    } catch (error) {
      errorMessage = (error as Error).message || "Erro desconhecido";
      if (attempt < MAX_REDIRECTS) {
        await delay((attempt + 1) * 1000);
        continue;
      }
      break;
    }
  }

  throw new Error(
    errorMessage || "Não foi possível extrair dados da Ludopedia. A página pode ter mudado de estrutura ou estar bloqueando o acesso.",
  );
}

export { extractLudopediaSlug, normalizeLudopediaUrl };
