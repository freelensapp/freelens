/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./logs-dialog.scss";

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import { showCheckedErrorNotificationInjectable, showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { kebabCase } from "es-toolkit";
import { Dialog } from "../dialog";
import { Wizard, WizardStep } from "../wizard";

import type { ShowCheckedErrorNotification, ShowNotification } from "@freelensapp/notifications";

import type { DialogProps } from "../dialog";

export interface LogsDialogProps extends DialogProps {
  title: string;
  logs: string;
}

interface Dependencies {
  showSuccessNotification: ShowNotification;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

const NonInjectedLogsDialog = (props: LogsDialogProps & Dependencies) => {
  const { title, logs, showSuccessNotification, showCheckedErrorNotification, ...dialogProps } = props;

  return (
    <Dialog {...dialogProps} className="LogsDialog" data-testid={`logs-dialog-for-${kebabCase(title)}`}>
      <Wizard header={<h5>{title}</h5>} done={dialogProps.close}>
        <WizardStep
          scrollable={false}
          customButtons={
            <div className="buttons flex gap-2 items-center justify-between">
              <Button
                plain
                onClick={() => {
                  navigator.clipboard.writeText(logs).then(
                    () => showSuccessNotification(`Logs copied to clipboard.`),
                    (error) => showCheckedErrorNotification(error, "Failed to copy logs to clipboard"),
                  );
                }}
              >
                <Icon material="assignment" />
                {" Copy to clipboard"}
              </Button>
              <Button plain onClick={dialogProps.close}>
                Close
              </Button>
            </div>
          }
        >
          <code className="block">{logs || "There are no logs available."}</code>
        </WizardStep>
      </Wizard>
    </Dialog>
  );
};

export const LogsDialog = withInjectables<Dependencies, LogsDialogProps>(NonInjectedLogsDialog, {
  getProps: (di, props) => ({
    ...props,
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
    showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
  }),
});
