import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const filePath = path.resolve(__dirname, "../../lib/display-preferences.ts");
const source = fs.readFileSync(filePath, "utf-8");

describe("display-preferences", () => {
  it("DEFAULT_DISPLAY_PREFERENCES expõe valores padrão", () => {
    expect(source).toContain("hideDesigners: true");
    expect(source).toContain("hidePublishers: false");
    expect(source).toContain("hideArtists: false");
    expect(source).toContain("hideTags: false");
  });

  it("DEFAULT_DISPLAY_PREFERENCES é exportado", () => {
    expect(source).toContain("export const DEFAULT_DISPLAY_PREFERENCES");
  });

  it("arquivo contém useDisplayPreferences hook", () => {
    expect(source).toContain("export function useDisplayPreferences");
  });
});
