"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";
import { ChangePasswordSchema } from "@/lib/validations/auth";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

export async function changePassword(data: z.infer<typeof ChangePasswordSchema>) {
  const validated = ChangePasswordSchema.parse(data);
  
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");

  const dbUser = await prisma.adminUser.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) throw new Error("Usuário não encontrado");

  const isValid = await verifyPassword(validated.currentPassword, dbUser.passwordHash);
  if (!isValid) throw new Error("Senha atual incorreta");

  const newHash = await hashPassword(validated.newPassword);

  await prisma.adminUser.update({
    where: { id: dbUser.id },
    data: { passwordHash: newHash },
  });

  return { success: true };
}