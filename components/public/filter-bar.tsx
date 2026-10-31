"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  playerOptions,
  durationOptions,
  complexityOptions,
  mechanicOptions,
} from "@/components/shared/filter-options";

interface FilterBarProps {
  className?: string;
  children?: ReactNode;
}

export function FilterBar({ className, children }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`/colecao?${params.toString()}`);
  }, [router, searchParams]);

  const createSelect = (name: string, options: typeof playerOptions) => {
    const currentValue = searchParams.get(name) || "all";
    return (
      <div className="relative w-full sm:w-auto">
        <select
          value={currentValue}
          onChange={(e) => updateFilter(name, e.target.value)}
          className="w-full sm:w-auto bg-white border border-[#ded8ea] text-[#0f172a] text-body-sm font-body-sm rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:border-primary focus:ring-0 cursor-pointer shadow-sm"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">expand_more</span>
      </div>
    );
  };

  return (
    <div className={cn("pt-space-sm border-t border-white/15 w-full", className)}>
      <div className="flex items-center gap-1 mb-space-xs text-[#ffb68d] font-label-md text-label-md font-semibold">
        <span className="material-symbols-outlined text-[16px]">tune</span>
        <span>Filtros:</span>
      </div>
      {/* Mobile: cada filtro ocupa linha própria (flex-col). Desktop: em linha */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-space-xs">
        {createSelect("players", playerOptions)}
        {createSelect("duration", durationOptions)}
        {createSelect("complexity", complexityOptions)}
        <div className="hidden sm:block">
          {createSelect("mechanic", mechanicOptions)}
        </div>
        {children}
      </div>
    </div>
  );
}