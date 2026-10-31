"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export function SearchBar({ placeholder = "Buscar por título, designer, editora ou mecânica...", className }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("search", value.trim());
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`/colecao?${params.toString()}`);
    }, 300);
  }, [router, searchParams]);

  return (
    <div className={cn("relative flex-1", className)}>
      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
      <input
        type="text"
        defaultValue={searchParams.get("search") || ""}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-[#ded8ea] rounded-lg pl-10 pr-10 py-2.5 text-[#0f172a] placeholder:text-slate-400 font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
      />
    </div>
  );
}