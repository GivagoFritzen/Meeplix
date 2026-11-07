"use client";

import { useState } from "react";
import { GameForm } from "@/components/admin/game-form";
import { GamesTable } from "@/components/admin/games-table";
import Link from "next/link";
import { useToast } from "@/components/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  const handleNewGame = () => {
    setIsCreating(true);
    setEditingGameId(null);
  };

  const handleEditGame = (id: string) => {
    setEditingGameId(id);
    setIsCreating(false);
  };

  const handleCloseForm = () => {
    setEditingGameId(null);
    setIsCreating(false);
    setRefreshTrigger((t) => t + 1);
  };

  const handleDeleteGame = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/games/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Sucesso", description: "Jogo excluído com sucesso", variant: "success" });
        setRefreshTrigger((t) => t + 1);
      } else {
        const data = await res.json();
        toast({ title: "Erro", description: data.error || "Erro ao excluir jogo", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao excluir jogo", variant: "destructive" });
    }
  };

  const showForm = editingGameId || isCreating;

  return (
    <div className="bg-background text-on-surface antialiased min-h-screen flex flex-col">
      {/* TopNavBar */}
      <header className="bg-[#2c274b] text-white shadow-header border-b border-[#3c365c] sticky top-0 z-40">
        <div className="flex justify-between items-center w-full px-margin h-16 max-w-md md:max-w-7xl mx-auto">
          <div className="flex items-center">
            <Link
              href="/colecao"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-slate-200 hover:text-white hover:bg-white/20 transition-colors font-label-md text-label-md active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Coleção Pública</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md md:max-w-7xl w-full mx-auto px-margin md:px-gutter-desktop py-space-lg">
        {/* Workspace Banner & Quick Action Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 gap-space-md border-b border-[#e2e8f0] mb-space-lg">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">Gerenciador de Acervo</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Cadastre novos títulos, sincronize metadados via scraping (BGG/Ludopedia) e edite estatísticas da sua ludoteca.</p>
            <div className="flex items-center gap-space-sm flex-wrap mt-space-md">
              <Link
                href="/admin/configuracoes"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#2c274b] border border-[#cbd5e1] hover:bg-[#f8fafc] hover:border-[#2c274b] transition-all active:scale-[0.98] font-label font-medium text-sm w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-xl">settings</span>
                <span>Configurações</span>
              </Link>
              <button
                type="button"
                onClick={handleNewGame}
                className="btn-primary w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-xl">add_circle</span>
                <span>Novo Jogo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Games Table - Full Width */}
        <GamesTable onEdit={handleEditGame} onDelete={handleDeleteGame} editingId={editingGameId} refreshTrigger={refreshTrigger} />

        {/* Full Screen Modal for Game Form */}
        <Dialog open={!!showForm} onOpenChange={(open: boolean) => !open && handleCloseForm()}>
          <DialogOverlay className="bg-black/60" />
          <DialogContent className="fixed inset-0 left-0 top-0 z-50 w-full h-full max-w-none translate-x-0 translate-y-0 rounded-none border-none shadow-none p-0 m-0 gap-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            <GameForm
              gameId={editingGameId || "new"}
              onClose={handleCloseForm}
              onSaved={handleCloseForm}
              onDeleted={handleCloseForm}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}