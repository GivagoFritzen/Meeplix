import { z, type ZodTypeAny } from "zod";

const numericField = (base: ZodTypeAny) =>
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

const emptyToNull = (value: string | null | undefined) => (value === "" ? null : value);

const optionalUrlField = () =>
  z
    .string()
    .url("URL inválida")
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform(emptyToNull);

const optionalCoverImageField = () =>
  z
    .string()
    .url("URL inválida")
    .or(z.string().startsWith("data:image/"))
    .or(z.literal(""))
    .nullable()
    .optional()
    .transform(emptyToNull);

const requiredNumber = () =>
  z.number({
    required_error: "Campo obrigatório",
    invalid_type_error: "Campo obrigatório",
  });

const GameCreateBaseSchema = z.object({
  name: z
    .string({
      required_error: "Campo obrigatório",
      invalid_type_error: "Campo obrigatório",
    })
    .min(1, "Campo obrigatório")
    .max(200, "Máximo de 200 caracteres"),
  originalName: z.string().max(200, "Máximo de 200 caracteres").optional().nullable(),
  description: z.string().max(10000, "Máximo de 10.000 caracteres").optional().nullable(),
  year: integerField(z.number().int().min(1900, "Ano inválido").max(new Date().getFullYear() + 5, "Ano inválido").optional().nullable()),
  minPlayers: integerField(requiredNumber().int().min(1, "Mínimo de 1 jogador").max(20, "Máximo de 20 jogadores")),
  maxPlayers: integerField(requiredNumber().int().min(1, "Mínimo de 1 jogador").max(20, "Máximo de 20 jogadores")),
  minPlaytime: integerField(requiredNumber().int().min(1, "Duração deve ser maior que zero").max(1440, "Duração máxima de 1440 minutos")),
  publisher: z.string().max(200, "Máximo de 200 caracteres").optional().nullable(),
  designer: z.string().max(200, "Máximo de 200 caracteres").optional().nullable(),
  artist: z.string().max(200, "Máximo de 200 caracteres").optional().nullable(),
  bggRating: numericField(z.number().min(0, "Nota entre 0 e 10").max(10, "Nota entre 0 e 10").optional().nullable()),
  ludoRating: numericField(z.number().min(0, "Nota entre 0 e 10").max(10, "Nota entre 0 e 10").optional().nullable()),
  bggRank: integerField(z.number().int().positive("Ranking deve ser positivo").optional().nullable()),
  ludoRank: integerField(z.number().int().positive("Ranking deve ser positivo").optional().nullable()),
  weight: numericField(z.number().min(1.0, "Peso entre 1.0 e 5.0").max(5.0, "Peso entre 1.0 e 5.0").optional().nullable()),
  interaction: numericField(z.number().min(1.0, "Valor entre 1.0 e 5.0").max(5.0, "Valor entre 1.0 e 5.0").optional().nullable()),
  luck: numericField(z.number().min(1.0, "Valor entre 1.0 e 5.0").max(5.0, "Valor entre 1.0 e 5.0").optional().nullable()),
  downtime: numericField(z.number().min(1.0, "Valor entre 1.0 e 5.0").max(5.0, "Valor entre 1.0 e 5.0").optional().nullable()),
  replayability: numericField(z.number().min(1.0, "Valor entre 1.0 e 5.0").max(5.0, "Valor entre 1.0 e 5.0").optional().nullable()),
  bestPlayers: integerField(z.number().int().min(1, "Mínimo de 1 jogador").max(20, "Máximo de 20 jogadores").optional().nullable()),
  minAge: integerField(requiredNumber().int().min(0, "Idade mínima inválida").max(99, "Idade máxima de 99 anos")),
  notes: z.string().max(10000, "Máximo de 10.000 caracteres").optional().nullable(),
  coverImage: optionalCoverImageField(),
  mechanics: z.array(z.string().max(50, "Máximo de 50 caracteres")).default([]),
  categories: z.array(z.string().max(50, "Máximo de 50 caracteres")).default([]),
  preparationText: z.string().max(10000, "Máximo de 10.000 caracteres").optional().nullable(),
  isActive: z.boolean().default(false).optional(),
  links: z.object({
    bgg: optionalUrlField(),
    ludopedia: optionalUrlField(),
    manual: optionalUrlField(),
  }).optional(),
});

export const RATING_PAIR_REQUIRED_MESSAGE =
  "Campo obrigatório: informe nota e ranking do BGG ou da Ludopedia.";

type RatingRankFields = Pick<
  z.infer<typeof GameCreateBaseSchema>,
  "bggRating" | "bggRank" | "ludoRating" | "ludoRank"
>;

function isFilled(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function addRatingPairIssues(
  data: RatingRankFields,
  ctx: z.RefinementCtx,
  requirePair: boolean
): void {
  const hasBggRating = isFilled(data.bggRating);
  const hasBggRank = isFilled(data.bggRank);
  const hasLudoRating = isFilled(data.ludoRating);
  const hasLudoRank = isFilled(data.ludoRank);

  if (hasBggRating !== hasBggRank) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [hasBggRating ? "bggRank" : "bggRating"],
      message: hasBggRating
        ? "Campo obrigatório: informe o ranking do BGG para completar o par."
        : "Campo obrigatório: informe a nota do BGG para completar o par.",
    });
  }

  if (hasLudoRating !== hasLudoRank) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [hasLudoRating ? "ludoRank" : "ludoRating"],
      message: hasLudoRating
        ? "Campo obrigatório: informe o ranking da Ludopedia para completar o par."
        : "Campo obrigatório: informe a nota da Ludopedia para completar o par.",
    });
  }

  const hasAnyField = hasBggRating || hasBggRank || hasLudoRating || hasLudoRank;

  if (requirePair && !hasAnyField) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["bggRating"],
      message: RATING_PAIR_REQUIRED_MESSAGE,
    });
  }
}

const RatingPairSchema = GameCreateBaseSchema.pick({
  bggRating: true,
  bggRank: true,
  ludoRating: true,
  ludoRank: true,
}).superRefine((data, ctx) => {
  addRatingPairIssues(data, ctx, true);
});

export const GameCreateSchema = z.intersection(
  GameCreateBaseSchema.refine(
    (data) => {
      if (data.minPlayers && data.maxPlayers && data.minPlayers > data.maxPlayers) {
        return false;
      }
      return true;
    },
    {
      message: "Jogadores mínimos não pode ser maior que máximos",
      path: ["maxPlayers"],
    }
  ),
  RatingPairSchema
);

export const GameUpdateSchema = GameCreateBaseSchema.partial().superRefine(
  (data, ctx) => {
    addRatingPairIssues(data, ctx, false);
  }
);

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