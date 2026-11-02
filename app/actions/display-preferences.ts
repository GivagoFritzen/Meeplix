"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DisplayPreferencesSchema = z.object({
  hideDesigners: z.boolean(),
  hidePublishers: z.boolean(),
  hideArtists: z.boolean(),
  hideTags: z.boolean(),
});

export type DisplayPreferences = z.infer<typeof DisplayPreferencesSchema>;

export async function getDisplayPreferences(): Promise<DisplayPreferences> {
  const config = await prisma.siteConfig.findFirst();

  if (!config) {
    return {
      hideDesigners: true,
      hidePublishers: false,
      hideArtists: false,
      hideTags: false,
    };
  }

  return {
    hideDesigners: config.hideDesigners,
    hidePublishers: config.hidePublishers,
    hideArtists: config.hideArtists,
    hideTags: config.hideTags,
  };
}

export async function updateDisplayPreferences(
  data: z.infer<typeof DisplayPreferencesSchema>,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");

  const validated = DisplayPreferencesSchema.parse(data);

  const config = await prisma.siteConfig.findFirst();

  if (config) {
    await prisma.siteConfig.update({
      where: { id: config.id },
      data: validated,
    });
  } else {
    await prisma.siteConfig.create({
      data: validated,
    });
  }

  revalidatePath("/");
  revalidatePath("/colecao");
  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");

  return { success: true };
}
