// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameplayMetricsCards } from "@/components/public/gameplay-metrics-cards";

describe("GameplayMetricsCards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna null quando não há dados em nenhuma métrica", () => {
    const { container } = render(
      <GameplayMetricsCards interaction={{ value: null, label: "" }} />,
    );
    expect(container.children.length).toBe(0);
  });

  it("renderiza cards de métricas com dados", () => {
    render(
      <GameplayMetricsCards
        interaction={{ value: 3, label: "Médio" }}
        luck={{ value: 2, label: "Baixo" }}
      />,
    );
    expect(screen.getByText("Interação")).toBeInTheDocument();
    expect(screen.getByText("Sorte")).toBeInTheDocument();
  });

  it("formata valor com vírgula", () => {
    render(
      <GameplayMetricsCards interaction={{ value: 3.5, label: "" }} />,
    );
    expect(screen.getByText("3,5")).toBeInTheDocument();
  });

  it("variante dots renderiza indicadores circulares", () => {
    render(
      <GameplayMetricsCards
        interaction={{ value: 4, label: "Alto" }}
        variant="dots"
      />,
    );
    expect(screen.getByText("Interação")).toBeInTheDocument();
    expect(screen.getByText("Alto")).toBeInTheDocument();
  });

  it("variante embedded renderiza sem section wrapper", () => {
    const { container } = render(
      <GameplayMetricsCards
        interaction={{ value: 3, label: "Médio" }}
        variant="embedded"
      />,
    );
    expect((container.firstElementChild as Element).tagName).not.toBe("SECTION");
  });

  it("oculta métricas com valor undefined", () => {
    render(
      <GameplayMetricsCards
        interaction={{ value: 3, label: "Médio" }}
        luck={undefined}
      />,
    );
    expect(screen.getByText("Interação")).toBeInTheDocument();
    expect(screen.queryByText("Sorte")).not.toBeInTheDocument();
  });

  it("abre o helpText ao tocar no botão de ajuda", async () => {
    render(
      <TooltipProvider>
        <GameplayMetricsCards
          downtime={{ value: 2, label: "Baixo" }}
        />
      </TooltipProvider>,
    );

    const helpButton = screen.getByRole("button", {
      name: "Ajuda sobre Downtime",
    });

    const pointerDown = new Event("pointerdown", { bubbles: true });
    Object.defineProperty(pointerDown, "pointerType", { value: "touch" });
    fireEvent(helpButton, pointerDown);
    fireEvent.click(helpButton);

    expect(
      await screen.findByText(
        "Tempo que os jogadores passam sem tomar decisões ativas durante a partida.",
      ),
    ).toBeInTheDocument();
  });

  it("abre o helpText ao clicar com o mouse", async () => {
    render(
      <TooltipProvider>
        <GameplayMetricsCards downtime={{ value: 2, label: "Baixo" }} />
      </TooltipProvider>,
    );

    const helpButton = screen.getByRole("button", {
      name: "Ajuda sobre Downtime",
    });

    fireEvent.pointerDown(helpButton, { pointerType: "mouse" });
    fireEvent.click(helpButton);

    expect(
      await screen.findByText(
        "Tempo que os jogadores passam sem tomar decisões ativas durante a partida.",
      ),
    ).toBeInTheDocument();
  });

  it("abre o helpText ao passar o mouse", async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <GameplayMetricsCards downtime={{ value: 2, label: "Baixo" }} />
      </TooltipProvider>,
    );

    const helpButton = screen.getByRole("button", {
      name: "Ajuda sobre Downtime",
    });

    fireEvent.pointerMove(helpButton, { pointerType: "mouse" });

    expect(
      await screen.findByText(
        "Tempo que os jogadores passam sem tomar decisões ativas durante a partida.",
      ),
    ).toBeInTheDocument();
  });
});
