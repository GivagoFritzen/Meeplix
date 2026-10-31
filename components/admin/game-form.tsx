"use client";

import { useState, useEffect, useMemo, useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GameCreateSchema } from "@/lib/validations/game";
import { cn, formatFileSize, getComplexityLabel, isAudioFile, resolveAssetUrl } from "@/lib/utils";
import { deleteGameFiles } from "@/app/actions/files";
import { useToast } from "@/components/hooks/use-toast";
import NumericInput from "@/components/ui/numeric-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface GameFormProps {
  gameId: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

interface ExistingGameFile {
  id: string;
  originalName: string;
  displayName: string;
  mimeType: string;
  extension: string;
  size: number;
  path: string;
  type: string;
  uploadedAt: string;
}

const fileTypeLabels: Record<string, string> = {
  COVER: "Capa",
  MANUAL: "Manual Oficial",
  RULEBOOK: "Livro de Regras",
  ERRATA: "Errata / FAQ",
  QUICK_REFERENCE: "Guia de Consulta Rápida",
  IMAGE: "Imagem",
  OTHER: "Documento",
};

interface ScrapedGameData {
  name: string;
  originalName: string;
  description: string;
  year?: number;
  minPlayers?: number;
  maxPlayers?: number;
  minPlaytime?: number;
  weight?: number;
  interaction?: number;
  luck?: number;
  downtime?: number;
  replayability?: number;
  bggRating?: number;
  ludoRating?: number;
  bggRank?: number;
  ludoRank?: number;
  bestPlayers?: number;
  minAge?: number;
  coverImage: string;
  designer: string;
  artist: string;
  publisher: string;
  mechanics: string[];
  categories: string[];
  links: {
    bgg: string;
    ludopedia: string;
    manual: string;
  };
}

interface ScrapeResult {
  source: "bgg" | "ludopedia";
  input: string;
  status: "pending" | "processing" | "success" | "error";
  gameData?: ScrapedGameData;
  error?: string;
}

type GameFormValues = z.infer<typeof GameCreateSchema>;
type GameFormReturn = UseFormReturn<GameFormValues>;
type ScrapeStatus = "idle" | "loading" | "done";
type ComplexityLabel = ReturnType<typeof getComplexityLabel>;

interface RawGameData {
  name?: string;
  originalName?: string;
  description?: string;
  year?: number;
  minPlayers?: number;
  maxPlayers?: number;
  minPlaytime?: number;
  publisher?: string;
  designer?: string;
  artist?: string;
  bggRating?: number;
  ludoRating?: number;
  bggRank?: number;
  ludoRank?: number;
  weight?: number;
  interaction?: number;
  luck?: number;
  downtime?: number;
  replayability?: number;
  bestPlayers?: number;
  minAge?: number;
  notes?: string;
  preparationText?: string;
  coverImage?: string | null;
  coverImageData?: unknown;
  mechanics?: string[];
  categories?: string[];
  files?: unknown;
  links?: { bgg?: string; ludopedia?: string; manual?: string };
}

interface UploadedFileResponse {
  id?: string;
  originalName?: string;
  displayName?: string;
  mimeType?: string;
  extension?: string;
  size?: number | string;
  path?: string;
  type?: string;
}

const STATUS_CARD_CLASSES: Record<ScrapeResult["status"], string> = {
  pending: "bg-surface-container-highest/50 border-outline-variant/50",
  processing: "bg-surface-container-highest/50 border-outline-variant/50",
  success: "bg-surface-container-lowest border-outline-variant/50",
  error: "bg-error-container/20 border-error/50",
};

const STATUS_NAME_CLASSES: Record<ScrapeResult["status"], string> = {
  pending: "text-on-surface-variant",
  processing: "text-on-surface-variant",
  success: "text-on-surface",
  error: "text-error",
};

function getErrorMessage(error: unknown, fallback = "Erro desconhecido"): string {
  return error instanceof Error ? error.message : fallback;
}

function getSubmitLabel(isSubmitting: boolean, isNew: boolean): string {
  if (isSubmitting) return "Salvando...";
  return isNew ? "Criar Jogo" : "Salvar Alterações";
}

function mapGameFiles(rawFiles: unknown): ExistingGameFile[] {
  if (!Array.isArray(rawFiles)) return [];
  return rawFiles.map((file: Partial<ExistingGameFile>) => ({
    id: String(file.id ?? ""),
    originalName: file.originalName ?? "",
    displayName: file.displayName ?? file.originalName ?? "",
    mimeType: file.mimeType ?? "",
    extension: file.extension ?? "",
    size: Number(file.size ?? 0),
    path: file.path ?? "",
    type: file.type ?? "OTHER",
    uploadedAt: file.uploadedAt ?? "",
  }));
}

function coverDataToDataUri(coverData: unknown): string | null {
  if (!coverData || typeof coverData !== "object") return null;
  const { mimeType, base64 } = coverData as { mimeType?: string; base64?: string };
  if (!mimeType || !base64) return null;
  return `data:${mimeType};base64,${base64}`;
}

function buildCoverValue(data: RawGameData): string {
  if (data.coverImage) return data.coverImage;
  if (typeof data.coverImageData === "string") return data.coverImageData;
  return coverDataToDataUri(data.coverImageData) ?? "";
}

function resolveCoverPreview(
  data: RawGameData,
  coverFile: ExistingGameFile | undefined
): string | null {
  const direct = resolveAssetUrl(data.coverImage);
  if (direct) return direct;
  if (typeof data.coverImageData === "string") return resolveAssetUrl(data.coverImageData);
  const fromData = coverDataToDataUri(data.coverImageData);
  if (fromData) return fromData;
  return coverFile?.path ? resolveAssetUrl(coverFile.path) : null;
}

function or<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback;
}

function buildFormValues(data: RawGameData): GameFormValues {
  return {
    name: or(data.name, ""),
    originalName: or(data.originalName, ""),
    description: or(data.description, ""),
    year: or(data.year, new Date().getFullYear()),
    minPlayers: or(data.minPlayers, 1),
    maxPlayers: or(data.maxPlayers, 4),
    minPlaytime: or(data.minPlaytime, 30),
    publisher: or(data.publisher, ""),
    designer: or(data.designer, ""),
    artist: or(data.artist, ""),
    bggRating: or(data.bggRating, 0),
    ludoRating: or(data.ludoRating, 0),
    bggRank: data.bggRank,
    ludoRank: data.ludoRank,
    weight: or(data.weight, 2.5),
    interaction: data.interaction,
    luck: data.luck,
    downtime: data.downtime,
    replayability: data.replayability,
    bestPlayers: or(data.bestPlayers, 2),
    minAge: or(data.minAge, 10),
    notes: or(data.notes, ""),
    preparationText: or(data.preparationText, ""),
    coverImage: buildCoverValue(data),
    mechanics: or(data.mechanics, []),
    categories: or(data.categories, []),
    links: {
      bgg: or(data.links?.bgg, ""),
      ludopedia: or(data.links?.ludopedia, ""),
      manual: or(data.links?.manual, ""),
    },
  };
}

async function fetchGameData(gameId: string): Promise<RawGameData> {
  const res = await fetch(`/api/admin/games/${gameId}`);
  if (!res.ok) {
    throw new Error("Erro ao carregar dados do jogo");
  }
  return res.json();
}

function setFormValue<K extends keyof GameFormValues>(
  form: GameFormReturn,
  key: K,
  value: GameFormValues[K] | undefined
) {
  if (value !== undefined) {
    form.setValue(key, value, { shouldDirty: true });
  }
}

function setFormValueIfTruthy<K extends keyof GameFormValues>(
  form: GameFormReturn,
  key: K,
  value: GameFormValues[K] | undefined
) {
  if (value) {
    form.setValue(key, value, { shouldDirty: true });
  }
}

function applyScrapedValues(form: GameFormReturn, data: ScrapedGameData) {
  setFormValueIfTruthy(form, "name", data.name);
  setFormValueIfTruthy(form, "originalName", data.originalName);
  form.setValue("description", data.description || "", { shouldDirty: true });
  setFormValueIfTruthy(form, "year", data.year);
  setFormValueIfTruthy(form, "minPlayers", data.minPlayers);
  setFormValueIfTruthy(form, "maxPlayers", data.maxPlayers);
  setFormValueIfTruthy(form, "minPlaytime", data.minPlaytime);
  setFormValue(form, "interaction", data.interaction);
  setFormValue(form, "luck", data.luck);
  setFormValue(form, "downtime", data.downtime);
  setFormValue(form, "replayability", data.replayability);
  setFormValue(form, "bggRating", data.bggRating);
  setFormValue(form, "ludoRating", data.ludoRating);
  setFormValueIfTruthy(form, "bggRank", data.bggRank);
  setFormValueIfTruthy(form, "ludoRank", data.ludoRank);
  setFormValue(form, "bestPlayers", data.bestPlayers);
  setFormValue(form, "minAge", data.minAge);
  setFormValueIfTruthy(form, "designer", data.designer);
  setFormValueIfTruthy(form, "artist", data.artist);
  setFormValueIfTruthy(form, "publisher", data.publisher);
}

function applyScrapedLinks(form: GameFormReturn, links: ScrapedGameData["links"] | undefined) {
  if (!links) return;
  if (links.bgg) form.setValue("links.bgg", links.bgg, { shouldDirty: true });
  if (links.ludopedia) form.setValue("links.ludopedia", links.ludopedia, { shouldDirty: true });
}

function mapUploadedFile(file: UploadedFileResponse, fallbackType: string): ExistingGameFile {
  return {
    id: String(file.id),
    originalName: file.originalName ?? file.displayName ?? "",
    displayName: file.displayName ?? file.originalName ?? "",
    mimeType: file.mimeType ?? "",
    extension: file.extension ?? "",
    size: Number(file.size ?? 0),
    path: file.path ?? "",
    type: file.type ?? fallbackType,
    uploadedAt: new Date().toISOString(),
  };
}

async function uploadFiles(formData: FormData, type: string): Promise<ExistingGameFile[]> {
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Erro ao enviar arquivos");
  }
  const created = Array.isArray(json.files) ? (json.files as UploadedFileResponse[]) : [];
  return created.filter((file) => file?.id).map((file) => mapUploadedFile(file, type));
}

async function saveGameRequest(
  data: GameFormValues,
  links: GameFormValues["links"],
  isNew: boolean,
  gameId: string
): Promise<string> {
  const res = await fetch(isNew ? "/api/admin/games" : `/api/admin/games/${gameId}`, {
    method: isNew ? "POST" : "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, links }),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error || "Erro ao salvar jogo");
  }
  return result.id ?? gameId;
}

interface CoverSectionProps {
  form: GameFormReturn;
  coverPreview: string | null;
  setCoverPreview: (value: string | null) => void;
  coverFileInputRef: React.RefObject<HTMLInputElement>;
  markCoverFileForDeletion: () => void;
  existingCoverFileId: string | null;
  isMarkedForDeletion: (fileId: string) => boolean;
}

function CoverSection({
  form,
  coverPreview,
  setCoverPreview,
  coverFileInputRef,
  markCoverFileForDeletion,
  existingCoverFileId,
  isMarkedForDeletion,
}: CoverSectionProps) {
  return (
          <div className="lg:col-span-4 flex flex-col rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm text-primary">image</span>
                <span>Capa do Jogo</span>
              </span>
            </div>

            <div className="flex items-start gap-3 lg:flex-1 lg:flex-col lg:items-stretch">
              <div className="relative w-24 h-32 lg:w-40 lg:h-52 lg:mx-auto rounded-lg lg:rounded-xl overflow-hidden bg-surface-container-lowest border border-outline-variant shadow-sm shrink-0 transition-transform lg:hover:scale-[1.01] group">
                {coverPreview ? (
                  <img src={coverPreview} alt="Capa do jogo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-surface-container text-outline">
                    <span className="material-symbols-outlined text-[32px]">image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="material-symbols-outlined text-primary text-xl">photo_camera</span>
                </div>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Selecionar imagem da capa"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const dataUrl = e.target?.result as string;
                        setCoverPreview(dataUrl);
                        form.setValue("coverImage", dataUrl, { shouldDirty: true });
                        markCoverFileForDeletion();
                      };
                      reader.readAsDataURL(file);
                    }
                    // Permite selecionar o mesmo arquivo novamente
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="flex flex-col gap-2 flex-1 pt-1 lg:flex-none lg:w-full lg:mt-auto lg:pt-4 lg:border-t lg:border-outline-variant lg:flex-row lg:items-center">
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  className="w-full lg:flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface text-xs font-semibold shadow-sm transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base text-on-surface-variant">upload_file</span>
                  <span>Upload Local</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCoverPreview(null);
                    form.setValue("coverImage", "", { shouldDirty: true });
                    markCoverFileForDeletion();
                  }}
                  disabled={!coverPreview}
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
                >
                  <span className="material-symbols-outlined text-sm font-bold text-rose-500">close</span>
                  <span>Limpar</span>
                </button>
              </div>
            </div>

            {existingCoverFileId && isMarkedForDeletion(existingCoverFileId) && (
              <p className="mt-3 text-[11px] text-error font-label-md">
                O arquivo da capa anterior será removido do banco somente ao salvar.
              </p>
            )}
          </div>
  );
}

interface ScrapeResultCardProps {
  result: ScrapeResult;
  onUse: (result: ScrapeResult) => void;
  onRemove: () => void;
}

function ScrapeResultCard({ result, onUse, onRemove }: ScrapeResultCardProps) {
  return (
                  <div
                    className={`p-3 rounded-lg border ${STATUS_CARD_CLASSES[result.status]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-body-sm">
                          <span
                            className={`font-bold ${STATUS_NAME_CLASSES[result.status]}`}
                          >
                            {result.gameData?.name || result.input}
                          </span>
                          {result.gameData?.year && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-metric-stat bg-surface-container-highest text-outline">
                              {result.gameData.year}
                            </span>
                          )}
                          <span className="material-symbols-outlined text-xs text-outline">
                            {result.source === "bgg" ? "public" : "flag"}
                          </span>
                        </div>
                        {result.gameData && (
                          <div className="flex flex-wrap gap-1.5 mt-1 text-xs font-metric-stat text-on-surface-variant">
                            {result.gameData.weight !== undefined && (
                              <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-[10px]">
                                Peso: {result.gameData.weight.toFixed(2)}
                              </span>
                            )}
                            {result.gameData.bggRating !== undefined && (
                              <span className="text-primary">★ {result.gameData.bggRating.toFixed(1)}</span>
                            )}
                            {result.gameData.ludoRating !== undefined && (
                              <span className="text-tertiary">★ {result.gameData.ludoRating.toFixed(1)}</span>
                            )}
                            {result.gameData.minPlayers && result.gameData.maxPlayers && (
                              <span>{result.gameData.minPlayers}-{result.gameData.maxPlayers} jog.</span>
                            )}
                          </div>
                        )}
                        {result.error && (
                          <p className="text-error text-xs mt-1">{result.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {result.status === "success" && (
                          <button
                            type="button"
                            onClick={() => onUse(result)}
                            className="px-2.5 py-1.5 bg-primary-container text-on-primary-container rounded-lg font-label-sm text-label-sm hover:bg-primary-container/90 transition-colors active:scale-[0.98]"
                          >
                            Usar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onRemove}
                          className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-error transition-colors"
                          title="Remover"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    </div>
                    {result.status === "processing" && (
                      <div className="mt-2 h-0.5 bg-primary/20 overflow-hidden">
                        <div className="h-full bg-primary animate-pulse" style={{ width: "100%" }} />
                      </div>
                    )}
                  </div>
  );
}

interface ScrapeSectionProps {
  form: GameFormReturn;
  ludopediaUrls: string;
  setLudopediaUrls: (value: string) => void;
  bggUrls: string;
  setBggUrls: (value: string) => void;
  scrapeStatus: ScrapeStatus;
  handleBulkScrape: () => void;
  scrapeResults: ScrapeResult[];
  handleUseResult: (result: ScrapeResult) => void;
  setScrapeResults: Dispatch<SetStateAction<ScrapeResult[]>>;
  setScrapeStatus: (status: ScrapeStatus) => void;
}

function ScrapeSection({
  form,
  ludopediaUrls,
  setLudopediaUrls,
  bggUrls,
  setBggUrls,
  scrapeStatus,
  handleBulkScrape,
  scrapeResults,
  handleUseResult,
  setScrapeResults,
  setScrapeStatus,
}: ScrapeSectionProps) {
  return (
          <div className="lg:col-span-8 flex flex-col gap-4 rounded-xl bg-surface-container-lowest border border-outline-variant/50 p-4 sm:p-5">
            {/* Título */}
            <div className="flex items-center gap-2 text-secondary font-label-lg text-label-lg">
              <span className="material-symbols-outlined text-lg">cloud_download</span>
              <span className="font-bold">Preenchimento Rápido / Web Scraping</span>
            </div>

            {/* Textarea Ludopedia */}
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">link</span>
                <span>Ludopedia</span>
              </label>
              <textarea
                value={ludopediaUrls}
                onChange={(e) => setLudopediaUrls(e.target.value)}
                placeholder="Cole URLs/IDs da Ludopedia"
                rows={1}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary resize-y font-metric-stat text-sm"
              />
            </div>

            {/* Textarea BGG */}
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">link</span>
                <span>BoardGameGeek (BGG)</span>
              </label>
              <textarea
                value={bggUrls}
                onChange={(e) => {
                  setBggUrls(e.target.value);
                  form.setValue("links.bgg", e.target.value, { shouldDirty: true });
                }}
                placeholder="Cole URLs/IDs do BGG"
                rows={1}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary resize-y font-metric-stat text-sm"
              />
            </div>

            {/* Botão */}
            <button
              type="button"
              onClick={handleBulkScrape}
              disabled={scrapeStatus === "loading" || (!bggUrls.trim() && !ludopediaUrls.trim())}
              className="mt-auto w-full px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright text-primary border border-outline-variant rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] whitespace-nowrap shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">{scrapeStatus === "loading" ? "progress_activity" : "sync"}</span>
              <span>{scrapeStatus === "loading" ? "Processando..." : "Puxar Dados Automaticamente"}</span>
            </button>

            {/* Status/Progresso */}
            {scrapeStatus === "loading" && (
              <div className="flex items-center gap-2 text-xs font-metric-stat text-secondary">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Buscando dados...</span>
              </div>
            )}

            {/* Resultados - Coluna 1 embaixo do outro */}
            {scrapeResults.length > 0 && (
              <div className="mt-3 pt-3 border-t border-outline-variant/40 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {scrapeResults.map((result) => (
                  <ScrapeResultCard
                    key={`${result.source}-${result.input}`}
                    result={result}
                    onUse={handleUseResult}
                    onRemove={() => setScrapeResults((prev) => prev.filter((item) => item !== result))}
                  />
                ))}
              </div>
            )}

            {/* Botão limpar tudo quando há resultados */}
            {scrapeResults.length > 0 && scrapeStatus !== "loading" && (
              <button
                type="button"
                onClick={() => {
                  setScrapeResults([]);
                  setScrapeStatus("idle");
                }}
                className="w-full px-3 py-1.5 text-xs text-outline hover:text-on-surface-variant font-label-md transition-colors"
              >
                Limpar resultados
              </button>
            )}
          </div>
  );
}

function BasicInfoSection({ form }: { form: GameFormReturn }) {
  return (
        <div className="pt-2 border-t border-outline-variant/40 space-y-3">
          <h3 className="font-label-lg text-label-lg text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">info</span>
            <span>Informações Básicas</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Nome do Jogo *</label>
              <input
                type="text"
                {...form.register("name")}
                required
                className={cn(
                  "w-full px-3 py-2 bg-surface-container-lowest rounded-lg text-body-md text-on-surface focus:outline-none font-medium",
                  form.formState.errors.name
                    ? "border-error focus:border-error"
                    : "border-outline-variant focus:border-primary"
                )}
              />
              {form.formState.errors.name && <p className="text-error text-xs mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Ano</label>
              <input
                type="number"
                {...form.register("year", { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md text-on-surface focus:outline-none focus:border-primary font-metric-stat"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Designer(s)</label>
              <input
                type="text"
                {...form.register("designer")}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Editora / Distribuidora</label>
              <input
                type="text"
                {...form.register("publisher")}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Artista</label>
            <input
              type="text"
              {...form.register("artist")}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>
  );
}

function MetricsSection({ form }: { form: GameFormReturn }) {
  return (
        <div className="pt-2 border-t border-outline-variant/40 space-y-3">
          <h3 className="font-label-lg text-label-lg text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">analytics</span>
            <span>Métricas & Avaliações</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-w-0">
            <div className="min-w-0">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Nota BGG</label>
              <div className="relative">
                {(() => {
                  const { ref, onChange, ...rest } = form.register("bggRating", { valueAsNumber: true });
                  return (
                    <NumericInput
                      mode="decimal"
                      ref={ref}
                      onChange={onChange}
                      {...rest}
                      placeholder="8.1"
                      className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-metric-stat text-body-sm focus:outline-none focus:border-primary pr-10"
                    />
                  );
                })()}
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
            </div>
            <div className="min-w-0">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Nota Ludopedia</label>
              <div className="relative">
                {(() => {
                  const { ref, onChange, ...rest } = form.register("ludoRating", { valueAsNumber: true });
                  return (
                    <NumericInput
                      mode="decimal"
                      ref={ref}
                      onChange={onChange}
                      {...rest}
                      placeholder="8.4"
                      className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-metric-stat text-body-sm focus:outline-none focus:border-primary pr-10"
                    />
                  );
                })()}
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
            </div>
            <div className="min-w-0">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Ranking BGG</label>
              {(() => {
                const { ref, onChange, ...rest } = form.register("bggRank", { valueAsNumber: true });
                return (
                  <NumericInput
                    mode="integer"
                    ref={ref}
                    onChange={onChange}
                    {...rest}
                    placeholder="#27"
                    className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-metric-stat text-body-sm focus:outline-none focus:border-primary"
                  />
                );
              })()}
            </div>
            <div className="min-w-0">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Ranking Ludopedia</label>
              {(() => {
                const { ref, onChange, ...rest } = form.register("ludoRank", { valueAsNumber: true });
                return (
                  <NumericInput
                    mode="integer"
                    ref={ref}
                    onChange={onChange}
                    {...rest}
                    placeholder="#27"
                    className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-metric-stat text-body-sm focus:outline-none focus:border-primary"
                  />
                );
              })()}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Interação</label>
              <div className="relative">
                {(() => {
                  const { ref, onChange, ...rest } = form.register("interaction", { valueAsNumber: true });
                  return (
                    <NumericInput
                      mode="decimal"
                      ref={ref}
                      onChange={onChange}
                      {...rest}
                      placeholder="3.1"
                      className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-metric-stat text-body-sm focus:outline-none focus:border-primary pr-10"
                    />
                  );
                })()}
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </div>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Sorte</label>
              <div className="relative">
                {(() => {
                  const { ref, onChange, ...rest } = form.register("luck", { valueAsNumber: true });
                  return (
                    <NumericInput
                      mode="decimal"
                      ref={ref}
                      onChange={onChange}
                      {...rest}
                      placeholder="3.6"
                      className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-metric-stat text-body-sm focus:outline-none focus:border-primary pr-10"
                    />
                  );
                })()}
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>casino</span>
              </div>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Downtime</label>
              <div className="relative">
                {(() => {
                  const { ref, onChange, ...rest } = form.register("downtime", { valueAsNumber: true });
                  return (
                    <NumericInput
                      mode="decimal"
                      ref={ref}
                      onChange={onChange}
                      {...rest}
                      placeholder="1.1"
                      className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-metric-stat text-body-sm focus:outline-none focus:border-primary pr-10"
                    />
                  );
                })()}
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_empty</span>
              </div>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Rejogabilidade</label>
              <div className="relative">
                {(() => {
                  const { ref, onChange, ...rest } = form.register("replayability", { valueAsNumber: true });
                  return (
                    <NumericInput
                      mode="decimal"
                      ref={ref}
                      onChange={onChange}
                      {...rest}
                      placeholder="4.3"
                      className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-metric-stat text-body-sm focus:outline-none focus:border-primary pr-10"
                    />
                  );
                })()}
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>repeat</span>
              </div>
            </div>
          </div>
        </div>
  );
}

interface TableDetailsSectionProps {
  form: GameFormReturn;
  complexity: number;
  complexityLabel: ComplexityLabel;
  handleComplexityChange: (value: number) => void;
}

function TableDetailsSection({
  form,
  complexity,
  complexityLabel,
  handleComplexityChange,
}: TableDetailsSectionProps) {
  return (
        <div className="pt-2 border-t border-outline-variant/40 space-y-3">
          <h3 className="font-label-lg text-label-lg text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">table_restaurant</span>
            <span>Detalhes de Mesa & Sessão</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Jogadores *</label>
              {(() => {
                const { ref, onChange, ...rest } = form.register("minPlayers", { valueAsNumber: true });
                return (
                  <NumericInput
                    mode="integer"
                    ref={ref}
                    onChange={onChange}
                    {...rest}
                    placeholder="1"
                    className={cn(
                      "w-full px-2.5 py-1.5 bg-surface-container-lowest rounded-lg text-body-sm font-metric-stat text-on-surface focus:outline-none",
                      form.formState.errors.minPlayers
                        ? "border-error focus:border-error"
                        : "border-outline-variant focus:border-primary"
                    )}
                  />
                );
              })()}
              {form.formState.errors.minPlayers ? (
                <p className="text-error text-xs mt-1">{String(form.formState.errors.minPlayers.message)}</p>
              ) : null}
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Máx. Jogadores *</label>
              {(() => {
                const { ref, onChange, ...rest } = form.register("maxPlayers", { valueAsNumber: true });
                return (
                  <NumericInput
                    mode="integer"
                    ref={ref}
                    onChange={onChange}
                    {...rest}
                    placeholder="5"
                    className={cn(
                      "w-full px-2.5 py-1.5 bg-surface-container-lowest rounded-lg text-body-sm font-metric-stat text-on-surface focus:outline-none",
                      form.formState.errors.maxPlayers
                        ? "border-error focus:border-error"
                        : "border-outline-variant focus:border-primary"
                    )}
                  />
                );
              })()}
              {form.formState.errors.maxPlayers ? (
                <p className="text-error text-xs mt-1">{String(form.formState.errors.maxPlayers.message)}</p>
              ) : null}
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Melhor com *</label>
              {(() => {
                const { ref, onChange, ...rest } = form.register("bestPlayers", { valueAsNumber: true });
                return (
                  <NumericInput
                    mode="integer"
                    ref={ref}
                    onChange={onChange}
                    {...rest}
                    placeholder="3"
                    className={cn(
                      "w-full px-2.5 py-1.5 bg-surface-container-lowest rounded-lg text-body-sm font-metric-stat text-on-surface focus:outline-none",
                      form.formState.errors.bestPlayers
                        ? "border-error focus:border-error"
                        : "border-outline-variant focus:border-primary"
                    )}
                  />
                );
              })()}
              {form.formState.errors.bestPlayers ? (
                <p className="text-error text-xs mt-1">{String(form.formState.errors.bestPlayers.message)}</p>
              ) : null}
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Duração (Min) *</label>
              {(() => {
                const { ref, onChange, ...rest } = form.register("minPlaytime", { valueAsNumber: true });
                return (
                  <NumericInput
                    mode="integer"
                    ref={ref}
                    onChange={onChange}
                    {...rest}
                    placeholder="40"
                    className={cn(
                      "w-full px-2.5 py-1.5 bg-surface-container-lowest rounded-lg text-body-sm font-metric-stat text-on-surface focus:outline-none",
                      form.formState.errors.minPlaytime
                        ? "border-error focus:border-error"
                        : "border-outline-variant focus:border-primary"
                    )}
                  />
                );
              })()}
              {form.formState.errors.minPlaytime ? (
                <p className="text-error text-xs mt-1">{String(form.formState.errors.minPlaytime.message)}</p>
              ) : null}
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Idade Mín. *</label>
              {(() => {
                const { ref, onChange, ...rest } = form.register("minAge", { valueAsNumber: true });
                return (
                  <NumericInput
                    mode="integer"
                    ref={ref}
                    onChange={onChange}
                    {...rest}
                    placeholder="10+"
                    className={cn(
                      "w-full px-2.5 py-1.5 bg-surface-container-lowest rounded-lg text-body-sm font-metric-stat text-on-surface focus:outline-none",
                      form.formState.errors.minAge
                        ? "border-error focus:border-error"
                        : "border-outline-variant focus:border-primary"
                    )}
                  />
                );
              })()}
              {form.formState.errors.minAge ? (
                <p className="text-error text-xs mt-1">{String(form.formState.errors.minAge.message)}</p>
              ) : null}
            </div>
          </div>
          <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-label-md text-on-surface-variant">Peso / Complexidade (1.0 - 5.0)</span>
              <span className="font-metric-stat text-xs font-bold text-secondary" id="complexity-badge">
                {complexity.toFixed(2)} ({complexityLabel.label})
              </span>
            </div>
            <input
              type="range"
              className="w-full accent-primary h-1.5 bg-surface-container-highest rounded-lg cursor-pointer"
              min="1.0" max="5.0" step="0.05"
              value={complexity}
              onChange={(e) => handleComplexityChange(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-[10px] text-outline font-metric-stat mt-1">
              <span>1.0 Party/Leve</span>
              <span>2.5 Médio</span>
              <span>4.0+ Heavy Euro</span>
            </div>
          </div>
        </div>
  );
}

function DescriptionSection({ form }: { form: GameFormReturn }) {
  return (
        <div className="pt-2 border-t border-outline-variant/40 space-y-2">
          <h3 className="font-label-lg text-label-lg text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">description</span>
            <span>Resumo do Jogo & Regras</span>
          </h3>
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Resumo / Visão Geral das Regras</label>
            <textarea
              {...form.register("description")}
              rows={4}
              placeholder="Descreva o objetivo do jogo, visão geral da rodada ou notas rápidas para ensinar à mesa..."
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary resize-y leading-relaxed"
            />
          </div>
        </div>
  );
}

interface FilesSectionProps {
  existingFiles: ExistingGameFile[];
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  isMarkedForDeletion: (fileId: string) => boolean;
  toggleFileDeletion: (fileId: string) => void;
  handleFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function FilesSection({
  existingFiles,
  files,
  setFiles,
  isMarkedForDeletion,
  toggleFileDeletion,
  handleFilesChange,
}: FilesSectionProps) {
  return (
        <div className="pt-2 border-t border-outline-variant/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-label-lg text-label-lg text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">folder_zip</span>
              <span>Arquivos do Jogo</span>
            </h3>
            <span className="text-[11px] font-metric-stat text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant">{existingFiles.length + files.length} Arquivos</span>
          </div>
          <div className="border-2 border-dashed border-outline-variant/60 hover:border-primary/60 rounded-xl p-4 bg-surface-container-lowest/60 text-center transition-colors cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input[type="file"]') as HTMLInputElement; if (input) input.click(); }}>
            <input type="file" multiple onChange={handleFilesChange} className="hidden" />
            <span className="material-symbols-outlined text-2xl text-outline group-hover:text-primary transition-colors">cloud_upload</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Clique ou arraste arquivos (PDF, imagens, etc.)</p>
            <p className="text-xs text-outline">Máx. 100MB por arquivo</p>
          </div>
          {existingFiles.some((f) => isMarkedForDeletion(f.id)) && (
            <p className="text-[11px] text-error font-label-md">
              Arquivos marcados serão removidos do banco somente ao salvar.
            </p>
          )}
          {existingFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wide">Arquivos salvos</p>
              {existingFiles.map((file) => {
                const marked = isMarkedForDeletion(file.id);
                return (
                  <div
                    key={file.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border transition-colors",
                      marked
                        ? "bg-error-container/10 border-error/40"
                        : "bg-surface-container-high/50 border-outline-variant"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-outline font-bold text-xs flex-shrink-0">
                        {(file.extension || "FILE").toUpperCase().slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={cn("text-sm font-semibold text-on-surface truncate", marked && "line-through text-on-surface-variant")}>
                            {file.displayName || file.originalName}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-metric-stat bg-surface-container-highest text-on-surface-variant border border-outline-variant">
                            Salvo
                          </span>
                          {marked && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-metric-stat bg-error-container/30 text-error border border-error/40">
                              Será removido ao salvar
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-outline">
                          {formatFileSize(file.size)} · {fileTypeLabels[file.type] || "Documento"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <a
                        href={resolveAssetUrl(file.path) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface text-xs transition-colors"
                      >
                        Abrir
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleFileDeletion(file.id)}
                        className={cn(
                          "px-2 py-1 rounded text-xs transition-colors border",
                          marked
                            ? "bg-error-container/20 text-error border-error/40 hover:bg-error-container/30"
                            : "bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface-variant hover:text-error"
                        )}
                      >
                        {marked ? "Desfazer" : "Remover"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wide">Novos arquivos</p>
              {files.map((file, i) => (
                <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-high/50 border border-outline-variant">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-outline font-bold text-xs flex-shrink-0">
                      {file.name.split(".").pop()?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-on-surface truncate">{file.name}</h4>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-metric-stat bg-primary-container/20 text-primary border border-primary/30">
                          Novo
                        </span>
                      </div>
                      <p className="text-xs text-outline">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface text-xs transition-colors flex-shrink-0">Remover</button>
                </div>
              ))}
            </div>
          )}
        </div>
  );
}

interface AudioSectionProps {
  existingAudioFiles: ExistingGameFile[];
  audioFiles: File[];
  setAudioFiles: Dispatch<SetStateAction<File[]>>;
  pendingAudioUrls: string[];
  isMarkedForDeletion: (fileId: string) => boolean;
  toggleFileDeletion: (fileId: string) => void;
  handleFilesChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function AudioSection({
  existingAudioFiles,
  audioFiles,
  setAudioFiles,
  pendingAudioUrls,
  isMarkedForDeletion,
  toggleFileDeletion,
  handleFilesChange,
}: AudioSectionProps) {
  return (
        <div className="pt-2 border-t border-outline-variant/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-label-lg text-label-lg text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">audiotrack</span>
              <span>Audios</span>
            </h3>
            <span className="text-[11px] font-metric-stat text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant">{existingAudioFiles.length + audioFiles.length} Arquivos</span>
          </div>
          <div className="border-2 border-dashed border-primary/60 rounded-xl p-4 bg-surface-container-lowest/60 text-center transition-colors cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input[type="file"]') as HTMLInputElement; if (input) input.click(); }}>
            <input type="file" multiple accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac" className="hidden" onChange={handleFilesChange} />
            <span className="material-symbols-outlined text-2xl text-outline group-hover:text-primary transition-colors">cloud_upload</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Clique ou arraste arquivos de áudio</p>
            <p className="text-xs text-outline">Máx. 100MB por arquivo</p>
          </div>
          {existingAudioFiles.some((f) => isMarkedForDeletion(f.id)) && (
            <p className="text-[11px] text-error font-label-md">
              Áudios marcados serão removidos do banco somente ao salvar.
            </p>
          )}
          {existingAudioFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wide">Áudios salvos</p>
              {existingAudioFiles.map((file) => {
                const marked = isMarkedForDeletion(file.id);
                return (
                  <div
                    key={file.id}
                    className={cn(
                      "flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border transition-colors",
                      marked
                        ? "bg-error-container/10 border-error/40"
                        : "bg-surface-container-high/50 border-outline-variant"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-outline font-bold text-xs flex-shrink-0">
                        {(file.extension || "AUDIO").toUpperCase().slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={cn("text-sm font-semibold text-on-surface truncate", marked && "line-through text-on-surface-variant")}>
                            {file.displayName || file.originalName}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-metric-stat bg-surface-container-highest text-on-surface-variant border border-outline-variant">
                            Salvo
                          </span>
                          {marked && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-metric-stat bg-error-container/30 text-error border border-error/40">
                              Será removido ao salvar
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-outline">{formatFileSize(file.size)} · Áudio</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      <audio
                        controls
                        preload="none"
                        src={resolveAssetUrl(file.path) ?? undefined}
                        className="h-9 w-full sm:w-52"
                      />
                      <button
                        type="button"
                        onClick={() => toggleFileDeletion(file.id)}
                        className={cn(
                          "px-2 py-1 rounded text-xs transition-colors border",
                          marked
                            ? "bg-error-container/20 text-error border-error/40 hover:bg-error-container/30"
                            : "bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface-variant hover:text-error"
                        )}
                      >
                        {marked ? "Desfazer" : "Remover"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {audioFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wide">Novos áudios</p>
              {audioFiles.map((file, i) => (
                <div key={`${file.name}-${file.size}-${file.lastModified}`} className="space-y-2 p-3 rounded-xl bg-surface-container-high/50 border border-outline-variant">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-outline font-bold text-xs flex-shrink-0">
                        {file.name.split(".").pop()?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-on-surface truncate">{file.name}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-metric-stat bg-primary-container/20 text-primary border border-primary/30">
                            Novo
                          </span>
                        </div>
                        <p className="text-xs text-outline">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAudioFiles((prev) => prev.filter((_, idx) => idx !== i))} className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface text-xs transition-colors flex-shrink-0">Remover</button>
                  </div>
                  <audio
                    controls
                    preload="none"
                    className="w-full h-9"
                    src={pendingAudioUrls[i]}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
  );
}

interface FormFooterProps {
  isNew: boolean;
  isDeleting: boolean;
  isSubmitting: boolean;
  isSaveDisabled: boolean;
  hasChanges: boolean;
  onClose: () => void;
  onDeleteClick: () => void;
}

function FormFooter({
  isNew,
  isDeleting,
  isSubmitting,
  isSaveDisabled,
  hasChanges,
  onClose,
  onDeleteClick,
}: FormFooterProps) {
  return (
        <div className="pt-2 border-t border-outline-variant/40 flex items-center gap-2 sm:justify-end">
          {!isNew && (
            <button
              type="button"
              onClick={() => onDeleteClick()}
              disabled={isDeleting || isSubmitting}
              aria-label="Excluir Jogo"
              title="Excluir Jogo"
              className="shrink-0 sm:mr-auto h-9 w-9 sm:w-auto px-0 sm:px-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
            >
              <span className="material-symbols-outlined text-lg leading-none text-rose-500">delete</span>
              <span className="hidden sm:inline">Excluir Jogo</span>
            </button>
          )}
          <div className="flex flex-1 items-center gap-2 sm:flex-none">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none sm:w-52 h-9 px-1 sm:px-5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface text-xs sm:text-label-lg font-bold flex items-center justify-center gap-0.5 sm:gap-1.5 transition-colors active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-lg leading-none">close</span>
              <span>Cancelar</span>
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled}
              title={!isNew && !hasChanges ? "Nenhuma alteração para salvar" : undefined}
              className="flex-1 sm:flex-none sm:w-52 h-9 px-1 sm:px-5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-xs sm:text-label-lg font-bold flex items-center justify-center gap-0.5 sm:gap-1.5 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg leading-none">{isSubmitting ? "progress_activity" : "save"}</span>
              <span>{getSubmitLabel(isSubmitting, isNew)}</span>
            </button>
          </div>
        </div>
  );
}

export function GameForm({ gameId, onClose, onSaved, onDeleted }: GameFormProps) {
  const isNew = gameId === "new";
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [complexity, setComplexity] = useState(2.45);
  const [complexityLabel, setComplexityLabel] = useState(getComplexityLabel(2.45));
  const [files, setFiles] = useState<File[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<ExistingGameFile[]>([]);
  const [existingAudioFiles, setExistingAudioFiles] = useState<ExistingGameFile[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [existingCoverFileId, setExistingCoverFileId] = useState<string | null>(null);
  const [bggUrls, setBggUrls] = useState("");
  const [ludopediaUrls, setLudopediaUrls] = useState("");
  const [initialScrapeUrls, setInitialScrapeUrls] = useState({ bgg: "", ludopedia: "" });
  const [scrapeResults, setScrapeResults] = useState<ScrapeResult[]>([]);
  const [scrapeStatus, setScrapeStatus] = useState<"idle" | "loading" | "done">("idle");
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const pendingAudioUrls = useMemo(
    () => audioFiles.map((file) => URL.createObjectURL(file)),
    [audioFiles]
  );

  useEffect(() => {
    return () => {
      pendingAudioUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [pendingAudioUrls]);

  const form = useForm<z.infer<typeof GameCreateSchema>>({
    resolver: zodResolver(GameCreateSchema),
    defaultValues: {
      name: "",
      originalName: "",
      description: "",
      year: new Date().getFullYear(),
      minPlayers: 1,
      maxPlayers: 4,
      minPlaytime: 30,
      publisher: "",
      designer: "",
      artist: "",
      bggRating: 0,
      ludoRating: 0,
      bggRank: undefined,
      ludoRank: undefined,
      weight: 2.5,
      interaction: undefined,
      luck: undefined,
      downtime: undefined,
      replayability: undefined,
      bestPlayers: 2,
      minAge: 10,
      coverImage: "",
      mechanics: [],
      categories: [],
      preparationText: "",
      links: { bgg: "", ludopedia: "", manual: "" },
    },
  });

  const [isLoadingGame, setIsLoadingGame] = useState(false);

  const resetNewGame = useCallback(() => {
    form.reset({
      name: "",
      originalName: "",
      description: "",
      year: new Date().getFullYear(),
      minPlayers: 1,
      maxPlayers: 4,
      minPlaytime: 30,
      publisher: "",
      designer: "",
      artist: "",
      bggRating: 0,
      ludoRating: 0,
      bggRank: undefined,
      ludoRank: undefined,
      weight: 2.5,
      interaction: undefined,
      luck: undefined,
      downtime: undefined,
      replayability: undefined,
      bestPlayers: 2,
      minAge: 10,
      coverImage: "",
      mechanics: [],
      categories: [],
      links: { bgg: "", ludopedia: "", manual: "" },
    });
    setCoverPreview(null);
    setComplexity(2.45);
    setComplexityLabel(getComplexityLabel(2.45));
    setFiles([]);
    setAudioFiles([]);
    setExistingFiles([]);
    setExistingAudioFiles([]);
    setPendingDeleteIds([]);
    setExistingCoverFileId(null);
    setBggUrls("");
    setLudopediaUrls("");
    setInitialScrapeUrls({ bgg: "", ludopedia: "" });
    setScrapeResults([]);
    setScrapeStatus("idle");
  }, [form]);

  const applyGameData = useCallback((data: RawGameData) => {
    const gameFiles = mapGameFiles(data.files);
    const coverFile = gameFiles.find((file) => file.type === "COVER");

    form.reset(buildFormValues(data));

    setBggUrls(data.links?.bgg ?? "");
    setLudopediaUrls(data.links?.ludopedia ?? "");
    setInitialScrapeUrls({
      bgg: data.links?.bgg ?? "",
      ludopedia: data.links?.ludopedia ?? "",
    });

    if (data.weight !== undefined && data.weight !== null) {
      setComplexity(data.weight);
      setComplexityLabel(getComplexityLabel(data.weight));
    }

    setExistingFiles(gameFiles.filter((file) => file.type !== "COVER" && !isAudioFile(file)));
    setExistingAudioFiles(gameFiles.filter((file) => file.type !== "COVER" && isAudioFile(file)));
    setPendingDeleteIds([]);
    setExistingCoverFileId(coverFile?.id ?? null);
    setCoverPreview(resolveCoverPreview(data, coverFile));
  }, [form]);

  const handleLoadError = useCallback((error: unknown) => {
    console.error("Erro ao carregar jogo:", error);
    toast({
      title: "Erro",
      description: "Não foi possível carregar os dados do jogo para edição",
      variant: "destructive",
    });
  }, [toast]);

  useEffect(() => {
    if (gameId === "new") {
      resetNewGame();
      return;
    }
    if (!gameId) return;

    let isMounted = true;
    setIsLoadingGame(true);
    setExistingFiles([]);
    setExistingAudioFiles([]);
    setPendingDeleteIds([]);
    setExistingCoverFileId(null);

    fetchGameData(gameId)
      .then((data) => {
        if (isMounted) applyGameData(data);
      })
      .catch((error) => {
        if (isMounted) handleLoadError(error);
      })
      .finally(() => {
        if (isMounted) setIsLoadingGame(false);
      });

    return () => {
      isMounted = false;
    };
  }, [gameId, isNew, form, toast, resetNewGame, applyGameData, handleLoadError]);

  const handleComplexityChange = (val: number) => {
    setComplexity(val);
    setComplexityLabel(getComplexityLabel(val));
    form.setValue("weight", val, { shouldDirty: true });
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const audioPattern = /audio\//;
    const audioExtensions = /\.(mp3|wav|ogg|m4a|aac)$/i;
    
    const newAudioFiles = newFiles.filter((f) => audioPattern.test(f.type) || audioExtensions.test(f.name));
    const newGameFiles = newFiles.filter((f) => !audioPattern.test(f.type) && !audioExtensions.test(f.name));
    
    setFiles((prev) => [...prev, ...newGameFiles]);
    setAudioFiles((prev) => [...prev, ...newAudioFiles]);
  };

  const isMarkedForDeletion = (fileId: string) => pendingDeleteIds.includes(fileId);

  const toggleFileDeletion = (fileId: string) => {
    setPendingDeleteIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const markCoverFileForDeletion = () => {
    if (!existingCoverFileId) return;
    setPendingDeleteIds((prev) =>
      prev.includes(existingCoverFileId) ? prev : [...prev, existingCoverFileId]
    );
  };

  const hasChanges =
    form.formState.isDirty ||
    files.length > 0 ||
    audioFiles.length > 0 ||
    pendingDeleteIds.length > 0 ||
    bggUrls !== initialScrapeUrls.bgg ||
    ludopediaUrls !== initialScrapeUrls.ludopedia;

  const isSaveDisabled = form.formState.isSubmitting || isSubmitting || (!isNew && !hasChanges);

  const fillFormWithGameData = (data: ScrapedGameData) => {
    applyScrapedValues(form, data);

    if (data.weight !== undefined) {
      handleComplexityChange(data.weight);
    }
    if (data.coverImage) {
      form.setValue("coverImage", data.coverImage, { shouldDirty: true });
      setCoverPreview(data.coverImage);
    }
    if (data.mechanics?.length) {
      form.setValue("mechanics", data.mechanics, { shouldDirty: true });
    }
    if (data.categories?.length) {
      form.setValue("categories", data.categories, { shouldDirty: true });
    }

    applyScrapedLinks(form, data.links);
  };

  const scrapeSingleUrl = async (url: string): Promise<ScrapedGameData> => {
    const isLudopedia = url.includes("ludopedia.com.br");
    const source = isLudopedia ? "ludopedia" : "bgg";
    const body = isLudopedia
      ? { ludopediaUrl: url }
      : { bggUrl: url };

    const res = await fetch("/api/games/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!data.data) {
      throw new Error(data.error || "Erro ao importar dados");
    }

    if (data.sources?.[source] === "failed") {
      throw new Error(
        data.errors?.[source] || "Não foi possível obter dados da fonte selecionada."
      );
    }

    if (!data.data.name) {
      throw new Error(
        data.errors?.[source] || "A fonte não retornou o nome do jogo."
      );
    }

    const imported = data.data;

    return {
      name: imported.name ?? "",
      originalName: imported.originalName ?? "",
      description: imported.description ?? "",
      year: imported.year,
      minPlayers: imported.minPlayers,
      maxPlayers: imported.maxPlayers,
      minPlaytime: imported.minPlaytime,
      weight: imported.weight,
      interaction: imported.interaction,
      luck: imported.luck,
      downtime: imported.downtime,
      replayability: imported.replayability,
      bggRating: imported.bggRating,
      ludoRating: imported.ludoRating,
      bggRank: imported.bggRank,
      ludoRank: imported.ludoRank,
      bestPlayers: imported.bestPlayers,
      minAge: imported.minAge,
      coverImage: imported.coverImage ?? "",
      designer: imported.designer ?? "",
      artist: imported.artist ?? "",
      publisher: imported.publisher ?? "",
      mechanics: imported.mechanics ?? [],
      categories: imported.categories ?? [],
      links: {
        bgg: imported.links?.bgg ?? "",
        ludopedia: imported.links?.ludopedia ?? "",
        manual: "",
      },
    };
  };

  const updateScrapeResult = (
    input: string,
    source: ScrapeResult["source"],
    patch: Partial<ScrapeResult>
  ) => {
    setScrapeResults((prev) =>
      prev.map((item) =>
        item.input === input && item.source === source ? { ...item, ...patch } : item
      )
    );
  };

  const processScrapeInput = async (input: string, source: ScrapeResult["source"]) => {
    updateScrapeResult(input, source, { status: "processing" });

    try {
      const gameData = await scrapeSingleUrl(input);
      updateScrapeResult(input, source, { status: "success", gameData });
    } catch (error) {
      updateScrapeResult(input, source, { status: "error", error: getErrorMessage(error) });
    }
  };

  const processBatch = async (urls: string[], source: ScrapeResult["source"], concurrency = 2) => {
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      await Promise.all(batch.map((input) => processScrapeInput(input, source)));
    }
  };

  const handleBulkScrape = async () => {
    const ludopediaInputs = ludopediaUrls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const bggInputs = bggUrls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ludopediaInputs.length === 0 && bggInputs.length === 0) {
      toast({ title: "Aviso", description: "Insira pelo menos uma URL ou ID", variant: "default" });
      return;
    }

    const initialResults: ScrapeResult[] = [
      ...ludopediaInputs.map((input) => ({
        source: "ludopedia" as const,
        input,
        status: "pending" as const,
      })),
      ...bggInputs.map((input) => ({
        source: "bgg" as const,
        input,
        status: "pending" as const,
      })),
    ];

    setScrapeResults(initialResults);
    setScrapeStatus("loading");

    if (ludopediaInputs.length > 0) {
      await processBatch(ludopediaInputs, "ludopedia");
    }
    if (bggInputs.length > 0) {
      await processBatch(bggInputs, "bgg");
    }

    setScrapeStatus("done");
  };

  const handleUseResult = (result: ScrapeResult) => {
    if (!result.gameData) return;
    fillFormWithGameData(result.gameData);
    setScrapeResults([]);
    setScrapeStatus("idle");
  };

  const uploadPendingFiles = async (savedGameId: string): Promise<ExistingGameFile[]> => {
    const pending = [...files, ...audioFiles];
    if (pending.length === 0) return [];

    const formData = new FormData();
    formData.append("gameId", savedGameId);
    formData.append("type", "OTHER");
    for (const file of pending) {
      formData.append("files", file);
    }

    return uploadFiles(formData, "OTHER");
  };

  const persistFiles = async (savedGameId: string) => {
    if (files.length === 0 && audioFiles.length === 0) return;

    const uploaded = await uploadPendingFiles(savedGameId);
    const uploadedDocs = uploaded.filter((file) => file.type !== "COVER" && !isAudioFile(file));
    const uploadedAudio = uploaded.filter((file) => file.type !== "COVER" && isAudioFile(file));

    setExistingFiles((prev) => [...uploadedDocs, ...prev]);
    setExistingAudioFiles((prev) => [...uploadedAudio, ...prev]);
    setFiles([]);
    setAudioFiles([]);
  };

  const applyPendingDeletions = async () => {
    if (pendingDeleteIds.length === 0) return;

    try {
      await deleteGameFiles(pendingDeleteIds);
    } catch {
      throw new Error(
        "As alterações do jogo foram salvas, mas não foi possível remover os arquivos marcados. Tente salvar novamente."
      );
    }

    setExistingFiles((prev) => prev.filter((file) => !pendingDeleteIds.includes(file.id)));
    setExistingAudioFiles((prev) => prev.filter((file) => !pendingDeleteIds.includes(file.id)));
    setPendingDeleteIds([]);
    if (existingCoverFileId && pendingDeleteIds.includes(existingCoverFileId)) {
      setExistingCoverFileId(null);
    }
  };

  const handleSubmit = async (data: GameFormValues) => {
    if (!isNew && !hasChanges) return;
    setIsSubmitting(true);
    try {
      const allValues = form.getValues();
      const savedGameId = await saveGameRequest(data, allValues.links, isNew, gameId);

      if (savedGameId && savedGameId !== "new") {
        await persistFiles(savedGameId);
        await applyPendingDeletions();
      }

      toast({
        title: "Sucesso",
        description: isNew ? "Jogo criado com sucesso" : "Jogo atualizado com sucesso",
        variant: "success",
      });
      onSaved();
    } catch (error) {
      console.error("Submit error:", error);
      toast({ title: "Erro", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGame = async () => {
    if (isNew || !gameId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/games/${gameId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao excluir jogo");
      }
      setShowDeleteConfirm(false);
      toast({ title: "Sucesso", description: "Jogo excluído com sucesso", variant: "success" });
      (onDeleted ?? onClose)();
    } catch (error) {
      console.error("Delete error:", error);
      const message = error instanceof Error ? error.message : "Erro ao excluir jogo";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl bg-surface-container-low border border-outline-variant shadow-lg overflow-hidden h-full flex flex-col">
      <div className="p-space-md border-b border-outline-variant/60 bg-surface-container/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">{isNew ? "Novo Jogo: Criar Registro" : "Editando Jogo"}</h2>
        </div>
        <span className="px-2 py-0.5 rounded text-[11px] font-metric-stat bg-surface-container-highest text-on-surface-variant border border-outline-variant">
          {isNew ? "NOVO" : `ID #${gameId.slice(0, 8)}`}
        </span>
        <button onClick={onClose} className="ml-2 flex items-center justify-center rounded-md p-1 hover:bg-surface-container-high/20 transition-colors" aria-label="Fechar">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      {isLoadingGame ? (
        <div className="p-12 text-center">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          <p className="mt-2 text-on-surface-variant text-body-sm">Carregando dados do jogo...</p>
        </div>
      ) : (
      <form onSubmit={form.handleSubmit(handleSubmit, (errors) => console.log("Validation errors:", errors))} className="p-space-md md:p-space-lg space-y-space-md flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
          <CoverSection
            form={form}
            coverPreview={coverPreview}
            setCoverPreview={setCoverPreview}
            coverFileInputRef={coverFileInputRef}
            markCoverFileForDeletion={markCoverFileForDeletion}
            existingCoverFileId={existingCoverFileId}
            isMarkedForDeletion={isMarkedForDeletion}
          />

          <ScrapeSection
            form={form}
            ludopediaUrls={ludopediaUrls}
            setLudopediaUrls={setLudopediaUrls}
            bggUrls={bggUrls}
            setBggUrls={setBggUrls}
            scrapeStatus={scrapeStatus}
            handleBulkScrape={handleBulkScrape}
            scrapeResults={scrapeResults}
            handleUseResult={handleUseResult}
            setScrapeResults={setScrapeResults}
            setScrapeStatus={setScrapeStatus}
          />
        </div>

        <BasicInfoSection form={form} />

        <MetricsSection form={form} />

        <TableDetailsSection
          form={form}
          complexity={complexity}
          complexityLabel={complexityLabel}
          handleComplexityChange={handleComplexityChange}
        />

        <DescriptionSection form={form} />

        <FilesSection
          existingFiles={existingFiles}
          files={files}
          setFiles={setFiles}
          isMarkedForDeletion={isMarkedForDeletion}
          toggleFileDeletion={toggleFileDeletion}
          handleFilesChange={handleFilesChange}
        />

        <AudioSection
          existingAudioFiles={existingAudioFiles}
          audioFiles={audioFiles}
          setAudioFiles={setAudioFiles}
          pendingAudioUrls={pendingAudioUrls}
          isMarkedForDeletion={isMarkedForDeletion}
          toggleFileDeletion={toggleFileDeletion}
          handleFilesChange={handleFilesChange}
        />

        <FormFooter
          isNew={isNew}
          isDeleting={isDeleting}
          isSubmitting={isSubmitting}
          isSaveDisabled={isSaveDisabled}
          hasChanges={hasChanges}
          onClose={onClose}
          onDeleteClick={() => setShowDeleteConfirm(true)}
        />
      </form>
      )}

      {/* Confirmação de exclusão */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => !isDeleting && setShowDeleteConfirm(open)}>
        <DialogContent className="z-[60] max-w-sm w-[calc(100%-2rem)] gap-4 rounded-xl sm:rounded-xl border-outline-variant bg-surface-container-lowest p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-container text-error">
              <span className="material-symbols-outlined text-xl leading-none">delete</span>
            </span>
            <div className="min-w-0">
              <DialogTitle className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Excluir Jogo
              </DialogTitle>
              <DialogDescription className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Tem certeza que deseja excluir{" "}
                <strong className="font-semibold text-on-surface">
                  {form.watch("name") || "este jogo"}
                </strong>{" "}
                do acervo? Os arquivos e áudios vinculados também serão removidos. Esta ação não pode
                ser desfeita.
              </DialogDescription>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto h-10 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-label-lg text-label-lg transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteGame}
              disabled={isDeleting}
              className="w-full sm:w-auto h-10 px-4 rounded-lg bg-error hover:bg-error/90 text-on-error font-label-lg text-label-lg font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg leading-none">
                {isDeleting ? "progress_activity" : "delete"}
              </span>
              <span>{isDeleting ? "Excluindo..." : "Excluir Definitivamente"}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}