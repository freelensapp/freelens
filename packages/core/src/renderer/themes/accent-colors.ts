/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
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

export const DEFAULT_ACCENT_COLOR = "#00a7a0";

export const accentColorOptions: AccentColorOption[] = [
  { value: "#00a7a0", label: "Teal" },
  { value: "#00bcd4", label: "Cyan" },
  { value: "#29b6f6", label: "Sky" },
  { value: "#2196f3", label: "Blue" },
  { value: "#5c6bc0", label: "Indigo" },
  { value: "#7c4dff", label: "Violet" },
  { value: "#9c27b0", label: "Purple" },
  { value: "#b39ddb", label: "Lavender" },
  { value: "#e91e63", label: "Pink" },
  { value: "#f06292", label: "Rose" },
];
