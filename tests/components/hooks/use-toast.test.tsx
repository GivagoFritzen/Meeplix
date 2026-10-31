// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProviderWrapper, useToast } from "@/components/hooks/use-toast";

function Trigger({
  title,
  description,
  variant,
}: {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast({ title, description, variant })}>
      disparar
    </button>
  );
}

function renderWithProvider(children: React.ReactNode) {
  return render(<ToastProviderWrapper>{children}</ToastProviderWrapper>);
}

beforeEach(() => {
  vi.useFakeTimers();
  let counter = 0;
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => `toast-${++counter}`),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ToastProviderWrapper", () => {
  it("exibe toast com título e descrição", () => {
    renderWithProvider(<Trigger title="Salvo" description="Jogo atualizado" />);

    fireEvent.click(screen.getByRole("button", { name: "disparar" }));

    expect(screen.getByText("Salvo")).toBeInTheDocument();
    expect(screen.getByText("Jogo atualizado")).toBeInTheDocument();
  });

  it("exibe toast sem descrição", () => {
    renderWithProvider(<Trigger title="Somente título" />);

    fireEvent.click(screen.getByRole("button", { name: "disparar" }));

    expect(screen.getByText("Somente título")).toBeInTheDocument();
  });

  it("remove o toast após 5 segundos", () => {
    renderWithProvider(<Trigger title="Temporário" />);

    fireEvent.click(screen.getByRole("button", { name: "disparar" }));
    expect(screen.getByText("Temporário")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Temporário")).not.toBeInTheDocument();
  });

  it("acumula múltiplos toasts", () => {
    renderWithProvider(
      <>
        <Trigger title="Primeiro" />
        <Trigger title="Segundo" />
      </>
    );

    const buttons = screen.getAllByRole("button", { name: "disparar" });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(screen.getByText("Primeiro")).toBeInTheDocument();
    expect(screen.getByText("Segundo")).toBeInTheDocument();
  });

  it("aceita variantes default, destructive e success", () => {
    renderWithProvider(
      <>
        <Trigger title="Padrão" />
        <Trigger title="Erro" variant="destructive" />
        <Trigger title="Sucesso" variant="success" />
      </>
    );

    const buttons = screen.getAllByRole("button", { name: "disparar" });
    buttons.forEach((button) => fireEvent.click(button));

    expect(screen.getByText("Padrão")).toBeInTheDocument();
    expect(screen.getByText("Erro")).toBeInTheDocument();
    expect(screen.getByText("Sucesso")).toBeInTheDocument();
  });
});

describe("useToast", () => {
  it("falha quando usado fora do provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Trigger title="Sem provider" />)).toThrow(
      "useToast deve ser usado dentro de ToastProviderWrapper"
    );
  });
});
