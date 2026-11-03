// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminDashboard from "@/app/admin/dashboard/page";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/components/admin/games-table", () => ({
  GamesTable: ({ onEdit }: { onEdit: (id: string) => void }) => (
    <button type="button" onClick={() => onEdit("game-1")}>
      Editar jogo de teste
    </button>
  ),
}));

vi.mock("@/components/admin/game-form", () => ({
  GameForm: ({ onSaved }: { onSaved: () => void }) => (
    <button type="button" onClick={onSaved}>
      Salvar formulário de teste
    </button>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminDashboard - modal do formulário", () => {
  it("fecha a modal ao salvar um novo jogo", () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /Novo Jogo/ }));
    expect(screen.getByRole("button", { name: "Salvar formulário de teste" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salvar formulário de teste" }));

    expect(
      screen.queryByRole("button", { name: "Salvar formulário de teste" })
    ).not.toBeInTheDocument();
  });

  it("fecha a modal ao salvar a edição de um jogo", () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Editar jogo de teste" }));
    expect(screen.getByRole("button", { name: "Salvar formulário de teste" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salvar formulário de teste" }));

    expect(
      screen.queryByRole("button", { name: "Salvar formulário de teste" })
    ).not.toBeInTheDocument();
  });
});
