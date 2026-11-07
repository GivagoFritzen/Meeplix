import { z } from "zod";

export const DisplayPreferencesSchema = z.object({
  hideDesigners: z.boolean(),
  hidePublishers: z.boolean(),
  hideArtists: z.boolean(),
  hideTags: z.boolean(),
});

export type DisplayPreferences = z.infer<typeof DisplayPreferencesSchema>;

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  hideDesigners: true,
  hidePublishers: false,
  hideArtists: false,
  hideTags: false,
};
