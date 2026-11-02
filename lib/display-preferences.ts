"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDisplayPreferences,
  updateDisplayPreferences,
  type DisplayPreferences,
} from "@/app/actions/display-preferences";

export type { DisplayPreferences };

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  hideDesigners: true,
  hidePublishers: false,
  hideArtists: false,
  hideTags: false,
};

export function useDisplayPreferences() {
  const [preferences, setPreferences] = useState<DisplayPreferences>(
    DEFAULT_DISPLAY_PREFERENCES,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getDisplayPreferences().then((prefs) => {
      setPreferences(prefs);
      setIsLoaded(true);
    });
  }, []);

  const updatePreferences = useCallback(
    async (next: DisplayPreferences) => {
      try {
        await updateDisplayPreferences(next);
        setPreferences(next);
      } catch {
        // falha silenciosa
      }
    },
    [],
  );

  return { preferences, isLoaded, updatePreferences, setPreferences };
}
