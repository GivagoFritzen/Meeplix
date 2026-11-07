"use client";

import { useState, useEffect } from "react";
import { PackageOpen } from "lucide-react";
import { formatFileSize, isAudioFile, resolveAssetUrl } from "@/lib/utils";
import type { getGameBySlug } from "@/app/actions/games";

type Game = NonNullable<Awaited<ReturnType<typeof getGameBySlug>>>;
type TabId = "resumo" | "arquivos" | "audio" | "preparo";

const fileTypeLabels: Record<string, string> = {
  MANUAL: "Manual Oficial",
  RULEBOOK: "Livro de Regras",
  ERRATA: "Errata / FAQ",
  QUICK_REFERENCE: "Guia de Consulta Rápida",
  IMAGE: "Imagem",
  OTHER: "Documento",
};

export function GameDetailTabs({ game }: { game: Game }) {
  const [activeTab, setActiveTab] = useState<TabId>("resumo");

  const links = (game.links as Record<string, string | null | undefined>) || {};

  const nonCoverFiles = game.files.filter((file) => file.type !== "COVER");
  const displayFiles = nonCoverFiles.filter((f) => !isAudioFile(f));

  // Áudios: derivados de game.files (mimeType audio/* ou extensão de áudio)
  const audioFiles = game.files.filter(isAudioFile).map((f) => ({
    id: f.id,
    path: f.path,
    name: f.displayName || f.originalName,
    size: f.size,
  }));

  const hasFiles = displayFiles.length > 0;
  const hasAudio = audioFiles.length > 0;

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "resumo", label: "Resumo" },
    { id: "preparo", label: "Preparo" },
    ...(hasFiles ? [{ id: "arquivos" as TabId, label: "Arquivos" }] : []),
    ...(hasAudio ? [{ id: "audio" as TabId, label: "Áudio" }] : []),
  ];

  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- garante uma aba válida após mudança de props
      setActiveTab("resumo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <>
      {/* Barra de abas: mobile e desktop */}
      <section
        className="w-full p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200/80 shadow-sm"
        role="tablist"
        aria-label="Seções do jogo"
      >
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {tabs.map((tab, index) => {
            const selected = activeTab === tab.id;
            // Em telas pequenas a grade tem 2 colunas: se a quantidade for ímpar,
            // a última aba ocupa a linha inteira para não deixar célula vazia.
            const isLastOdd = tabs.length % 2 !== 0 && index === tabs.length - 1;

            const tabClasses = `flex-shrink-0 inline-flex w-full min-h-[48px] items-center justify-center gap-2 whitespace-nowrap px-2 py-3 rounded-lg text-[13px] transition select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5100]/40 sm:w-auto sm:min-h-0 sm:justify-start sm:whitespace-normal sm:select-auto sm:px-4 sm:py-2.5 sm:text-sm sm:active:scale-100 ${
              isLastOdd ? "col-span-2 sm:col-span-1" : ""
            } ${
              selected
                ? "bg-[#ff5100] text-white shadow-sm font-semibold border border-transparent"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 font-medium"
            }`;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={tabClasses}
              >
                {tab.id === "resumo" && (
                  <svg
                    className="w-[18px] h-[18px] sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}

                {tab.id === "preparo" && (
                  <PackageOpen
                    className="w-[18px] h-[18px] sm:w-4 sm:h-4"
                    aria-hidden="true"
                  />
                )}

                {tab.id === "arquivos" && (
                  <svg
                    className="w-[18px] h-[18px] sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}

                {tab.id === "audio" && (
                  <svg
                    className="w-[18px] h-[18px] sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}

                <span>{tab.label}</span>

                {tab.id === "arquivos" && (
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${selected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {displayFiles.length}
                  </span>
                )}

                {tab.id === "audio" && (
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold leading-none ${selected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {audioFiles.length}
                  </span>
                )}
              </button>
            );
          })}

          {links.manual && (
            <a
              href={links.manual}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 inline-flex w-full shrink-0 min-h-[48px] items-center justify-center gap-1.5 px-3 py-3 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 font-medium text-[13px] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5100]/40 sm:col-span-1 sm:w-auto sm:min-h-0 sm:justify-start sm:py-2.5 sm:text-sm sm:active:scale-100"
            >
              <svg
                className="w-4 h-4 text-amber-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span>Manual Online</span>
            </a>
          )}
        </div>
      </section>

      {/* Conteúdo das abas */}
      <div className="w-full mt-6">
        <div className="w-full space-y-6">
          {/* Resumo */}
          {activeTab === "resumo" && (
            <article
              id="panel-resumo"
              role="tabpanel"
              aria-labelledby="tab-resumo"
              className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <span className="p-2 rounded-lg bg-orange-50 text-[#ff5100] border border-orange-200">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Resumo da Jogabilidade &amp; Regras
                </h2>
              </div>

              {game.description ? (
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                  {game.description}
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic py-2">
                  Nenhuma descrição cadastrada para este jogo.
                </p>
              )}
            </article>
          )}

          {activeTab === "preparo" && (
            <article
              id="panel-preparo"
              role="tabpanel"
              aria-labelledby="tab-preparo"
              className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <span className="p-2 rounded-lg bg-orange-50 text-[#ff5100] border border-orange-200">
                  <PackageOpen
                    className="w-5 h-5"
                    aria-hidden="true"
                  />
                </span>

                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Prepara&ccedil;&atilde;o
                </h2>
              </div>

              {game.preparationText ? (
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                  {game.preparationText}
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic py-2">
                  Nenhum texto de prepara&ccedil;&atilde;o cadastrado para este jogo.
                </p>
              )}
            </article>
          )}

          {/* Arquivos */}
          {activeTab === "arquivos" && (
            <section
              id="panel-arquivos"
              role="tabpanel"
              aria-labelledby="tab-arquivos"
              className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-orange-50 text-[#ff5100] border border-orange-200">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>

                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Arquivos &amp; Documentos
                    </h2>
                    <p className="text-xs text-slate-500 hidden sm:block">
                      Manuais, guias de referência rápida e fichas para impressão
                    </p>
                  </div>
                </div>
              </div>

              {displayFiles.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  <p>Nenhum arquivo anexado ainda.</p>
                </div>
              ) : (
                <div className="space-y-2.5 pt-1">
                  {displayFiles.map((file) => {
                    const fileUrl = resolveAssetUrl(file.path);
                    const extUpper = (file.extension || "FILE")
                      .toUpperCase()
                      .replace(".", "");
                    const typeLabel = fileTypeLabels[file.type] || "Documento";

                    const isInlineViewable = file.mimeType === "application/pdf" || file.mimeType?.startsWith("image/");

                    let badgeStyle =
                      "bg-blue-50 border-blue-200 text-blue-700";

                    if (extUpper === "PDF") {
                      badgeStyle =
                        "bg-rose-50 border-rose-200 text-rose-700";
                    } else if (
                      ["XLSX", "XLS", "CSV"].includes(extUpper)
                    ) {
                      badgeStyle =
                        "bg-emerald-50 border-emerald-200 text-emerald-700";
                    } else if (
                      ["PNG", "JPG", "JPEG", "WEBP"].includes(extUpper)
                    ) {
                      badgeStyle =
                        "bg-purple-50 border-purple-200 text-purple-700";
                    }

                    return (
                      <div
                        key={file.id}
                        className="relative flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-[#ff5100]/40 transition group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pointer-events-none">
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-xs flex-shrink-0 ${badgeStyle}`}
                          >
                            {extUpper.slice(0, 4)}
                          </div>

                          <div className="min-w-0 pr-2">
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-[#ff5100] transition-colors truncate">
                              {file.displayName || file.originalName}
                            </h4>

                            <div className="text-[11px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                              <span>
                                {extUpper} · {formatFileSize(file.size)}
                              </span>
                              <span>•</span>
                              <span>{typeLabel}</span>
                            </div>
                          </div>
                        </div>

                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={!isInlineViewable ? true : undefined}
                            className="absolute inset-0 z-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5100]"
                            aria-label={`${isInlineViewable ? "Abrir" : "Baixar"} ${file.displayName || file.originalName}`}
                          />
                        )}

                        {fileUrl && (
                          <div className="text-xs font-medium text-slate-700 group-hover:text-[#ff5100] transition flex items-center gap-1.5 flex-shrink-0 pointer-events-none pr-1">
                            <span>{isInlineViewable ? "Abrir" : "Baixar"}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Áudio */}
          {activeTab === "audio" && (
            <section
              id="panel-audio"
              role="tabpanel"
              aria-labelledby="tab-audio"
              className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 animate-fade-in"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <span className="p-2 rounded-lg bg-orange-50 text-[#ff5100] border border-orange-200">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Áudios do Jogo
                  </h2>
                  <p className="text-xs text-slate-500">
                    Trilhas sonoras e arquivos de áudio
                  </p>
                </div>
              </div>

              {audioFiles.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  <svg
                    className="w-10 h-10 mx-auto mb-3 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p>Nenhum áudio cadastrado para este jogo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {audioFiles.map((audio) => {
                    const audioUrl = resolveAssetUrl(audio.path);

                    if (!audioUrl) return null;

                    return (
                      <div
                        key={audio.id}
                        className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="p-2 rounded-lg bg-orange-50 text-[#ff5100] border border-orange-200 flex-shrink-0">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path
                                d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>

                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-800 truncate">
                              {audio.name || "Áudio do jogo"}
                            </h3>
                            {audio.size != null && (
                              <p className="text-xs text-slate-500 mt-1">
                                {formatFileSize(audio.size)}
                              </p>
                            )}
                          </div>
                        </div>

                        <audio
                          controls
                          preload="none"
                          className="w-full"
                          aria-label={audio.name || "Áudio do jogo"}
                        >
                          <source src={audioUrl} />
                          Seu navegador não suporta a reprodução de áudio.
                        </audio>

                        <a
                          href={audioUrl}
                          download
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 transition"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Baixar áudio
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Notas da coleção */}
          {game.notes && (
            <article className="bg-white border border-amber-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-amber-100 pb-3">
                <span className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Notas da Coleção
                </h3>
              </div>

              <div className="text-slate-700 text-sm whitespace-pre-line leading-relaxed">
                {game.notes}
              </div>
            </article>
          )}
        </div>
      </div>
    </>
  );
}
