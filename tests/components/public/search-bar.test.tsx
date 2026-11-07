// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchBar } from "@/components/public/search-bar";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: () => null,
    toString: () => "",
  })),
  useRouter: vi.fn(() => ({ push: pushMock })),
  usePathname: vi.fn(() => "/"),
}));

describe("SearchBar", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.restoreAllMocks();
  });

  it("renderiza input de busca", () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });

  it("usa placeholder customizado", () => {
    render(<SearchBar placeholder="Buscar jogos..." />);
    expect(screen.getByPlaceholderText("Buscar jogos...")).toBeInTheDocument();
  });
});
