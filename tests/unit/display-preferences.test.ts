import { describe, it, expect } from "vitest";
import { DEFAULT_DISPLAY_PREFERENCES } from "@/lib/display-preferences-config";

describe("display-preferences", () => {
  it("expõe os valores padrão", () => {
    expect(DEFAULT_DISPLAY_PREFERENCES).toEqual({
      hideDesigners: true,
      hidePublishers: false,
      hideArtists: false,
      hideTags: false,
    });
  });
});
