/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

module.exports = {
  content: ["src/**/*.tsx"],
  // No `darkMode` here on purpose. The theme system does not toggle a `.dark`
  // class; it toggles `body.theme-light` (dark is the default, light adds the
  // class — see themes/apply-lens-theme.injectable.ts). The `dark:` variant is
  // wired to that real selector via `@custom-variant` in
  // renderer/components/app.scss. A `darkMode: "class"` here would generate a
  // `dark:` variant matching a `.dark` class that never exists, so it is
  // omitted. Prefer `var(--…)` theme tokens over `dark:` — they re-theme
  // automatically.
  theme: {
    fontFamily: {
      sans: ["Roboto", "Helvetica", "Arial", "sans-serif"],
    },
    extend: {
      colors: {
        textAccent: "var(--textColorAccent)",
        textPrimary: "var(--textColorPrimary)",
        textTertiary: "var(--textColorTertiary)",
        textDimmed: "var(--textColorDimmed)",

        accentColor: "var(--accentColor)",
        backgroundColor: "var(--backgroundColor)",
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
