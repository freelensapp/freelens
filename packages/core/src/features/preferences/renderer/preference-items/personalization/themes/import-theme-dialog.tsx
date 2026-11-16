/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Icon } from "@freelensapp/icon";
import { prevDefault } from "@freelensapp/utilities";
import { useRef, useState } from "react";
import { Dialog } from "../../../../../../renderer/components/dialog";
import { Input, InputValidators, inputValidator } from "../../../../../../renderer/components/input";
import { Wizard, WizardStep } from "../../../../../../renderer/components/wizard";
import { getThemeUrlError } from "../../../../../theme/files/common/import-source";
import styles from "./themes.module.scss";

import type { StrictReactNode } from "@freelensapp/utilities";

import type { ImportThemeRequest } from "../../../../../theme/files/common/channels";

/**
 * What the dialog does once an import request is answered: close, or stay open, with the error
 * that kept the theme out when there is one.
 */
export type ImportThemeOutcome = { close: true } | { close: false; error?: StrictReactNode };

export interface ImportThemeDialogProps {
  isOpen: boolean;
  close: () => void;
  importTheme: (request: ImportThemeRequest) => Promise<ImportThemeOutcome>;
}

/**
 * The URL validator of the extension installer, narrowed to the schemes a theme is downloaded
 * over. The main process checks the URL again.
 */
const themeUrlValidator = inputValidator({
  message: "Enter an https: or http: URL",
  validate: (value, props) => InputValidators.isUrl.validate(value, props) && !getThemeUrlError(value),
});

/**
 * Imports a theme from the URL of a theme file, or from a file "Browse" chooses with the open
 * dialog of the main process. A file chosen there is imported straight away: its path never
 * reaches the renderer.
 */
export const ImportThemeDialog = ({ isOpen, close, importTheme }: ImportThemeDialogProps) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<StrictReactNode>();
  const [busy, setBusy] = useState(false);
  // Counts the attempts, so that the answer to one the dialog has moved past since, by closing or
  // by starting another, changes nothing in it.
  const attempt = useRef(0);

  const run = async (request: ImportThemeRequest) => {
    const current = ++attempt.current;

    setBusy(true);
    setError(undefined);

    try {
      const outcome = await importTheme(request);

      if (attempt.current !== current) {
        return;
      }

      if (outcome.close) {
        close();
      } else {
        setError(outcome.error);
      }
    } finally {
      if (attempt.current === current) {
        setBusy(false);
      }
    }
  };

  // An error is about the URL it was shown for, so it goes as soon as the URL changes.
  const changeUrl = (value: string) => {
    setUrl(value);
    setError(undefined);
  };

  const reset = () => {
    attempt.current++;
    setUrl("");
    setError(undefined);
    setBusy(false);
  };

  return (
    <Dialog isOpen={isOpen} close={close} onClose={reset} data-testid="theme-import-dialog">
      <Wizard header={<h5>Import a theme</h5>} done={close}>
        <WizardStep
          contentClass="flex flex-col gap-2"
          nextLabel="Import"
          next={() => run({ action: "url", url })}
          disabledNext={busy || !url}
          waiting={busy}
          testIdForNext="theme-import-submit"
          testIdForPrev="theme-import-cancel"
        >
          <Input
            autoFocus
            required
            disabled={busy}
            placeholder="URL of a theme file (.yaml, .yml, .json)"
            validators={url ? themeUrlValidator : undefined}
            value={url}
            onChange={changeUrl}
            data-testid="theme-import-url"
            iconRight={
              <Icon
                className={styles.importIcon}
                smallest
                material="folder_open"
                disabled={busy}
                onClick={prevDefault(() => {
                  if (!busy) {
                    void run({ action: "choose" });
                  }
                })}
                tooltip="Browse"
                data-testid="theme-import-browse"
              />
            }
          />
          {error && (
            <div className={styles.importError} role="alert" data-testid="theme-import-error">
              {error}
            </div>
          )}
        </WizardStep>
      </Wizard>
    </Dialog>
  );
};
