// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameCard } from "@/components/public/game-card";
import type { DisplayPreferences } from "@/lib/display-preferences";

const preferences: DisplayPreferences = {
  hideDesigners: false,
  hidePublishers: false,
  hideArtists: false,
  hideTags: false,
};

const baseProps = {
  id: "game-1",
  name: "Cascadia",
  year: 2021,
  designer: "Designer",
  publisher: "Publisher",
  coverImage: "https://example.com/capa.jpg",
  minPlayers: 1,
  maxPlayers: 4,
  minPlaytime: 30,
  weight: 2.5,
  bggRating: 7.5,
  ludoRating: 8.0,
  mechanics: ["Tile Placement", "Pattern Building"],
  preferences,
};

describe("GameCard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza nome, ano e capa do jogo", () => {
    render(<GameCard {...baseProps} />);
    expect(screen.getByText("Cascadia")).toBeInTheDocument();
    expect(screen.getByText("(2021)")).toBeInTheDocument();
  });

  it("renderiza designer e publisher quando preferências permitem", () => {
    render(<GameCard {...baseProps} preferences={preferences} />);
    expect(screen.getByText(/Designer/)).toBeInTheDocument();
    expect(screen.getByText(/Publisher/)).toBeInTheDocument();
  });

  it("oculta designer quando hideDesigners está true", () => {
    render(<GameCard {...baseProps} preferences={{ ...preferences, hideDesigners: true }} />);
    expect(screen.queryByText(/Designer/)).not.toBeInTheDocument();
  });

  it("oculta publisher quando hidePublishers está true", () => {
    render(<GameCard {...baseProps} preferences={{ ...preferences, hidePublishers: true }} />);
    expect(screen.queryByText(/Publisher/)).not.toBeInTheDocument();
  });

  it("exibe badges de nota BGG e Ludopedia", () => {
    render(<GameCard {...baseProps} />);
    expect(screen.getByText("BGG 7,5")).toBeInTheDocument();
    expect(screen.getByText("Ludo 8,0")).toBeInTheDocument();
  });

  it("não exibe badges quando notas ausentes", () => {
    render(<GameCard {...baseProps} bggRating={null} ludoRating={null} />);
    expect(screen.queryByText(/BGG/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ludo/)).not.toBeInTheDocument();
  });

  it("exibe mecânicas (até 3) e contador +N", () => {
    render(<GameCard {...baseProps} mechanics={["A", "B", "C", "D"]} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("oculta mecânicas quando hideTags está true", () => {
    render(<GameCard {...baseProps} preferences={{ ...preferences, hideTags: true }} />);
    expect(screen.queryByText("Tile Placement")).not.toBeInTheDocument();
  });

  it("exibe jogadores e duração", () => {
    render(<GameCard {...baseProps} />);
    expect(screen.getByText("1–4 jogadores")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
  });

  it("exibe complexidade quando weight presente", () => {
    render(<GameCard {...baseProps} weight={2.5} />);
    expect(screen.getByText("Médio Leve")).toBeInTheDocument();
  });

  it("não exibe complexidade quando weight ausente", () => {
    render(<GameCard {...baseProps} weight={null} />);
    expect(screen.queryByText("Médio Leve")).not.toBeInTheDocument();
  });

  it("não exibe mecânicas quando array vazio", () => {
    render(<GameCard {...baseProps} mechanics={[]} />);
    expect(screen.queryByText("Tile Placement")).not.toBeInTheDocument();
  });

  it("usa slug do nome para o link", () => {
    const { container } = render(<GameCard {...baseProps} />);
    const link = container.querySelector("a");
    expect(link).toHaveAttribute("href", "/jogos/cascadia");
  });
});
