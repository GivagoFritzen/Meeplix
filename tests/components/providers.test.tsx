// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Providers } from "@/components/providers";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Providers", () => {
  it("renderiza os filhos dentro dos provedores", () => {
    render(
      <Providers>
        <span>conteúdo</span>
      </Providers>
    );

    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
