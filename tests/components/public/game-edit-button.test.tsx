// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameEditButton } from "@/components/public/game-edit-button";

vi.mock("@/components/admin/game-form", () => ({
  GameForm: ({ onClose, onSaved, onDeleted, gameId }: any) => (
    <div data-testid="mock-game-form" data-gameid={gameId}>
      <button onClick={onClose}>Fechar</button>
      <button onClick={onSaved}>Salvar</button>
    </div>
  ),
}));

describe("GameEditButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza botão de editar", () => {
    render(<GameEditButton gameId="g1" />);
    expect(screen.getByTitle("Editar jogo")).toBeInTheDocument();
  });

  it("abre dialog ao clicar em editar", () => {
    render(<GameEditButton gameId="g1" />);
    fireEvent.click(screen.getByTitle("Editar jogo"));
    expect(screen.getByTestId("mock-game-form")).toBeInTheDocument();
  });

  it("passa gameId para o GameForm", () => {
    render(<GameEditButton gameId="g1" />);
    fireEvent.click(screen.getByTitle("Editar jogo"));
    expect(screen.getByTestId("mock-game-form")).toHaveAttribute("data-gameid", "g1");
  });

  it("fecha o dialog ao clicar em Fechar", () => {
    render(<GameEditButton gameId="g1" />);
    fireEvent.click(screen.getByTitle("Editar jogo"));
    fireEvent.click(screen.getByText("Fechar"));
    expect(screen.queryByTestId("mock-game-form")).not.toBeInTheDocument();
  });
});
