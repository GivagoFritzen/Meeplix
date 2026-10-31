"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProviderWrapper } from "@/components/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <ToastProviderWrapper>
          {children}
        </ToastProviderWrapper>
      </TooltipProvider>
    </SessionProvider>
  );
}