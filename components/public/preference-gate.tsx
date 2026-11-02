"use client";

import type { ReactNode } from "react";
import type { DisplayPreferences } from "@/lib/display-preferences";

interface PreferenceGateProps {
  hideKey: keyof DisplayPreferences;
  preferences: DisplayPreferences;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renderiza `children` apenas quando a preferência correspondente
 * em /admin/configuracoes NÃO estiver marcada para ocultar.
 * As preferências vêm do servidor (SiteConfig), afetando todos
 * os usuários, incluindo anônimos.
 */
export function PreferenceGate({
  hideKey,
  preferences,
  children,
  fallback = null,
}: PreferenceGateProps) {
  if (preferences[hideKey]) return <>{fallback}</>;
  return <>{children}</>;
}
