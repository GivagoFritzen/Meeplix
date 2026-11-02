import { z } from "zod";

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Senhas não conferem",
  path: ["confirmNewPassword"],
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;