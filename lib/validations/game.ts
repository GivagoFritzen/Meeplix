import { z, type ZodTypeAny } from "zod";

const decimalField = (base: ZodTypeAny) =>
  z.preprocess((v) => {
    if (typeof v === "string") {
      const n = parseFloat(v.replace(",", "."));
      return isNaN(n) ? undefined : n;
    }
    if (typeof v === "number" && Number.isNaN(v)) return undefined;
    return v;
  }, base);

const integerField = (base: ZodTypeAny) =>
  z.preprocess((v) => {
    if (typeof v === "string") {
      if (/[,.]/.test(v)) return undefined;
      const n = parseInt(v, 10);
      return isNaN(n) ? undefined : n;
    }
    if (typeof v === "number" && Number.isNaN(v)) return undefined;
    return v;
  }, base);

const GameCreateBaseSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  originalName: z.string().max(200).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  year: integerField(z.number().int().min(1900).max(new Date().getFullYear() + 5).optional().nullable()),
  minPlayers: integerField(z.number().int().min(1, "Mín. jogadores é obrigatório").max(20)),
  maxPlayers: integerField(z.number().int().min(1, "Máx. jogadores é obrigatório").max(20)),
  minPlaytime: integerField(z.number().int().min(1, "Duração é obrigatória").max(1440)),
  publisher: z.string().max(200).optional().nullable(),
  designer: z.string().max(200).optional().nullable(),
  artist: z.string().max(200).optional().nullable(),
  bggRating: decimalField(z.number().min(0).max(10).optional().nullable()),
  ludoRating: decimalField(z.number().min(0).max(10).optional().nullable()),
  bggRank: integerField(z.number().int().positive().optional().nullable()),
  ludoRank: integerField(z.number().int().positive().optional().nullable()),
  weight: decimalField(z.number().min(1.0).max(5.0).optional().nullable()),
  interaction: decimalField(z.number().min(1.0).max(5.0).optional().nullable()),
  luck: decimalField(z.number().min(1.0).max(5.0).optional().nullable()),
  downtime: decimalField(z.number().min(1.0).max(5.0).optional().nullable()),
  replayability: decimalField(z.number().min(1.0).max(5.0).optional().nullable()),
  bestPlayers: integerField(z.number().int().min(1, "Melhor com é obrigatório").max(20)),
  minAge: integerField(z.number().int().min(0, "Idade mín. é obrigatória").max(99)),
  notes: z.string().max(10000).optional().nullable(),
  coverImage: z.string().url().or(z.string().startsWith("data:image/")).or(z.literal("")).nullable().optional().transform((v) => (v === "" ? null : v)),
  mechanics: z.array(z.string().max(50)).default([]),
  categories: z.array(z.string().max(50)).default([]),
  preparationText: z.string().max(10000).optional().nullable(),
  links: z.object({
    bgg: z.string().url().or(z.literal("")).nullable().optional().transform((v) => (v === "" ? null : v)),
    ludopedia: z.string().url().or(z.literal("")).nullable().optional().transform((v) => (v === "" ? null : v)),
    manual: z.string().url().or(z.literal("")).nullable().optional().transform((v) => (v === "" ? null : v)),
  }).optional(),
});

export const GameCreateSchema = GameCreateBaseSchema.refine((data) => {
  if (data.minPlayers && data.maxPlayers && data.minPlayers > data.maxPlayers) {
    return false;
  }
  return true;
}, {
  message: "Jogadores mínimos não pode ser maior que máximos",
  path: ["maxPlayers"],
});

export const GameUpdateSchema = GameCreateBaseSchema.partial();

export const GameFilterSchema = z.object({
  search: z.string().optional(),
  players: z.enum(["all", "solo", "2", "3-4", "5+"]).optional(),
  minPlayers: z.string().optional(),
  maxPlayers: z.string().optional(),
  duration: z.enum(["all", "quick", "medium", "long"]).optional(),
  complexity: z.enum(["all", "light", "medium", "heavy"]).optional(),
  mechanic: z.string().optional(),
  sort: z.enum(["name", "year", "bggRating", "ludoRating", "weight"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(24),
});

export const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type GameCreateInput = z.infer<typeof GameCreateSchema>;
export type GameUpdateInput = z.infer<typeof GameUpdateSchema>;
export type GameFilterInput = z.infer<typeof GameFilterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;