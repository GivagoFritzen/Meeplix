import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Maybe, Nullable } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRating(rating: Maybe<number>): string {
  if (rating === null || rating === undefined) return "-";
  return rating.toFixed(1).replace(".", ",");
}

export function formatWeight(weight: Maybe<number>): string {
  if (weight === null || weight === undefined) return "-";
  return weight.toFixed(2).replace(".", ",");
}

export function formatPlaytime(min: Maybe<number>): string {
  if (!min) return "-";
  return `${min} min`;
}

export function formatPlayers(min: Maybe<number>, max: Maybe<number>): string {
  if (!min && !max) return "-";
  if (min && max && min === max) return `${min} jogador${min > 1 ? "es" : ""}`;
  if (min && max) return `${min}–${max} jogadores`;
  if (min) return `≥${min} jogadores`;
  return `≤${max} jogadores`;
}

/** Apenas o intervalo de jogadores (ex: "2–8"), para uso em cards compactos. */
export function formatPlayersCompact(
  min: Maybe<number>,
  max: Maybe<number>
): string {
  if (!min && !max) return "-";
  if (min && max && min === max) return `${min}`;
  if (min && max) return `${min}–${max}`;
  if (min) return `≥${min}`;
  return `≤${max}`;
}

export function getComplexityLabel(weight: number): { label: string; class: string } {
  if (weight < 2.0) return { label: "Leve", class: "complexity-light" };
  if (weight < 2.8) return { label: "Médio Leve", class: "complexity-medium" };
  if (weight < 3.5) return { label: "Médio Pesado", class: "complexity-medium" };
  return { label: "Pesado", class: "complexity-heavy" };
}

export function getLabelFromValue(value: Nullable<number>): string {
  if (value === null || value === undefined) return "Não avaliado";
  if (value <= 1.5) return "Muito baixo";
  if (value <= 2.5) return "Baixo";
  if (value <= 3.5) return "Médio";
  if (value <= 4.5) return "Alto";
  return "Muito alto";
}

export function resolveAssetUrl(src: Maybe<string>): string | null {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return src;
  return `/api/files/${src}`;
}

const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a", "aac"];

export function isAudioFile(file: {
  mimeType?: Nullable<string>;
  extension?: Nullable<string>;
  originalName?: Nullable<string>;
  displayName?: Nullable<string>;
}): boolean {
  if (file.mimeType?.startsWith("audio/")) return true;
  const ext = (
    file.extension ||
    file.originalName?.split(".").pop() ||
    file.displayName?.split(".").pop() ||
    ""
  )
    .toLowerCase()
    .replace(".", "");
  return AUDIO_EXTENSIONS.includes(ext);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatFileSize(bytes: number | bigint): string {
  const size = Number(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}