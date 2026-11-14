/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import {
  clampUiFontSize,
  defaultAppearancePreferences,
  normalizeAppearancePreferences,
  normalizeCustomThemes,
  parseCustomThemeDefinition,
} from "./appearance";

describe("appearance preferences", () => {
  it("defaults when nothing is stored", () => {
    expect(normalizeAppearancePreferences(undefined)).toEqual(defaultAppearancePreferences);
  });

  it("drops an accent colour that is not hex", () => {
    expect(normalizeAppearancePreferences({ accentColor: "red" }).accentColor).toBeUndefined();
    expect(normalizeAppearancePreferences({ accentColor: "#ff0000" }).accentColor).toBe("#ff0000");
  });

  it("only accepts the known densities", () => {
    expect(normalizeAppearancePreferences({ density: "compact" }).density).toBe("compact");
    expect(normalizeAppearancePreferences({ density: "tiny" as never }).density).toBe("comfortable");
  });

  it("clamps the font size", () => {
    expect(clampUiFontSize(4)).toBe(11);
    expect(clampUiFontSize(40)).toBe(18);
    expect(clampUiFontSize(Number.NaN)).toBe(defaultAppearancePreferences.fontSize);
    expect(clampUiFontSize(14.4)).toBe(14);
  });
});

describe("custom theme files", () => {
  it("parses a valid theme", () => {
    const result = parseCustomThemeDefinition(
      JSON.stringify({ name: "Ocean", type: "dark", extends: "Nord", colors: { primary: "#00aaff" }, extra: 1 }),
    );

    expect(result).toEqual({
      callWasSuccessful: true,
      response: { name: "Ocean", type: "dark", extends: "Nord", colors: { primary: "#00aaff" } },
    });
  });

  it("rejects invalid JSON", () => {
    const result = parseCustomThemeDefinition("{ nope");

    expect(result.callWasSuccessful).toBe(false);
  });

  it("names the field that is wrong", () => {
    const result = parseCustomThemeDefinition(JSON.stringify({ name: "Ocean", type: "sepia" }));

    expect(result.callWasSuccessful).toBe(false);
    expect(!result.callWasSuccessful && result.error).toContain("type");
  });

  it("keeps the valid stored themes and the first of a name", () => {
    expect(
      normalizeCustomThemes([
        { name: "A", type: "dark" },
        { name: "", type: "dark" },
        { name: "A", type: "light" },
        "garbage",
        { name: "B", type: "light" },
      ]),
    ).toEqual([
      { name: "A", type: "dark" },
      { name: "B", type: "light" },
    ]);
    expect(normalizeCustomThemes(undefined)).toEqual([]);
  });
});
