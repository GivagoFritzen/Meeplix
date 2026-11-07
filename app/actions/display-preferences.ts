"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  DisplayPreferencesSchema,
  type DisplayPreferences,
} from "@/lib/display-preferences-config";

export type { DisplayPreferences };

export async function getDisplayPreferences(): Promise<DisplayPreferences> {
  const config = await prisma.siteConfig.findFirst();

  if (!config) {
    return DEFAULT_DISPLAY_PREFERENCES;
  }

  return {
    hideDesigners: config.hideDesigners,
    hidePublishers: config.hidePublishers,
    hideArtists: config.hideArtists,
    hideTags: config.hideTags,
  };
}

export async function updateDisplayPreferences(
  data: DisplayPreferences,
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
