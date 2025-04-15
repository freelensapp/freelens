/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import type { ShowNotification } from "@freelensapp/notifications";
import { showSuccessNotificationInjectable } from "@freelensapp/notifications";
import type { StrictReactNode } from "@freelensapp/utilities";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { clipboard } from "electron";
import type { IObservableValue } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { saveFileDialog } from "../../utils/saveFile";
import type { DialogProps } from "../dialog";
import { Dialog } from "../dialog";
import { MonacoEditor } from "../monaco-editor";
import { Wizard, WizardStep } from "../wizard";
import styles from "./kubeconfig-dialog.module.scss";
import kubeconfigDialogStateInjectable from "./state.injectable";

export interface KubeconfigDialogData {
  title?: StrictReactNode;
  config: string;
}

export interface KubeConfigDialogProps extends Partial<DialogProps> {}

interface Dependencies {
  state: IObservableValue<KubeconfigDialogData | undefined>;
  showSuccessNotification: ShowNotification;
}

@observer
class NonInjectedKubeConfigDialog extends React.Component<KubeConfigDialogProps & Dependencies> {
  constructor(props: KubeConfigDialogProps & Dependencies) {
    super(props);
  }

  close = () => {
    this.props.state.set(undefined);
  };

  copyToClipboard = (config: string) => {
    clipboard.writeText(config);
    this.props.showSuccessNotification("Config copied to clipboard");
  };

  download = (config: string) => {
    saveFileDialog("config", config, "text/yaml");
  };

  renderContents = (data: KubeconfigDialogData) => (
    <Wizard header={<h5>{data.title || "Kubeconfig File"}</h5>}>
      <WizardStep
        customButtons={
          <div className="actions flex gaps">
            <Button plain onClick={() => this.copyToClipboard(data.config)}>
              <Icon material="assignment" />
              {" Copy to clipboard"}
            </Button>
            <Button plain onClick={() => this.download(data.config)}>
              <Icon material="cloud_download" />
              {" Download file"}
            </Button>
            <Button plain className="box right" onClick={this.close}>
              Close
            </Button>
          </div>
        }
        prev={this.close}
      >
        <MonacoEditor readOnly className={styles.editor} value={data.config} />
      </WizardStep>
    </Wizard>
  );

  render() {
    const { className, state, ...dialogProps } = this.props;
    const data = state.get();

    return (
      <Dialog
        {...dialogProps}
        className={cssNames(styles.KubeConfigDialog, className)}
        isOpen={!!data}
        close={this.close}
      >
        {data && this.renderContents(data)}
      </Dialog>
    );
  }
}

export const KubeConfigDialog = withInjectables<Dependencies, KubeConfigDialogProps>(NonInjectedKubeConfigDialog, {
  getProps: (di, props) => ({
    ...props,
    showSuccessNotification: di.inject(showSuccessNotificationInjectable),
    state: di.inject(kubeconfigDialogStateInjectable),
  }),
});
