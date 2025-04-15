/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./logs-dialog.scss";

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import type { ShowNotification } from "@freelensapp/notifications";
import { showSuccessNotificationInjectable } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { clipboard } from "electron";
import { kebabCase } from "lodash/fp";
import React from "react";
import type { DialogProps } from "../dialog";
import { Dialog } from "../dialog";
import { Wizard, WizardStep } from "../wizard";

export interface LogsDialogProps extends DialogProps {
  title: string;
  logs: string;
}

interface Dependencies {
  showSuccessNotification: ShowNotification;
}

const NonInjectedLogsDialog = (props: LogsDialogProps & Dependencies) => {
  const { title, logs, showSuccessNotification, ...dialogProps } = props;

  return (
    <Dialog {...dialogProps} className="LogsDialog" data-testid={`logs-dialog-for-${kebabCase(title)}`}>
      <Wizard header={<h5>{title}</h5>} done={dialogProps.close}>
        <WizardStep
          scrollable={false}
          customButtons={
            <div className="buttons flex gaps align-center justify-space-between">
              <Button
                plain
                onClick={() => {
                  clipboard.writeText(logs);
                  showSuccessNotification(`Logs copied to clipboard.`);
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
  }),
});
