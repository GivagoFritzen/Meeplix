"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { DisplayPreferences } from "@/lib/display-preferences";
import type { Nullable } from "@/lib/types";
import {
  formatRating,
  formatPlaytime,
  formatPlayers,
  getComplexityLabel,
  slugify,
} from "@/lib/utils";

interface GameCardProps {
  id: string;
  name: string;
  year?: Nullable<number>;
  designer?: Nullable<string>;
  publisher?: Nullable<string>;
  coverImage?: Nullable<string>;
  minPlayers?: Nullable<number>;
  maxPlayers?: Nullable<number>;
  minPlaytime?: Nullable<number>;
  weight?: Nullable<number>;
  bggRating?: Nullable<number>;
  ludoRating?: Nullable<number>;
  mechanics?: string[];
  isActive?: Nullable<boolean>;
  preferences: DisplayPreferences;
}

export function GameCard({
  id,
  name,
  year,
  designer,
  publisher,
  coverImage,
  minPlayers,
  maxPlayers,
  minPlaytime,
  weight,
  bggRating,
  ludoRating,
  mechanics = [],
  isActive,
  preferences,
}: GameCardProps) {
  const complexity = weight ? getComplexityLabel(weight) : null;
  const slug = slugify(name) || id;

  const showDesigners = !preferences.hideDesigners;
  const showPublishers = !preferences.hidePublishers;
  const showTags = !preferences.hideTags;

  const visibleDesigner = showDesigners ? designer : null;
  const visiblePublisher = showPublishers ? publisher : null;

  return (
    <Link
      href={`/jogos/${slug}`}
      className={`card-elevation-lg group overflow-hidden flex flex-col bg-white shadow-[0_2px_8px_rgba(33,26,60,0.06)] hover:border-[#ff5100] hover:-translate-y-1 transition-all duration-200 ${
        isActive ? "border-2 border-[#ff5100] ring-2 ring-[#ff5100]/20" : "border border-[#ded9e8]"
      }`}
    >
      <div className="relative aspect-[2/1] sm:aspect-[4/3] bg-surface-container-lowest overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container-lowest">
            <span className="material-symbols-outlined text-[#94a3b8] text-[48px]">casino</span>
          </div>
        )}
        {isActive && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-[#ff5100] text-white text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded shadow-md">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
            <span>Fixado</span>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
          {ludoRating && (
            <Badge variant="secondary" className="px-2 py-0.5 rounded text-[11px] font-metric-stat font-bold text-white shadow-sm bg-[#ff5100] hover:bg-[#ff5100] border-0">
              Ludo {formatRating(ludoRating)}
            </Badge>
          )}
          {bggRating && (
            <Badge variant="default" className="px-2 py-0.5 rounded text-[10px] font-metric-stat font-bold text-white shadow-sm bg-[#2c274b] hover:bg-[#2c274b] border-0">
              BGG {formatRating(bggRating)}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-3.5 space-y-2 flex-1 flex flex-col">
        <div>
          <h4 className="font-headline-sm text-headline-sm font-bold text-[#0f172a] leading-snug group-hover:text-primary transition-colors line-clamp-1">
            {name}
            {year && (
              <span className="text-[#64748b] font-normal text-[13px]"> ({year})</span>
            )}
          </h4>
          {(visibleDesigner || visiblePublisher) && (
            <p className="font-body-sm text-body-sm text-[#475569] mt-0.5 line-clamp-1">
              {visibleDesigner} {visibleDesigner && visiblePublisher ? "•" : ""} {visiblePublisher}
            </p>
          )}
        </div>
        {/* Wrapper with top border (above players) */}
        <div className="border-t border-[#e2e8f0]">
          {/* Line 1: Players + Playtime - with bottom border (above complexity) */}
          <div className="flex items-center justify-between gap-3 text-body-sm font-body-sm text-[#334155] py-1 border-b border-[#e2e8f0]">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="material-symbols-outlined text-[15px] text-[#64748b]">group</span> {formatPlayers(minPlayers, maxPlayers)}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="material-symbols-outlined text-[15px] text-[#64748b]">schedule</span> {formatPlaytime(minPlaytime)}
            </span>
          </div>

          {/* Line 2: Complexity - no border */}
          {weight && (
            <div className="flex items-center gap-3 text-body-sm font-body-sm text-[#334155] py-1">
              <span className={`flex items-center gap-1 whitespace-nowrap ${complexity?.class}`}>
                <span className="material-symbols-outlined text-[15px]">psychology</span>
                {complexity?.label}
              </span>
            </div>
          )}
        </div>
        {showTags && mechanics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {mechanics.slice(0, 3).map((mechanic) => (
              <Badge key={mechanic} variant="outline" className="tag-chip text-[11px] bg-[#f1edf7] text-[#3a3356] border-[#ddd7eb]">
                {mechanic}
              </Badge>
            ))}
            {mechanics.length > 3 && (
              <Badge variant="outline" className="tag-chip text-[11px] bg-[#f1edf7] text-[#3a3356] border-[#ddd7eb]">
                +{mechanics.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}