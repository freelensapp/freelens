/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { describe, expect, it } from "vitest";
import { isThemeFileName, readThemesDirectory } from "../read-themes-directory";

const theme = (name: string, displayName = name) => `apiVersion: freelens.app/v1
kind: Theme
metadata:
  name: ${name}
spec:
  displayName: ${displayName}
  dark:
    colors:
      primary: "#ff0000"
`;

describe("the themes directory", () => {
  it.each(["a.yaml", "a.yml", "a.json", "A.YAML"])("reads %s", (fileName) => {
    expect(isThemeFileName(fileName)).toBe(true);
  });

  it.each(["a.txt", ".a.yaml", "a.yaml~"])("skips %s", (fileName) => {
    expect(isThemeFileName(fileName)).toBe(false);
  });

  it("gives the valid themes", () => {
    const { themes, invalidFiles } = readThemesDirectory([
      { fileName: "one.yaml", content: theme("one") },
      { fileName: "two.yaml", content: theme("two") },
    ]);

    expect(themes.map(({ theme, fileName }) => [theme.metadata.name, fileName])).toEqual([
      ["one", "one.yaml"],
      ["two", "two.yaml"],
    ]);
    expect(invalidFiles).toEqual([]);
  });

  it("lists an invalid file with the reason and does not apply it", () => {
    const { themes, invalidFiles } = readThemesDirectory([
      { fileName: "broken.yaml", content: theme("one").replace('"#ff0000"', "#ff0000") },
    ]);

    expect(themes).toEqual([]);
    expect(invalidFiles).toEqual([{ fileName: "broken.yaml", error: expect.stringContaining("has to be quoted") }]);
  });

  it("refuses a second file with a name already taken, in the order of the file names", () => {
    const { themes, invalidFiles } = readThemesDirectory([
      { fileName: "b.yaml", content: theme("same", "Second") },
      { fileName: "a.yaml", content: theme("same", "First") },
    ]);

    expect(themes.map(({ theme }) => theme.spec.displayName)).toEqual(["First"]);
    expect(invalidFiles).toEqual([{ fileName: "b.yaml", error: 'The name "same" is already taken by a.yaml' }]);
  });

  it.each(["freelens", "ayu", "ayu-mirage", "dracula", "graphite", "catppuccin", "solarized", "high-contrast"])(
    "refuses the name of the built-in theme %s",
    (name) => {
      const { themes, invalidFiles } = readThemesDirectory([{ fileName: `${name}.yaml`, content: theme(name) }]);

      expect(themes).toEqual([]);
      expect(invalidFiles).toEqual([
        { fileName: `${name}.yaml`, error: `The name "${name}" is the name of a built-in theme` },
      ]);
    },
  );

  it("keeps the unknown tokens of a theme", () => {
    const { themes } = readThemesDirectory([
      { fileName: "one.yaml", content: theme("one").replace("primary:", "primaryy:") },
    ]);

    expect(themes[0].unknownTokens).toEqual(["dark.colors.primaryy"]);
  });
});
