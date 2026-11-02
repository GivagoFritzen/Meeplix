import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().url({ message: "URL inválida" }).optional(),
);

export const GameImportRequestSchema = z.object({
  ludopediaUrl: optionalUrl,
  bggUrl: optionalUrl,
  gameId: z.string().cuid().optional(),
}).strict().refine(
  (value) => Boolean(value.ludopediaUrl || value.bggUrl),
  { message: "Informe a URL da Ludopedia, do BGG ou de ambos." },
);