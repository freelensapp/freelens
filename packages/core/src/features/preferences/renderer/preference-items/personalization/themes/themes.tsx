/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { showErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { action } from "mobx";
import { observer } from "mobx-react";
import { useState } from "react";
import openConfirmDialogInjectable from "../../../../../../renderer/components/confirm-dialog/open.injectable";
import { SubTitle } from "../../../../../../renderer/components/layout/sub-title";
import { defaultThemeName } from "../../../../../theme/files/common/builtin-theme";
import { getAvailableVariants } from "../../../../../theme/files/common/resolve";
import availableThemesInjectable from "../../../../../theme/files/renderer/available-themes.injectable";
import findThemeInjectable from "../../../../../theme/files/renderer/find-theme.injectable";
import importedThemesStateInjectable from "../../../../../theme/files/renderer/imported-themes-state.injectable";
import themeActionsInjectable from "../../../../../theme/files/renderer/request-theme-actions.injectable";
import resolveThemeInjectable from "../../../../../theme/files/renderer/resolve-theme.injectable";
import userPreferencesStateInjectable from "../../../../../user-preferences/common/state.injectable";
import { ImportThemeDialog } from "./import-theme-dialog";
import styles from "./themes.module.scss";

import type { ShowNotification } from "@freelensapp/notifications";

import type { IComputedValue, IObservableValue } from "mobx";

import type { OpenConfirmDialog } from "../../../../../../renderer/components/confirm-dialog/open.injectable";
import type { LensTheme } from "../../../../../../renderer/themes/lens-theme";
import type {
  ImportedThemesState,
  ImportThemeRequest,
  ThemeImportConflict,
} from "../../../../../theme/files/common/channels";
import type { AvailableTheme } from "../../../../../theme/files/renderer/available-themes.injectable";
import type { FindTheme } from "../../../../../theme/files/renderer/find-theme.injectable";
import type { ThemeActions } from "../../../../../theme/files/renderer/request-theme-actions.injectable";
import type { ResolveTheme } from "../../../../../theme/files/renderer/resolve-theme.injectable";
import type { UserPreferencesState } from "../../../../../user-preferences/common/state.injectable";
import type { ImportThemeOutcome } from "./import-theme-dialog";

interface Dependencies {
  state: UserPreferencesState;
  availableThemes: IComputedValue<AvailableTheme[]>;
  importedThemes: IObservableValue<ImportedThemesState>;
  findTheme: FindTheme;
  resolveTheme: ResolveTheme;
  themeActions: ThemeActions;
  openConfirmDialog: OpenConfirmDialog;
  showErrorNotification: ShowNotification;
  showSuccessNotification: ShowNotification;
}

/**
 * A small picture of the application, drawn in the colors of a theme variant.
 */
const ThemePreview = ({ theme }: { theme: LensTheme }) => {
  const { colors } = theme;

  return (
    <div
      className={styles.preview}
      style={{ background: colors.mainBackground }}
      data-testid={`theme-preview-${theme.name}-${theme.type}`}
      aria-hidden
    >
      <div className={styles.previewSidebar} style={{ background: colors.sidebarBackground }}>
        <div className={styles.previewLine} style={{ background: colors.primary }} />
        <div className={styles.previewLine} style={{ background: colors.textColorPrimary }} />
        <div className={styles.previewLine} style={{ background: colors.textColorPrimary }} />
      </div>
      <div className={styles.previewContent} style={{ background: colors.contentColor }}>
        <div className={styles.previewLine} style={{ background: colors.textColorAccent }} />
        <div className={styles.previewLine} style={{ background: colors.textColorSecondary }} />
        <div className={styles.previewButton} style={{ background: colors.buttonPrimaryBackground }} />
      </div>
    </div>
  );
};

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * One thing an import replaces, as the question before the import names it.
 */
const ImportConflictDescription = ({ conflict }: { conflict: ThemeImportConflict }) => {
  switch (conflict.kind) {
    case "same-name":
      return (
        <>
          the imported theme of the same name, <b>{conflict.displayName}</b>, in <code>{conflict.fileName}</code>
        </>
      );
    case "other-theme":
      return (
        <>
          <code>{conflict.fileName}</code>, which holds another theme, <b>{conflict.displayName}</b> (
          <code>{conflict.name}</code>)
        </>
      );
    case "invalid-file":
      return (
        <>
          <code>{conflict.fileName}</code>, which is not a valid theme: {conflict.error}
        </>
      );
  }
};

const NonInjectedThemes = observer(
  ({
    state,
    availableThemes,
    importedThemes,
    findTheme,
    resolveTheme,
    themeActions,
    openConfirmDialog,
    showErrorNotification,
    showSuccessNotification,
  }: Dependencies) => {
    const selectedName = findTheme(state.theme).metadata.name;
    const { invalidFiles } = importedThemes.get();

    const [isImportDialogOpen, setImportDialogOpen] = useState(false);

    /**
     * Carries out an import request. An error that keeps the theme out is left to the import
     * dialog to show, which stays open so that the URL can be corrected; the dialog closes once
     * the theme is imported, or a question about it is asked.
     */
    const importTheme = async (request: ImportThemeRequest): Promise<ImportThemeOutcome> => {
      try {
        const response = await themeActions.importTheme(request);

        switch (response.status) {
          case "canceled":
            return { close: false };
          case "invalid":
            return {
              close: false,
              error: (
                <>
                  <b>The theme cannot be imported from {response.source}</b>
                  <pre className="whitespace-pre-wrap">{response.error}</pre>
                </>
              ),
            };
          case "conflict": {
            const { importId } = response;

            openConfirmDialog({
              labelOk: "Replace",
              message: (
                <div data-testid="theme-import-conflict">
                  <p>
                    Importing <b>{response.displayName}</b> replaces:
                  </p>
                  <ul>
                    {response.conflicts.map((conflict) => (
                      <li key={`${conflict.kind}-${conflict.fileName}`}>
                        <ImportConflictDescription conflict={conflict} />
                      </li>
                    ))}
                  </ul>
                  <p>Replace?</p>
                </div>
              ),
              ok: () => answerConflict({ action: "replace", importId }),
              cancel: () => themeActions.importTheme({ action: "cancel", importId }).catch(() => undefined),
            });

            return { close: true };
          }
          case "expired":
            showErrorNotification("The import is no longer pending: import the theme again");

            return { close: true };
          case "imported":
            showSuccessNotification(
              <div>
                <p>
                  Imported the theme <b>{response.displayName}</b>.
                </p>
                {response.unknownTokens.length > 0 && (
                  <p>Ignored the tokens this version does not know: {response.unknownTokens.join(", ")}</p>
                )}
              </div>,
            );

            return { close: true };
        }
      } catch (error) {
        return { close: false, error: `Failed to import the theme: ${describeError(error)}` };
      }
    };

    /**
     * Answers the question about a conflict, once the import dialog has closed: an error is
     * shown as a notification instead.
     */
    const answerConflict = async (request: ImportThemeRequest) => {
      const outcome = await importTheme(request);

      if (!outcome.close && outcome.error) {
        showErrorNotification(<div>{outcome.error}</div>);
      }
    };

    const exportTheme = async (name: string) => {
      try {
        const response = await themeActions.exportTheme(name);

        if (response.status === "exported") {
          showSuccessNotification(`Exported the theme to ${response.filePath}`);
        } else if (response.status === "invalid") {
          showErrorNotification(`Failed to export the theme: ${response.error}`);
        }
      } catch (error) {
        showErrorNotification(`Failed to export the theme: ${describeError(error)}`);
      }
    };

    const removeTheme = ({ theme }: AvailableTheme) =>
      openConfirmDialog({
        labelOk: "Remove",
        message: (
          <p>
            Remove the theme <b>{theme.spec.displayName}</b>? Its file is deleted from the themes directory.
          </p>
        ),
        ok: async () => {
          const { name } = theme.metadata;

          try {
            const response = await themeActions.removeTheme(name);

            if (response.status === "invalid") {
              showErrorNotification(`Failed to remove the theme: ${response.error}`);

              return;
            }
          } catch (error) {
            showErrorNotification(`Failed to remove the theme: ${describeError(error)}`);

            return;
          }

          action(() => {
            if (state.theme === name) {
              state.theme = defaultThemeName;
            }

            if (state.terminalTheme === name) {
              state.terminalTheme = "";
            }
          })();
        },
      });

    return (
      <section id="themes">
        <SubTitle title="Theme" />
        <div className={styles.gallery} role="list">
          {availableThemes.get().map((available) => {
            const { theme, isBuiltIn } = available;
            const { name } = theme.metadata;
            const isSelected = name === selectedName;

            return (
              <div
                key={name}
                role="listitem"
                className={cssNames(styles.card, { [styles.selected]: isSelected })}
                data-testid={`theme-card-${name}`}
              >
                <button
                  type="button"
                  className={styles.select}
                  aria-pressed={isSelected}
                  onClick={() => (state.theme = name)}
                  data-testid={`theme-select-${name}`}
                >
                  <div className={styles.previews}>
                    {getAvailableVariants(theme).map((variant) => (
                      <ThemePreview key={variant} theme={resolveTheme(theme, variant)} />
                    ))}
                  </div>
                  <div className={styles.name}>
                    {theme.spec.displayName}
                    {!isBuiltIn && <span className={styles.badge}>Imported</span>}
                  </div>
                  {(theme.spec.description || theme.spec.author) && (
                    <div className={styles.details}>
                      {[theme.spec.description, theme.spec.author && `by ${theme.spec.author}`]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </button>
                <div className={styles.actions}>
                  <Button
                    plain
                    label="Export"
                    onClick={() => void exportTheme(name)}
                    data-testid={`theme-export-${name}`}
                  />
                  {!isBuiltIn && (
                    <Button
                      plain
                      label="Remove"
                      onClick={() => removeTheme(available)}
                      data-testid={`theme-remove-${name}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <Button
            primary
            label="Import theme..."
            onClick={() => setImportDialogOpen(true)}
            data-testid="theme-import"
          />
        </div>
        <ImportThemeDialog
          isOpen={isImportDialogOpen}
          close={() => setImportDialogOpen(false)}
          importTheme={importTheme}
        />
        {invalidFiles.length > 0 && (
          <div className="mt-3" data-testid="invalid-theme-files">
            <SubTitle title="Files not applied" />
            {invalidFiles.map(({ fileName, error }) => (
              <div key={fileName} className={styles.invalidFile}>
                <b>{fileName}</b>
                <pre>{error}</pre>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  },
);

export const Themes = withInjectables<Dependencies>(NonInjectedThemes, {
  getProps: (di) => ({
    state: di.inject(userPreferencesStateInjectable),
    availableThemes: di.inject(availableThemesInjectable),
    importedThemes: di.inject(importedThemesStateInjectable),
    findTheme: di.inject(findThemeInjectable),
    resolveTheme: di.inject(resolveThemeInjectable),
    themeActions: di.inject(themeActionsInjectable),
    openConfirmDialog: di.inject(openConfirmDialogInjectable),
    showErrorNotification: di.inject(showErrorNotificationInjectable),
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
  }),
});
