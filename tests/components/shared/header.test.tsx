// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicHeader } from "@/components/shared/header";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
  getCurrentUser: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PublicHeader", () => {
  it("exibe a logo", async () => {
    mocks.auth.mockResolvedValue(null);

    render(await PublicHeader({}));

    expect(screen.getByAltText("Meeplix")).toHaveAttribute("src", "/logo.svg");
  });

  it("não exibe link de admin sem sessão", async () => {
    mocks.auth.mockResolvedValue(null);

    render(await PublicHeader({}));

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("exibe link de admin com sessão", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" }, expires: "2030-01-01" });

    render(await PublicHeader({}));

    const link = screen.getByRole("link", { name: /Admin/ });
    expect(link).toHaveAttribute("href", "/admin/login");
  });

  it("aplica classe personalizada", async () => {
    mocks.auth.mockResolvedValue(null);

    const { container } = render(await PublicHeader({ className: "minha-classe" }));

    expect(container.querySelector("header")).toHaveClass("minha-classe");
  });
});
