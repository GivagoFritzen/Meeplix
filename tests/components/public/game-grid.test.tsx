// @vitest-environment jsdom

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameGrid } from "@/components/public/game-grid";
import type { DisplayPreferences } from "@/lib/display-preferences";

const preferences: DisplayPreferences = {
  hideDesigners: false,
  hidePublishers: false,
  hideArtists: false,
  hideTags: false,
};

const games = [
  {
    id: "1",
    name: "Jogo Um",
    year: 2020,
    designer: "D1",
    publisher: "P1",
    coverImage: "https://example.com/1.jpg",
    minPlayers: 1,
    maxPlayers: 2,
    minPlaytime: 30,
    weight: 2.0,
    bggRating: 7.0,
    ludoRating: 7.5,
    mechanics: ["Mec A"],
  },
  {
    id: "2",
    name: "Jogo Dois",
    year: 2021,
    designer: "D2",
    publisher: "P2",
    coverImage: null,
    minPlayers: 2,
    maxPlayers: 4,
    minPlaytime: 60,
    weight: 3.0,
    bggRating: null,
    ludoRating: null,
    mechanics: [],
  },
];

describe("GameGrid", () => {
  it("renderiza lista de jogos", () => {
    render(<GameGrid games={games} preferences={preferences} />);
    expect(screen.getByText("Jogo Um")).toBeInTheDocument();
    expect(screen.getByText("Jogo Dois")).toBeInTheDocument();
  });

  it("exibe mensagem vazia quando não há jogos", () => {
    render(<GameGrid games={[]} preferences={preferences} emptyMessage="Nada encontrado" />);
    expect(screen.getByText("Nada encontrado")).toBeInTheDocument();
  });

  it("usa mensagem vazia padrão", () => {
    render(<GameGrid games={[]} preferences={preferences} />);
    expect(screen.getByText("Nenhum jogo encontrado")).toBeInTheDocument();
  });

  it("passa preferences para cada GameCard", () => {
    render(<GameGrid games={[games[0]]} preferences={preferences} />);
    expect(screen.getByText(/D1/)).toBeInTheDocument();
  });
});
