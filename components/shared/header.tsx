import Link from "next/link";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";

interface PublicHeaderProps {
  className?: string;
}

export async function PublicHeader({ className }: PublicHeaderProps) {
  const session = await auth();

  return (
    <header className={cn("sticky top-0 z-40 w-full bg-[#2c274b] text-white shadow-header border-b border-[#3c365c]", className)}>
      <div className="max-w-7xl mx-auto px-margin md:px-gutter-desktop h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white hover:text-[#ff5100] transition-colors">
          <img src="/logo.svg" alt="Meeplix" className="h-20 w-20" />
        </Link>
        <nav className="flex items-center gap-4">
          {session?.user && (
            <Link href="/admin/login" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold transition">
              <span className="material-symbols-outlined text-[18px]">shield_person</span>
              <span>Admin</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}