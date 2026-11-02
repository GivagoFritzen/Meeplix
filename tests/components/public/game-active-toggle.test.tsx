// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GameActiveToggle } from "@/components/public/game-active-toggle";
import * as gameActions from "@/app/actions/games";

const mockToast = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("@/app/actions/games", () => ({
  toggleGameActive: vi.fn(),
}));

describe("GameActiveToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza no estado inativo por padrão", () => {
    render(
      <GameActiveToggle
        gameId="game-1"
        initialActive={false}
        gameName="Sushi Go"
      />
    );

    const switchBtn = screen.getByRole("switch");
    expect(switchBtn).toBeInTheDocument();
    expect(switchBtn).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Ativar Jogo")).toBeInTheDocument();
  });

  it("renderiza no estado ativo quando initialActive é true", () => {
    render(
      <GameActiveToggle
        gameId="game-1"
        initialActive={true}
        gameName="Sushi Go"
      />
    );

    const switchBtn = screen.getByRole("switch");
    expect(switchBtn).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Jogo Ativo")).toBeInTheDocument();
  });

  it("chama toggleGameActive e exibe toast de sucesso ao ativar", async () => {
    vi.mocked(gameActions.toggleGameActive).mockResolvedValue({
      success: true,
      isActive: true,
    });

    render(
      <GameActiveToggle
        gameId="game-1"
        initialActive={false}
        gameName="Sushi Go"
      />
    );

    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(gameActions.toggleGameActive).toHaveBeenCalledWith("game-1", true);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Jogo ativado!",
          variant: "success",
        })
      );
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("chama toggleGameActive e exibe toast de desativação ao desativar", async () => {
    vi.mocked(gameActions.toggleGameActive).mockResolvedValue({
      success: true,
      isActive: false,
    });

    render(
      <GameActiveToggle
        gameId="game-1"
        initialActive={true}
        gameName="Sushi Go"
      />
    );

    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(gameActions.toggleGameActive).toHaveBeenCalledWith("game-1", false);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Jogo desativado",
        })
      );
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("reverte o estado e exibe toast de erro quando a ação falha", async () => {
    vi.mocked(gameActions.toggleGameActive).mockRejectedValue(new Error("Erro de rede"));

    render(
      <GameActiveToggle
        gameId="game-1"
        initialActive={false}
        gameName="Sushi Go"
      />
    );

    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Erro",
          variant: "destructive",
        })
      );
      expect(switchBtn).toHaveAttribute("aria-checked", "false");
    });
  });
});
