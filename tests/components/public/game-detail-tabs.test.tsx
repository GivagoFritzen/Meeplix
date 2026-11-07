// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameDetailTabs } from "@/app/jogos/game-detail-tabs";

const baseGame: any = {
  id: "g1",
  name: "Jogo Teste",
  description: "Descrição do jogo",
  preparationText: "Texto de preparo",
  files: [
    { id: "f1", type: "COVER", path: "games/g1/capa.jpg", displayName: "capa.jpg", originalName: "capa.jpg", extension: "jpg", mimeType: "image/jpeg", size: 100 },
    { id: "f2", type: "MANUAL", path: "games/g1/manual.pdf", displayName: "manual.pdf", originalName: "manual.pdf", extension: "pdf", mimeType: "application/pdf", size: 200 },
  ],
  links: {},
  notes: null,
};

describe("GameDetailTabs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza aba Resumo por padrão", () => {
    render(<GameDetailTabs game={baseGame} />);
    expect(screen.getByText("Resumo")).toBeInTheDocument();
    expect(screen.getByText("Descrição do jogo")).toBeInTheDocument();
  });

  it("renderiza aba Preparo", () => {
    render(<GameDetailTabs game={baseGame} />);
    fireEvent.click(screen.getByText("Preparo"));
    expect(screen.getByText("Texto de preparo")).toBeInTheDocument();
  });

  it("renderiza aba Arquivos quando há arquivos não-capa", () => {
    render(<GameDetailTabs game={baseGame} />);
    expect(screen.getByText("Arquivos")).toBeInTheDocument();
  });

  it("exibe contador de arquivos na aba", () => {
    render(<GameDetailTabs game={baseGame} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("não renderiza aba Arquivos quando não há arquivos não-capa", () => {
    render(<GameDetailTabs game={{ ...baseGame, files: [{ ...baseGame.files[0], type: "COVER" }] }} />);
    expect(screen.queryByText("Arquivos")).not.toBeInTheDocument();
  });

  it("exibe Manual Online quando links.manual presente", () => {
    const game = { ...baseGame, links: { manual: "https://example.com/manual.pdf" } };
    render(<GameDetailTabs game={game} />);
    expect(screen.getByText("Manual Online")).toBeInTheDocument();
  });

  it("exibe texto quando não há descrição", () => {
    render(<GameDetailTabs game={{ ...baseGame, description: null }} />);
    expect(screen.getByText(/Nenhuma descrição cadastrada/)).toBeInTheDocument();
  });

  it("exibe texto quando não há texto de preparo", () => {
    render(<GameDetailTabs game={{ ...baseGame, preparationText: null }} />);
    fireEvent.click(screen.getByText("Preparo"));
    expect(screen.getByText(/preparação cadastrado/)).toBeInTheDocument();
  });
});
