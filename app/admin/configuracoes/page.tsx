"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/hooks/use-toast";
import {
  useDisplayPreferences,
  type DisplayPreferences as PreferenceState,
} from "@/lib/display-preferences";

interface ToggleSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: ToggleSwitchProps) {
  return (
    <div className="py-4 flex items-center justify-between gap-4">
      <div className="pr-4">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-[#334155] cursor-pointer select-none"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        )}
      </div>

      <label
        htmlFor={id}
        className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0"
      >
        <input
          id={id}
          name={id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />

        <div
          className={`w-14 h-8 p-1 rounded-full flex items-center transition-colors duration-200 ${checked ? "bg-[#ff5100]" : "bg-[#cbd5e1]"
            } peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#ff5100]`}
        >
          <div
            className={`w-6 h-6 shrink-0 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${checked ? "translate-x-6" : "translate-x-0"
              }`}
          />
        </div>
      </label>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { toast } = useToast();

  const {
    preferences,
    isLoaded,
    updatePreferences,
  } = useDisplayPreferences();

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowToast(false);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [showToast]);

  const savePreferences = async (newPreferences: PreferenceState) => {
    try {
      await updatePreferences(newPreferences);

      setShowToast(true);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as preferências globalmente.",
        variant: "destructive",
      });
    }
  };

  const handleToggleChange = (
    key: keyof PreferenceState,
    value: boolean,
  ) => {
    const newPreferences = {
      ...preferences,
      [key]: value,
    };

    savePreferences(newPreferences);
  };

  if (!isLoaded) {
    return (
      <div className="bg-[#f8fafc] text-[#0f172a] antialiased min-h-screen flex flex-col">
        <header className="w-full bg-[#2c274b] text-white shadow-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold group"
            >
              <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">
                arrow_back
              </span>

              <span>Voltar ao Painel de Administração</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-6 pt-8 pb-16 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border-4 border-[#ff5100]/30 border-t-[#ff5100] rounded-full animate-spin" />

            <span className="text-sm font-medium text-slate-500">
              Carregando preferências...
            </span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] text-[#0f172a] antialiased min-h-screen flex flex-col selection:bg-[#ff5100] selection:text-white">
      {/* Cabeçalho superior: Tema BGG / Mesa Geek */}
      <header className="w-full bg-[#2c274b] text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold group"
          >
            <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">
              arrow_back
            </span>

            <span>Voltar ao Painel de Administração</span>
          </Link>
        </div>
      </header>

      {/* Canvas Principal */}
      <main className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {/* Cabeçalho da Seção */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#ff5100]/10 text-[#ff5100] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">visibility</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">Preferências de Exibição</h1>
            </div>
          </div>
        </div>

        {/* Bento Grid de Configurações */}
        <div className="flex flex-col gap-6">
          {/* Bloco 1: Gestão de Créditos de Produção */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 mb-2 border-b border-[#e2e8f0]">
              <span className="material-symbols-outlined text-[22px] text-[#ff5100]">
                badge
              </span>

              <h2 className="text-base font-bold text-[#0f172a]">
                Créditos de Autoria e Produção
              </h2>
            </div>

            <div className="divide-y divide-[#f1f5f9]">
              <ToggleSwitch
                id="toggle-designers"
                label="Ocultar Designers / Autores"
                description="Não exibirá o nome dos criadores na ficha pública dos jogos"
                checked={preferences.hideDesigners}
                onChange={(checked) =>
                  handleToggleChange("hideDesigners", checked)
                }
              />

              <ToggleSwitch
                id="toggle-publishers"
                label="Ocultar Editoras / Distribuidoras"
                description="Oculta o selo e créditos da editora nacional e internacional"
                checked={preferences.hidePublishers}
                onChange={(checked) =>
                  handleToggleChange("hidePublishers", checked)
                }
              />

              <ToggleSwitch
                id="toggle-artists"
                label="Ocultar Artistas / Ilustradores"
                description="Oculta créditos de arte de capa e componentes visuais"
                checked={preferences.hideArtists}
                onChange={(checked) =>
                  handleToggleChange("hideArtists", checked)
                }
              />
            </div>
          </section>

          {/* Bloco 2: Tags e Categorias */}
          <section className="bg-white rounded-xl p-6 border border-[#e2e8f0] shadow-sm">
            <div className="flex items-center gap-2.5 pb-4 mb-2 border-b border-[#e2e8f0]">
              <span className="material-symbols-outlined text-[22px] text-[#ff5100]">
                sell
              </span>

              <h2 className="text-base font-bold text-[#0f172a]">
                Tags e Categorias
              </h2>
            </div>

            <div className="divide-y divide-[#f1f5f9]">
              <ToggleSwitch
                id="toggle-tags"
                label="Ocultar Tags e Categorias"
                description="Oculta chips de mecânicas, categorias e tags na listagem e na ficha pública dos jogos"
                checked={preferences.hideTags}
                onChange={(checked) =>
                  handleToggleChange("hideTags", checked)
                }
              />
            </div>
          </section>
        </div>
      </main>

      {/* Notificação Flutuante de Confirmação (Toast) */}
      {showToast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in"
        >
          <span className="material-symbols-outlined text-emerald-400 text-[24px]">
            check_circle
          </span>

          <div>
            <div className="text-sm font-semibold">
              Preferências Atualizadas
            </div>

            <div className="text-xs text-slate-400">
              Modificações salvas globalmente e afetam todos os usuários.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}