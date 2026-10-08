/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { Button } from "@freelensapp/button";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";

import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
    state: UserPreferencesState;
}

const NonInjectedAccentColor = observer(({ state }: Dependencies) => {
    const currentColor = state.accentColor || "#00a7a0";

    return (
        <section id="accent-color">
            <SubTitle title="Accent Color" />
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                    type="color"
                    id="accent-color-input"
                    value={currentColor}
                    onChange={(e) => (state.accentColor = e.target.value)}
                    style={{
                        width: "40px",
                        height: "40px",
                        padding: "2px",
                        border: "1px solid var(--borderColor)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        backgroundColor: "transparent",
                    }}
                />
                <span style={{ color: "var(--textColorPrimary)", fontSize: "13px" }}>
                    {currentColor.toUpperCase()}
                </span>
                {state.accentColor && (
                    <Button
                        plain
                        label="Reset to Default"
                        onClick={() => (state.accentColor = undefined)}
                        style={{ marginLeft: "8px" }}
                    />
                )}
            </div>
        </section>
    );
});

export const AccentColor = withInjectables<Dependencies>(NonInjectedAccentColor, {
    getProps: (di) => ({
        state: di.inject(userPreferencesStateInjectable),
    }),
});
