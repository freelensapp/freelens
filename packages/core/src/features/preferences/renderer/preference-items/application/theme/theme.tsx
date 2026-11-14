/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { showErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import { useRef, useState } from "react";
import { defaultColorThemePreference } from "../../../../../../common/vars";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import activeThemeInjectable from "../../../../../../renderer/themes/active.injectable";
import allLensThemesInjectable from "../../../../../../renderer/themes/all-themes.injectable";
import { toCustomThemeDefinition, unknownTokensOf } from "../../../../../../renderer/themes/prolens/custom-themes";
import { proLensThemes, systemThemeNames } from "../../../../../../renderer/themes/prolens/palettes";
import {
  defaultAppearancePreferences,
  isHexColor,
  maxUiFontSize,
  minUiFontSize,
  normalizeAppearancePreferences,
  parseCustomThemeDefinition,
} from "../../../../../theme/customization/common/appearance";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import styles from "./theme.module.scss";
import { SystemThemePreview, ThemePreview } from "./theme-preview";

import type { ShowNotification } from "@freelensapp/notifications";

import type { IComputedValue } from "mobx";
import type { ReadonlyDeep } from "type-fest";

import type { ThemeWithOrigin } from "../../../../../../renderer/themes/all-themes.injectable";
import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type { AppearancePreferences, UiDensity } from "../../../../../theme/customization/common/appearance";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";

interface Dependencies {
  state: UserPreferencesState;
  themes: IComputedValue<Map<string, ThemeWithOrigin>>;
  activeTheme: IComputedValue<ReadonlyDeep<LensTheme>>;
  showErrorNotification: ShowNotification;
  showSuccessNotification: ShowNotification;
}

const accentPresets = ["#4c8dff", "#2563eb", "#8b5cf6", "#d946ef", "#10b981", "#f59e0b", "#ef4444", "#14b8a6"];

const downloadJson = (fileName: string, value: unknown) => {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

/**
 * The ProLens themes in the order they were designed in, then the classic
 * Freelens themes and the user's own, by name.
 */
const sortThemes = (themes: ThemeWithOrigin[]) => {
  const preferred = Object.values(proLensThemes).map((theme) => theme.name);
  const rank = ({ theme, isCustom }: ThemeWithOrigin) => {
    const index = preferred.indexOf(theme.name);

    return index >= 0 ? index : preferred.length + (isCustom ? 1 : 0);
  };

  return [...themes].sort((left, right) => rank(left) - rank(right) || left.theme.name.localeCompare(right.theme.name));
};

const fileNameFor = (themeName: string) =>
  `${
    themeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "theme"
  }.prolens-theme.json`;

const NonInjectedTheme = observer(
  ({ state, themes, activeTheme, showErrorNotification, showSuccessNotification }: Dependencies) => {
    const fileInput = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string>();
    const allThemes = themes.get();
    const appearance = normalizeAppearancePreferences(state.appearance);
    const darkSystemTheme = allThemes.get(systemThemeNames.dark)?.theme;
    const lightSystemTheme = allThemes.get(systemThemeNames.light)?.theme;
    const customThemes = [...allThemes.values()].filter(({ isCustom }) => isCustom).map(({ theme }) => theme);

    const setAppearance = (update: Partial<AppearancePreferences>) =>
      runInAction(() => {
        state.appearance = normalizeAppearancePreferences({ ...appearance, ...update });
      });

    const selectTheme = (name: string) =>
      runInAction(() => {
        state.colorTheme = name;
      });

    const importTheme = async (file: File | undefined) => {
      setImportError(undefined);

      if (!file) return;

      const result = parseCustomThemeDefinition(await file.text());

      if (!result.callWasSuccessful) {
        setImportError(result.error);

        return;
      }

      const definition = result.response;
      const existing = allThemes.get(definition.name);

      if (existing && !existing.isCustom) {
        setImportError(`"${definition.name}" is the name of a built-in theme. Rename the theme in the file.`);

        return;
      }

      const unknown = activeTheme ? unknownTokensOf(definition, activeTheme.get()) : [];

      runInAction(() => {
        state.customThemes = [...state.customThemes.filter((theme) => theme.name !== definition.name), definition];
        state.colorTheme = definition.name;
      });

      showSuccessNotification(
        unknown.length
          ? `Imported "${definition.name}". Ignored unknown tokens: ${unknown.slice(0, 5).join(", ")}${unknown.length > 5 ? "…" : ""}`
          : `Imported and applied "${definition.name}".`,
      );
    };

    const removeTheme = (name: string) =>
      runInAction(() => {
        state.customThemes = state.customThemes.filter((theme) => theme.name !== name);

        if (state.colorTheme === name) {
          state.colorTheme = defaultColorThemePreference;
        }

        if (state.terminalTheme === name) {
          state.terminalTheme = "";
        }
      });

    const exportActive = () => {
      try {
        const theme = activeTheme.get();
        const custom = state.customThemes.find((definition) => definition.name === theme.name);

        downloadJson(fileNameFor(theme.name), custom ?? toCustomThemeDefinition(theme, `${theme.name} (custom)`));
      } catch (error) {
        showErrorNotification(`Could not export the theme: ${String(error)}`);
      }
    };

    const renderCard = (key: string, label: string, description: string, preview: React.ReactNode, tag?: string) => (
      <button
        key={key}
        type="button"
        role="radio"
        aria-checked={state.colorTheme === key}
        className={styles.card}
        onClick={() => selectTheme(key)}
        data-testid={`theme-card-${key}`}
      >
        {preview}
        {tag && <span className={styles.tag}>{tag}</span>}
        <span className={styles.meta}>
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
      </button>
    );

    return (
      <section id="appearance">
        <SubTitle title="Theme" />
        <div className={styles.gallery} role="radiogroup" aria-label="Theme">
          {darkSystemTheme &&
            lightSystemTheme &&
            renderCard(
              defaultColorThemePreference,
              "System",
              "Follows your computer's light or dark mode",
              <SystemThemePreview dark={darkSystemTheme} light={lightSystemTheme} />,
            )}
          {sortThemes([...allThemes.values()]).map(({ theme, isCustom }) =>
            renderCard(
              theme.name,
              theme.name,
              theme.description,
              <ThemePreview theme={theme} />,
              isCustom ? "Custom" : undefined,
            ),
          )}
        </div>

        <div className={styles.settings}>
          <div className={styles.setting}>
            <span className={styles.settingLabel}>Accent color</span>
            <div className={styles.swatches}>
              <button
                type="button"
                className={styles.textButton}
                aria-pressed={!appearance.accentColor}
                onClick={() => setAppearance({ accentColor: undefined })}
                data-testid="accent-theme-default"
              >
                Theme default
              </button>
              {accentPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={styles.swatch}
                  style={{ background: color }}
                  aria-pressed={appearance.accentColor === color}
                  aria-label={`Accent ${color}`}
                  onClick={() => setAppearance({ accentColor: color })}
                />
              ))}
              <input
                type="color"
                className={styles.colorInput}
                aria-label="Custom accent color"
                value={appearance.accentColor ?? activeTheme.get().colors.primary.slice(0, 7)}
                onChange={(event) =>
                  isHexColor(event.target.value) && setAppearance({ accentColor: event.target.value })
                }
                data-testid="accent-color-input"
              />
            </div>
          </div>

          <div className={styles.setting}>
            <span className={styles.settingLabel}>Density</span>
            <div className={styles.segmented} role="group" aria-label="Density">
              {(["comfortable", "compact"] as UiDensity[]).map((density) => (
                <button
                  key={density}
                  type="button"
                  aria-pressed={appearance.density === density}
                  onClick={() => setAppearance({ density })}
                  data-testid={`density-${density}`}
                >
                  {density === "compact" ? "Compact" : "Comfortable"}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.setting}>
            <label htmlFor="ui-font-size">Font size</label>
            <input
              id="ui-font-size"
              type="range"
              className={styles.range}
              min={minUiFontSize}
              max={maxUiFontSize}
              step={1}
              value={appearance.fontSize}
              onChange={(event) => setAppearance({ fontSize: Number(event.target.value) })}
              data-testid="ui-font-size"
            />
            <span>{appearance.fontSize}px</span>
            {appearance.fontSize !== defaultAppearancePreferences.fontSize && (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => setAppearance({ fontSize: defaultAppearancePreferences.fontSize })}
              >
                Reset
              </button>
            )}
          </div>

          <div className={styles.setting}>
            <span className={styles.settingLabel}>Custom themes</span>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => fileInput.current?.click()}
              data-testid="import-theme"
            >
              Import…
            </button>
            <button type="button" className={styles.textButton} onClick={exportActive} data-testid="export-theme">
              Export current theme
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => {
                void importTheme(event.target.files?.[0]);
                event.target.value = "";
              }}
              data-testid="import-theme-file"
            />
            {importError && (
              <span className={styles.error} role="alert">
                {importError}
              </span>
            )}
            {customThemes.length > 0 && (
              <div className={styles.customList}>
                {customThemes.map((theme) => (
                  <div key={theme.name} className={styles.customItem}>
                    <span>{theme.name}</span>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => {
                        const definition = state.customThemes.find((custom) => custom.name === theme.name);

                        downloadJson(fileNameFor(theme.name), definition);
                      }}
                    >
                      Export
                    </button>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => removeTheme(theme.name)}
                      data-testid={`remove-theme-${theme.name}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <span className={styles.hint}>
              A theme file is JSON with <code>name</code>, <code>type</code> (dark or light), an optional{" "}
              <code>extends</code> (a built-in theme name) and the <code>colors</code> and <code>terminalColors</code>{" "}
              it overrides. Export a theme to get a complete starting point.
            </span>
          </div>
        </div>
      </section>
    );
  },
);

export const Theme = withInjectables<Dependencies>(NonInjectedTheme, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    themes: di.inject(allLensThemesInjectable),
    activeTheme: di.inject(activeThemeInjectable),
    showErrorNotification: di.inject(showErrorNotificationInjectable),
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
  }),
});
