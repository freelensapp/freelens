/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./theme.module.scss";

import type { ReadonlyDeep } from "type-fest";

import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";

const Miniature = ({ theme }: { theme: ReadonlyDeep<LensTheme> }) => {
  const { colors } = theme;

  return (
    <>
      <div className={styles.nav} style={{ background: colors.sidebarBackground }}>
        <div className={styles.navItem} style={{ background: colors.primary, width: "80%" }} />
        <div className={styles.navItem} style={{ background: colors.textColorTertiary, width: "60%", opacity: 0.6 }} />
        <div className={styles.navItem} style={{ background: colors.textColorTertiary, width: "70%", opacity: 0.6 }} />
      </div>
      <div className={styles.main} style={{ background: colors.mainBackground }}>
        <div className={styles.bar} style={{ background: colors.tableHeaderBackground ?? colors.contentColor }}>
          <div className={styles.pill} style={{ background: colors.buttonPrimaryBackground }} />
        </div>
        <div className={styles.lines}>
          <div className={styles.line} style={{ background: colors.textColorAccent, width: "70%" }} />
          <div className={styles.line} style={{ background: colors.textColorPrimary, width: "90%", opacity: 0.7 }} />
          <div className={styles.line} style={{ background: colors.colorSuccess, width: "40%" }} />
          <div className={styles.line} style={{ background: colors.colorError, width: "55%" }} />
        </div>
      </div>
    </>
  );
};

/**
 * A miniature of the application drawn with a theme's own colours, so it
 * previews the theme without applying it.
 */
export const ThemePreview = ({ theme }: { theme: ReadonlyDeep<LensTheme> }) => (
  <div className={styles.preview} aria-hidden="true">
    <Miniature theme={theme} />
  </div>
);

/**
 * Two miniatures side by side, for "Sync with computer".
 */
export const SystemThemePreview = ({
  dark,
  light,
}: {
  dark: ReadonlyDeep<LensTheme>;
  light: ReadonlyDeep<LensTheme>;
}) => (
  <div className={styles.previewSplit} aria-hidden="true">
    <div>
      <Miniature theme={light} />
    </div>
    <div>
      <Miniature theme={dark} />
    </div>
  </div>
);
