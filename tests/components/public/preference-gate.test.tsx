// @vitest-environment jsdom

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreferenceGate } from "@/components/public/preference-gate";
import type { DisplayPreferences } from "@/lib/display-preferences";

const preferences: DisplayPreferences = {
  hideDesigners: true,
  hidePublishers: false,
  hideArtists: false,
  hideTags: false,
};

describe("PreferenceGate", () => {
  it("oculta children quando hideKey é true", () => {
    render(
      <PreferenceGate hideKey="hideDesigners" preferences={preferences}>
        <span>Designers</span>
      </PreferenceGate>,
    );
    expect(screen.queryByText("Designers")).not.toBeInTheDocument();
  });

  it("renderiza children quando hideKey é false", () => {
    render(
      <PreferenceGate hideKey="hidePublishers" preferences={preferences}>
        <span>Publishers</span>
      </PreferenceGate>,
    );
    expect(screen.getByText("Publishers")).toBeInTheDocument();
  });

  it("renderiza fallback quando oculto", () => {
    render(
      <PreferenceGate hideKey="hideDesigners" preferences={preferences} fallback={<span>Oculto</span>}>
        <span>Designers</span>
      </PreferenceGate>,
    );
    expect(screen.getByText("Oculto")).toBeInTheDocument();
  });

  it("fallback padrão é null", () => {
    const { container } = render(
      <PreferenceGate hideKey="hideDesigners" preferences={preferences}>
        <span>Designers</span>
      </PreferenceGate>,
    );
    expect(container.children.length).toBe(0);
  });

  it("aceita todas as chaves de DisplayPreferences", () => {
    const keys: Array<keyof DisplayPreferences> = [
      "hideDesigners",
      "hidePublishers",
      "hideArtists",
      "hideTags",
    ];
    for (const key of keys) {
      render(
        <PreferenceGate hideKey={key} preferences={{ ...preferences, [key]: true }}>
          <span>{key}</span>
        </PreferenceGate>,
      );
      expect(screen.queryByText(key)).not.toBeInTheDocument();
    }
  });
});
