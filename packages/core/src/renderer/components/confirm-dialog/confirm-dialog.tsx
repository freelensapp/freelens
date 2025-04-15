/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./confirm-dialog.scss";

import type { ButtonProps } from "@freelensapp/button";
import { Button } from "@freelensapp/button";
import { Icon } from "@freelensapp/icon";
import type { ShowNotification } from "@freelensapp/notifications";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import type { StrictReactNode } from "@freelensapp/utilities";
import { cssNames, noop, prevDefault } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IObservableValue } from "mobx";
import { computed, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import type { DialogProps } from "../dialog";
import { Dialog } from "../dialog";
import confirmDialogStateInjectable from "./state.injectable";

export interface ConfirmDialogProps extends Partial<DialogProps> {}

export interface ConfirmDialogParams extends ConfirmDialogBooleanParams {
  ok?: () => any | Promise<any>;
  cancel?: () => any | Promise<any>;
}

export interface ConfirmDialogBooleanParams {
  labelOk?: StrictReactNode;
  labelCancel?: StrictReactNode;
  message: StrictReactNode;
  icon?: StrictReactNode;
  okButtonProps?: Partial<ButtonProps>;
  cancelButtonProps?: Partial<ButtonProps>;
}

interface Dependencies {
  state: IObservableValue<ConfirmDialogParams | undefined>;
  showErrorNotification: ShowNotification;
}

const defaultParams = {
  ok: noop,
  cancel: noop,
  labelOk: "Ok",
  labelCancel: "Cancel",
  icon: <Icon big material="warning" />,
};

@observer
class NonInjectedConfirmDialog extends React.Component<ConfirmDialogProps & Dependencies> {
  @observable isSaving = false;

  constructor(props: ConfirmDialogProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  @computed
  get params() {
    return Object.assign({}, defaultParams, this.props.state.get() ?? ({} as ConfirmDialogParams));
  }

  ok = async () => {
    try {
      this.isSaving = true;
      await (async () => this.params.ok())();
    } catch (error) {
      this.props.showErrorNotification(
        <>
          <p>Confirmation action failed:</p>
          <p>
            {error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Unknown error occurred while ok-ing"}
          </p>
        </>,
      );
    } finally {
      this.isSaving = false;
      this.props.state.set(undefined);
    }
  };

  onClose = () => {
    this.isSaving = false;
  };

  close = async () => {
    try {
      await Promise.resolve(this.params.cancel());
    } catch (error) {
      this.props.showErrorNotification(
        <>
          <p>Cancelling action failed:</p>
          <p>
            {error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Unknown error occurred while cancelling"}
          </p>
        </>,
      );
    } finally {
      this.isSaving = false;
      this.props.state.set(undefined);
    }
  };

  render() {
    const { state, className, ...dialogProps } = this.props;
    const isOpen = Boolean(state.get());
    const { icon, labelOk, labelCancel, message, okButtonProps = {}, cancelButtonProps = {} } = this.params;

    return (
      <Dialog
        {...dialogProps}
        className={cssNames("ConfirmDialog", className)}
        isOpen={isOpen}
        onClose={this.onClose}
        close={this.close}
        {...(isOpen ? { "data-testid": "confirmation-dialog" } : {})}
      >
        <div className="confirm-content">
          {icon} {message}
        </div>
        <div className="confirm-buttons">
          <Button
            plain
            className="cancel"
            label={labelCancel}
            onClick={prevDefault(this.close)}
            {...cancelButtonProps}
          />
          <Button
            autoFocus
            primary
            className="ok"
            label={labelOk}
            onClick={prevDefault(this.ok)}
            waiting={this.isSaving}
            data-testid="confirm"
            {...okButtonProps}
          />
        </div>
      </Dialog>
    );
  }
}

export const ConfirmDialog = withInjectables<Dependencies, ConfirmDialogProps>(NonInjectedConfirmDialog, {
  getProps: (di, props) => ({
    ...props,
    state: di.inject(confirmDialogStateInjectable),
    showErrorNotification: di.inject(showErrorNotificationInjectable),
  }),
});
