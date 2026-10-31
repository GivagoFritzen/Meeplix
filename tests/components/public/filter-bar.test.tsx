// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "@/components/public/filter-bar";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  params: new URLSearchParams("players=2&duration=long&page=3"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.params,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = new URLSearchParams("players=2&duration=long&page=3");
});

describe("FilterBar", () => {
  it("renderiza filtros com valores atuais", () => {
    render(<FilterBar />);

    const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
    expect(selects).toHaveLength(4);
    expect(selects[0].value).toBe("2");
    expect(selects[1].value).toBe("long");
    expect(selects[2].value).toBe("all");
    expect(selects[3].value).toBe("all");
  });

  it("renderiza conteúdo adicional", () => {
    render(
      <FilterBar>
        <span>extra</span>
      </FilterBar>
    );

    expect(screen.getByText("extra")).toBeInTheDocument();
  });

  it("aplica classe personalizada", () => {
    const { container } = render(<FilterBar className="minha-classe" />);

    expect(container.firstElementChild).toHaveClass("minha-classe");
  });

  it("remove filtro ao selecionar all e limpa página", () => {
    render(<FilterBar />);

    const players = screen.getAllByRole("combobox")[0];
    fireEvent.change(players, { target: { value: "all" } });

    expect(mocks.push).toHaveBeenCalledWith("/colecao?duration=long");
  });

  it("adiciona ou atualiza filtro e limpa página", () => {
    render(<FilterBar />);

    const duration = screen.getAllByRole("combobox")[1];
    fireEvent.change(duration, { target: { value: "quick" } });

    expect(mocks.push).toHaveBeenCalledWith(
      "/colecao?players=2&duration=quick"
    );
  });

  it("atualiza complexidade e mecânica", () => {
    render(<FilterBar />);
    const selects = screen.getAllByRole("combobox");

    fireEvent.change(selects[2], { target: { value: "heavy" } });
    fireEvent.change(selects[3], { target: { value: "deck" } });

    expect(mocks.push).toHaveBeenCalledWith(
      "/colecao?players=2&duration=long&complexity=heavy"
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/colecao?players=2&duration=long&mechanic=deck"
    );
  });
});
