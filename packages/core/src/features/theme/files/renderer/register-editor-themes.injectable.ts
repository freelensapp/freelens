/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { beforeFrameStartsSecondInjectionToken } from "../../../../renderer/before-frame-starts/tokens";
import addNewMonacoThemeInjectable from "../../../../renderer/monaco/add-new-theme.injectable";
import { defaultTheme } from "../common/builtin-theme";
import { getAvailableVariants, getMonacoThemeName, getMonacoTokenRules, resolveEditorTheme } from "../common/resolve";
import availableThemesInjectable from "./available-themes.injectable";
import initializeImportedThemesInjectable from "./initialize.injectable";

import type { MonacoThemeData } from "../../../../renderer/components/monaco-editor";
import type { ThemeFile, ThemeVariantName } from "../common/schema";

/**
 * The editor theme of a variant as Monaco takes it, built anew, as Monaco keeps what it is given.
 */
const toMonacoThemeData = (name: string, theme: ThemeFile, variant: ThemeVariantName): MonacoThemeData => {
  const { base, inherit, colors, tokens } = resolveEditorTheme(theme, variant, defaultTheme);

  return { name, base, inherit, colors, rules: getMonacoTokenRules(tokens) };
};

/**
 * The name the dark editor theme of the default theme had when it was code, which extensions may
 * still pass to the editor.
 */
export const legacyDarkEditorThemeName = "clouds-midnight";

/**
 * Registers the editor theme of every variant of every theme in Monaco, under the name the active
 * theme gives as `monacoTheme`, and again whenever the themes change.
 */
const registerEditorThemesInjectable = getInjectable({
  id: "register-editor-themes",
  instantiate: (di) => ({
    run: () => {
      const availableThemes = di.inject(availableThemesInjectable);
      const addNewMonacoTheme = di.inject(addNewMonacoThemeInjectable);

      reaction(
        () => availableThemes.get(),
        (themes) => {
          for (const { theme } of themes) {
            for (const variant of getAvailableVariants(theme)) {
              addNewMonacoTheme(toMonacoThemeData(getMonacoThemeName(theme.metadata.name, variant), theme, variant));
            }
          }
        },
        { fireImmediately: true },
      );

      addNewMonacoTheme(toMonacoThemeData(legacyDarkEditorThemeName, defaultTheme, "dark"));
    },
    runAfter: initializeImportedThemesInjectable,
  }),
  injectionToken: beforeFrameStartsSecondInjectionToken,
});

export default registerEditorThemesInjectable;
