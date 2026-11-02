// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminFilterBar } from "@/components/admin/filter-bar";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: () => null,
    toString: () => "",
  })),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/"),
}));

describe("AdminFilterBar", () => {
  const onFilterChange = vi.fn();

  beforeEach(() => {
    onFilterChange.mockClear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza selects de filtro", () => {
    render(
      <AdminFilterBar onFilterChange={onFilterChange} currentValues={{ players: "all" }} />,
    );
    expect(screen.getByText(/Filtros:/)).toBeInTheDocument();
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });

  it("chama onFilterChange ao alterar select", () => {
    render(<AdminFilterBar onFilterChange={onFilterChange} currentValues={{}} />);
    const playersSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(playersSelect, { target: { value: "solo" } });
    expect(onFilterChange).toHaveBeenCalledWith("players", "solo");
  });

  it("renderiza sortElement quando fornecido", () => {
    render(
      <AdminFilterBar
        onFilterChange={onFilterChange}
        sortElement={<select><option value="name">Nome</option></select>}
        currentValues={{}}
      />,
    );
    expect(screen.getByText("Nome")).toBeInTheDocument();
  });

  it("usa currentValues para selecionar valor atual", () => {
    render(
      <AdminFilterBar
        onFilterChange={onFilterChange}
        currentValues={{ players: "2", duration: "quick" }}
      />,
    );
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("2");
  });

  it("inclui opções de mecânicas", () => {
    render(<AdminFilterBar onFilterChange={onFilterChange} currentValues={{}} />);
    expect(screen.getByText("Mecânicas: Todas")).toBeInTheDocument();
  });
});
