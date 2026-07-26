/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
}

const NonInjectedCustomAccentColor = observer(({ state }: Dependencies) => (
  <section id="customAccentColor">
    <SubTitle title="Accent Color" />
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <input
        type="color"
        id="custom-accent-color-input"
        value={state.customAccentColor || "#00a7a0"}
        onChange={(e) => (state.customAccentColor = e.target.value)}
        style={{ width: "36px", height: "36px", border: "none", cursor: "pointer" }}
      />
      <input
        type="text"
        value={state.customAccentColor || ""}
        placeholder="e.g. #00a7a0"
        onChange={(e) => (state.customAccentColor = e.target.value)}
        style={{
          background: "var(--inputControlBackground)",
          color: "var(--textColorPrimary)",
          border: "1px solid var(--borderColor)",
          borderRadius: "4px",
          padding: "4px 8px",
          fontFamily: "monospace",
          width: "120px",
        }}
      />
      {state.customAccentColor && (
        <button
          type="button"
          onClick={() => (state.customAccentColor = "")}
          style={{
            background: "none",
            border: "1px solid var(--borderColor)",
            borderRadius: "4px",
            color: "var(--textColorSecondary)",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          Reset
        </button>
      )}
    </div>
    <small style={{ color: "var(--textColorDimmed)", display: "block", marginTop: "4px" }}>
      Override the accent color used for buttons, links, and highlights. Leave empty to use the
      theme default.
    </small>
  </section>
));

export const CustomAccentColor = withInjectables<Dependencies>(NonInjectedCustomAccentColor, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
  }),
});
