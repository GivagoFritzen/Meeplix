"use client";

import { useState } from "react";
import { GameForm } from "@/components/admin/game-form";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";

interface GameEditButtonProps {
  gameId: string;
  className?: string;
}

export function GameEditButton({ gameId, className }: GameEditButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        title="Editar jogo"
        aria-label="Editar jogo"
      >
        <span className="material-symbols-outlined">edit</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogOverlay className="bg-black/60" />
        <DialogContent
          className="fixed inset-0 left-0 top-0 z-50 w-full h-full max-w-none translate-x-0 translate-y-0 rounded-none border-none shadow-none p-0 m-0 gap-0"
        >
          <GameForm
            gameId={gameId}
            onClose={() => setOpen(false)}
            onSaved={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
