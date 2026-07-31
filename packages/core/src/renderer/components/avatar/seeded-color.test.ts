/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { seededColor } from "./seeded-color";

const parseHsl = (color: string) => {
  const match = /^hsl\((?<hue>\d+), (?<saturation>\d+)%, (?<lightness>\d+)%\)$/.exec(color);

  if (!match?.groups) {
    throw new Error(`not an hsl() colour: ${color}`);
  }

  return {
    hue: Number(match.groups.hue),
    saturation: Number(match.groups.saturation) / 100,
    lightness: Number(match.groups.lightness) / 100,
  };
};

const hslToRgb = (hue: number, saturation: number, lightness: number) => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const min = lightness - chroma / 2;
  const [red, green, blue] =
    hue < 60
      ? [chroma, second, 0]
      : hue < 120
        ? [second, chroma, 0]
        : hue < 180
          ? [0, chroma, second]
          : hue < 240
            ? [0, second, chroma]
            : hue < 300
              ? [second, 0, chroma]
              : [chroma, 0, second];

  return [red + min, green + min, blue + min];
};

const contrastWithWhite = (color: string) => {
  const { hue, saturation, lightness } = parseHsl(color);
  const toLinear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  const [red, green, blue] = hslToRgb(hue, saturation, lightness).map(toLinear);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return 1.05 / (luminance + 0.05);
};

describe("seededColor", () => {
  it("returns the same colour for the same seed", () => {
    expect(seededColor("some-cluster-local")).toBe(seededColor("some-cluster-local"));
  });

  it("returns different colours for different seeds", () => {
    expect(seededColor("some-cluster-local")).not.toBe(seededColor("other-cluster-local"));
  });

  it("handles an empty seed", () => {
    expect(() => parseHsl(seededColor(""))).not.toThrow();
  });

  it("spreads seeds across the hue circle", () => {
    const hues = new Set(
      Array.from({ length: 500 }, (_, index) => parseHsl(seededColor(`cluster-${index}-local`)).hue),
    );

    // A hash that clustered, or ignored part of the input, would land on far
    // fewer than this
    expect(hues.size).toBeGreaterThan(200);
  });

  it("is legible under white text at every hue it can produce", () => {
    // This is the guarantee randomcolor's luminosity:"dark" did not give: it
    // picks a brightness band relative to the hue, so 40% of its output fell
    // below AA, the worst at 1.40:1
    const worst = Math.min(...Array.from({ length: 360 }, (_, hue) => contrastWithWhite(`hsl(${hue}, 60%, 27%)`)));

    expect(worst).toBeGreaterThanOrEqual(4.5);
  });
});
