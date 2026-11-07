// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SortSelector } from "@/components/public/sort-selector";

const pushMock = vi.fn();

vi.mock("next/navigation", () => {
  const searchParamsMock = vi.fn(() => ({
    get: () => null,
    toString: () => "",
  }));
  return {
    useSearchParams: searchParamsMock,
    useRouter: vi.fn(() => ({ push: pushMock })),
    usePathname: vi.fn(() => "/"),
    __searchParamsMock: searchParamsMock,
  };
});

import { useSearchParams } from "next/navigation";
const useSearchParamsMock = useSearchParams as unknown as ReturnType<typeof vi.fn>;

describe("SortSelector", () => {
  beforeEach(() => {
    pushMock.mockClear();
    useSearchParamsMock.mockClear();
    vi.restoreAllMocks();
  });

  it("renderiza select de ordenação", () => {
    render(<SortSelector />);
    expect(screen.getByLabelText(/Ordenar por/i)).toBeInTheDocument();
  });

  it("tem opções de ordenação esperadas", () => {
    render(<SortSelector />);
    expect(screen.getByText("Ordenar: Nome (A–Z)")).toBeInTheDocument();
    expect(screen.getByText("Ordenar: Nota BGG (Maior)")).toBeInTheDocument();
  });

  it("chama router.push ao alterar ordenação", () => {
    render(<SortSelector />);
    const select = screen.getByLabelText(/Ordenar por/i);
    fireEvent.change(select, { target: { value: "-year" } });
    expect(pushMock).toHaveBeenCalled();
  });

  it("valor atual reflete sort e order", () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === "sort" ? "year" : key === "order" ? "desc" : null),
      toString: () => "sort=year&order=desc",
    } as any);
    render(<SortSelector />);
    const select = screen.getByLabelText(/Ordenar por/i);
    expect(select).toHaveValue("-year");
  });
});
