// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NumericInput from "@/components/ui/numeric-input";

describe("NumericInput", () => {
  it("remove caracteres não numéricos e mantém um separador decimal", () => {
    const onChange = vi.fn();
    render(<NumericInput aria-label="peso" onChange={onChange} />);

    const input = screen.getByLabelText("peso") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1a2.3,4" } });

    expect(input.value).toBe("12.34");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("converte vírgula em ponto no modo decimal", () => {
    render(<NumericInput aria-label="nota" />);

    const input = screen.getByLabelText("nota") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "8,5" } });

    expect(input.value).toBe("8.5");
  });

  it("mantém apenas dígitos no modo inteiro", () => {
    render(<NumericInput aria-label="ano" mode="integer" />);

    const input = screen.getByLabelText("ano") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2a0.2,5" } });

    expect(input.value).toBe("2025");
  });

  it("saneia conteúdo colado", () => {
    const onChange = vi.fn();
    render(<NumericInput aria-label="valor" onChange={onChange} />);

    const input = screen.getByLabelText("valor") as HTMLInputElement;
    fireEvent.paste(input, {
      clipboardData: { getData: () => "4x,5" },
    });

    expect(input.value).toBe("4.5");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("saneia conteúdo colado no modo inteiro", () => {
    render(<NumericInput aria-label="quantidade" mode="integer" />);

    const input = screen.getByLabelText("quantidade") as HTMLInputElement;
    fireEvent.paste(input, {
      clipboardData: { getData: () => "1a2.3" },
    });

    expect(input.value).toBe("123");
  });

  it("lida com paste vazio", () => {
    const onChange = vi.fn();
    render(<NumericInput aria-label="sem-clipboard" onChange={onChange} />);

    const input = screen.getByLabelText("sem-clipboard") as HTMLInputElement;
    fireEvent.paste(input);

    expect(input.value).toBe("");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("encaminha ref de objeto", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<NumericInput aria-label="com-ref" ref={ref} />);

    expect(ref.current).toBe(screen.getByLabelText("com-ref"));
  });

  it("encaminha ref de função", () => {
    const ref = vi.fn();
    render(<NumericInput aria-label="com-funcao" ref={ref} />);

    expect(ref).toHaveBeenCalledWith(screen.getByLabelText("com-funcao"));
  });

  it("define displayName", () => {
    expect(NumericInput.displayName).toBe("NumericInput");
  });
});
