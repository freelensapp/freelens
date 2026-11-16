/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Select } from "../../../../../../renderer/components/select";
import { accentColorOptions, DEFAULT_ACCENT_COLOR } from "../../../../../../renderer/themes/accent-colors";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./accent-color.module.scss";

import type { AccentColorOption } from "../../../../../../renderer/themes/accent-colors";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const ColorOption = ({ option }: { option: AccentColorOption }) => (
  <div className={styles.colorOption}>
    <div className={styles.colorSwatch} style={{ backgroundColor: option.value }} />
    <span>{option.label}</span>
  </div>
);

const NonInjectedAccentColor = observer(({ state }: Dependencies) => (
  <section id="accent-color">
    <SubTitle title="Accent color" />
    <div className={styles.accentRow}>
      <div className={styles.accentColumn}>
        <span>Dark</span>
        <Select
          id="accent-color-dark-input"
          aria-label="Accent color of the dark theme"
          options={accentColorOptions}
          value={state.accentColorDark || DEFAULT_ACCENT_COLOR}
          onChange={(value) => (state.accentColorDark = value?.value)}
          formatOptionLabel={(option) => <ColorOption option={option} />}
          themeName="lens"
        />
      </div>
      <div className={styles.accentColumn}>
        <span>Light</span>
        <Select
          id="accent-color-light-input"
          aria-label="Accent color of the light theme"
          options={accentColorOptions}
          value={state.accentColorLight || DEFAULT_ACCENT_COLOR}
          onChange={(value) => (state.accentColorLight = value?.value)}
          formatOptionLabel={(option) => <ColorOption option={option} />}
          themeName="lens"
        />
      </div>
    </div>
  </section>
));

export const AccentColor = withInjectables<Dependencies>(NonInjectedAccentColor, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
