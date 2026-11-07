"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDisplayPreferences,
  updateDisplayPreferences,
} from "@/app/actions/display-preferences";
import {
  DEFAULT_DISPLAY_PREFERENCES,
  type DisplayPreferences,
} from "@/lib/display-preferences-config";

export type { DisplayPreferences };

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

  return { preferences, isLoaded, updatePreferences };
}
