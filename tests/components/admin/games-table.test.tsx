// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GamesTable } from "@/components/admin/games-table";

vi.mock("@/components/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

const mockGames = [
  {
    id: "g1",
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
    ludoRating: null,
    bggRank: null,
    ludoRank: null,
    links: {},
    files: [],
    createdAt: "2024-01-01T00:00:00Z",
  },
];

describe("GamesTable", () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn();

  beforeEach(() => {
    onEdit.mockClear();
    onDelete.mockClear();
    fetchMock.mockClear();
    vi.restoreAllMocks();
    (globalThis as any).fetch = fetchMock;
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    delete (globalThis as any).fetch;
    vi.unstubAllGlobals();
  });

  const renderWithData = (gamesData: typeof mockGames, total = 1, totalPages = 1) => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        games: gamesData,
        total,
        totalPages,
        page: 1,
      }),
    } as Response);
    render(<GamesTable onEdit={onEdit} onDelete={onDelete} />);
  };

  it("renderiza lista de jogos após carregar", async () => {
    renderWithData(mockGames);
    await waitFor(() =>
      expect(screen.getAllByText("Jogo Um").length).toBeGreaterThan(0),
    );
  });

  it("chama onEdit ao clicar em editar", async () => {
    renderWithData(mockGames);
    await waitFor(() =>
      expect(screen.getAllByText("Jogo Um").length).toBeGreaterThan(0),
    );
    const editBtns = screen.getAllByTitle("Editar Jogo");
    fireEvent.click(editBtns[0]);
    expect(onEdit).toHaveBeenCalledWith("g1");
  });

  it("chama onDelete ao clicar em excluir", async () => {
    renderWithData(mockGames);
    await waitFor(() =>
      expect(screen.getAllByText("Jogo Um").length).toBeGreaterThan(0),
    );
    const deleteBtns = screen.getAllByTitle("Excluir");
    fireEvent.click(deleteBtns[0]);
    expect(onDelete).toHaveBeenCalledWith("g1");
  });

  it("desabilita excluir quando editingId está definido", async () => {
    renderWithData(mockGames);
    await waitFor(() =>
      expect(screen.getAllByText("Jogo Um").length).toBeGreaterThan(0),
    );
    render(<GamesTable onEdit={onEdit} onDelete={onDelete} editingId="g1" />);
    await waitFor(() =>
      expect(screen.getAllByText("Jogo Um").length).toBeGreaterThan(0),
    );
    const deleteBtns = screen.getAllByTitle(/excluir/i);
    expect(deleteBtns.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("exibe estado vazio", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ games: [], total: 0, totalPages: 0, page: 1 }),
    } as Response);
    render(<GamesTable onEdit={onEdit} onDelete={onDelete} />);
    await waitFor(() =>
      expect(screen.getAllByText(/Nenhum jogo encontrado/i).length).toBeGreaterThan(0),
    );
  });

  it("renderiza paginação quando há múltiplas páginas", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        games: mockGames,
        total: 100,
        totalPages: 3,
        page: 1,
      }),
    } as Response);
    render(<GamesTable onEdit={onEdit} onDelete={onDelete} />);
    await waitFor(() => {
      const el = screen.getByText("Página 1");
      expect(el).toBeInTheDocument();
    });
  });

  it("não exibe separador quando apenas a nota BGG está preenchida", async () => {
    renderWithData(mockGames);
    await waitFor(() =>
      expect(screen.getAllByText("Jogo Um").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("★ 7,0").length).toBeGreaterThan(0);
    expect(screen.queryByText("/")).toBeNull();
  });

  it("exibe separador quando as duas notas estão preenchidas", async () => {
    renderWithData([{ ...mockGames[0], ludoRating: 6.5 }] as unknown as typeof mockGames);
    await waitFor(() =>
      expect(screen.getAllByText("Jogo Um").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("★ 6,5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/").length).toBeGreaterThan(0);
  });
});
