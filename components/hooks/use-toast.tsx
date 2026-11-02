"use client";

import { createContext, useContext, useState, useMemo, useCallback, ReactNode } from "react";
import { Toast, ToastTitle, ToastDescription, ToastClose, ToastViewport, ToastProvider } from "@/components/ui/toast";

type ToastVariant = "default" | "destructive" | "success";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

type ToastItem = ToastOptions & { id: string };

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProviderWrapper({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(({ title, description, variant = "default" }: ToastOptions) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const contextValue = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastProvider>
        <ToastViewport>
          {toasts.map((t) => (
            <Toast key={t.id} variant={t.variant}>
              <div className="grid gap-1">
                <ToastTitle>{t.title}</ToastTitle>
                {t.description && <ToastDescription>{t.description}</ToastDescription>}
              </div>
              <ToastClose />
            </Toast>
          ))}
        </ToastViewport>
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de ToastProviderWrapper");
  }
  return context;
}