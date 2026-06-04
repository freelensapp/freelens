/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getCustomThemeColors, withCustomThemeColors } from "./custom-theme-colors";
import lensDarkThemeInjectable from "./lens-dark.injectable";

describe("custom theme colors", () => {
  it("keeps only supported lens theme color names", () => {
    expect(
      getCustomThemeColors({
        primary: "#123456",
        unknownColor: "#abcdef",
      }),
    ).toEqual({
      primary: "#123456",
    });
  });

  it("applies valid overrides to a theme", () => {
    const theme = lensDarkThemeInjectable.instantiate({} as never);

    expect(withCustomThemeColors(theme, { primary: "#123456" })).toMatchObject({
      colors: {
        ...theme.colors,
        primary: "#123456",
      },
    });
  });

  it("returns the original theme without valid overrides", () => {
    const theme = lensDarkThemeInjectable.instantiate({} as never);

    expect(withCustomThemeColors(theme, undefined)).toBe(theme);
  });
});
