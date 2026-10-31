"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface SortSelectorProps {
  className?: string;
}

const sortOptions = [
  { value: "name", label: "Ordenar: Nome (A–Z)" },
  { value: "-name", label: "Ordenar: Nome (Z–A)" },
  { value: "year", label: "Ordenar: Ano (Mais Antigos)" },
  { value: "-year", label: "Ordenar: Ano (Mais Recentes)" },
  { value: "bggRating", label: "Ordenar: Nota BGG (Menor)" },
  { value: "-bggRating", label: "Ordenar: Nota BGG (Maior)" },
  { value: "ludoRating", label: "Ordenar: Nota Ludopedia (Menor)" },
  { value: "-ludoRating", label: "Ordenar: Nota Ludopedia (Maior)" },
  { value: "weight", label: "Ordenar: Complexidade (Leve → Pesado)" },
  { value: "-weight", label: "Ordenar: Complexidade (Pesado → Leve)" },
];

export function SortSelector({ className }: SortSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "name") {
      params.delete("sort");
      params.delete("order");
    } else {
      const [sort, order] = value.startsWith("-") ? [value.slice(1), "desc"] : [value, "asc"];
      params.set("sort", sort);
      params.set("order", order);
    }
    params.delete("page");
    router.push(`/colecao?${params.toString()}`);
  }, [router, searchParams]);

  const currentSort = searchParams.get("sort") || "name";
  const currentOrder = searchParams.get("order") || "asc";
  const currentValue = currentOrder === "desc" ? `-${currentSort}` : currentSort;

  return (
    <div className={cn("relative w-full sm:ml-auto sm:w-auto", className)}>
      <select
        aria-label="Ordenar por"
        value={currentValue}
        onChange={(e) => handleSortChange(e.target.value)}
        className="w-full bg-white border border-[#ded8ea] text-[#0f172a] text-body-sm font-body-sm rounded-lg px-2.5 py-1.5 pr-7 appearance-none focus:border-primary focus:ring-0 cursor-pointer shadow-sm"
      >
        {sortOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">expand_more</span>
    </div>
  );
}
