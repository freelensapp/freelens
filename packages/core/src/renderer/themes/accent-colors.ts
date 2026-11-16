/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// =============================================================================
// Accent color guidelines
// =============================================================================
// When adding a NEW option to `accentColorOptions`, make sure the candidate
// color does NOT match (or sit too close to) any of the theme's semantic /
// status colors below. Reusing or approximating these values would cause the
// accent to visually collide with status indicators (success, warning, error,
// badges, etc.) and confuse users.
//
// Reserved semantic colors (do NOT use as accent options):
//
//   Status / signal colors
//     colorSuccess              #43a047  (dark)   #206923  (light)
//     colorOk                   #4caf50  (dark)   #399c3d  (light)
//     colorError                #ce3933
//     colorSoftError            #e85555
//     colorWarning              #ff9800
//     buttonAccentBackground    #e85555
//
//   Decorative / palette colors with semantic meaning in the UI
//     golden                    #ffc63d
//     badgeBackgroundColor      #ffba44
//     helmIncubatorRepo         #ff7043
//     magenta                   #c93dce  (dark)   #c100cd  (light)
//
// Forbidden hue ranges as a quick visual reference:
//   - Reds       (0°–10°)    -> error / soft-error / button-accent
//   - Oranges    (15°–30°)   -> warning / helm incubator
//   - Yellows    (40°–55°)   -> golden / badge
//   - Greens     (90°–140°)  -> success / ok
//
// Safe hue zone for accents (cool half of the color wheel):
//   cyan -> sky -> blue -> indigo -> violet -> purple -> pink
//
// Every option must reach the WCAG AA contrast of 4.5:1 with white or with
// dark text (#1e2124), because the text on an accent background takes
// whichever of the two reads better (see getTextColorOnAccent). A test checks
// it for every option.
//
// Rule of thumb: pick saturated tones that read clearly against both the dark
// theme backgrounds (mainBackground #1e2124, layoutBackground #2e3136,
// sidebarBackground #36393e) and the light theme backgrounds. Avoid shades
// within ~15° of any reserved hue and keep enough lightness/saturation
// distance from existing accent options so the swatches remain easy to tell
// apart in the picker.
// =============================================================================

export interface AccentColorOption {
  value: string;
  label: string;
}

export const accentColorOptions: AccentColorOption[] = [
  { value: "#00a7a0", label: "Teal" },
  { value: "#00bcd4", label: "Cyan" },
  { value: "#29b6f6", label: "Sky" },
  { value: "#2196f3", label: "Blue" },
  { value: "#5c6bc0", label: "Indigo" },
  { value: "#7c4dff", label: "Violet" },
  { value: "#9c27b0", label: "Purple" },
  { value: "#b39ddb", label: "Lavender" },
  { value: "#d81b60", label: "Pink" },
  { value: "#f06292", label: "Rose" },
];

const textColorsOnAccent = ["#ffffff", "#1e2124"] as const;

const parseHexColor = (color: string): [number, number, number] | undefined => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);

  if (!match) {
    return undefined;
  }

  const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];

  return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16)) as [number, number, number];
};

const getRelativeLuminance = ([red, green, blue]: [number, number, number]) => {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * The contrast ratio of two hex colors, as WCAG defines it, or `undefined` when either is not a
 * `#rgb` or `#rrggbb` color.
 */
export const getContrastRatio = (first: string, second: string): number | undefined => {
  const firstRgb = parseHexColor(first);
  const secondRgb = parseHexColor(second);

  if (!firstRgb || !secondRgb) {
    return undefined;
  }

  const [lighter, darker] = [getRelativeLuminance(firstRgb), getRelativeLuminance(secondRgb)].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * White or dark text, whichever contrasts better with the accent. Falls back to white for a value
 * that is not a hex color, such as one edited by hand in the preferences file.
 */
export const getTextColorOnAccent = (accentColor: string): string => {
  const [white, dark] = textColorsOnAccent;
  const onWhite = getContrastRatio(accentColor, white);
  const onDark = getContrastRatio(accentColor, dark);

  if (onWhite === undefined || onDark === undefined) {
    return white;
  }

  return onDark > onWhite ? dark : white;
};
