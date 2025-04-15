/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./dialog.scss";

import { Icon } from "@freelensapp/icon";
import type { StatefulSetApi } from "@freelensapp/kube-api";
import { statefulSetApiInjectable } from "@freelensapp/kube-api-specifics";
import type { StatefulSet } from "@freelensapp/kube-object";
import type { ShowCheckedErrorNotification } from "@freelensapp/notifications";
import { showCheckedErrorNotificationInjectable } from "@freelensapp/notifications";
import { cssNames } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { IObservableValue } from "mobx";
import { computed, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React, { Component } from "react";
import type { DialogProps } from "../../dialog";
import { Dialog } from "../../dialog";
import { Slider } from "../../slider";
import { Wizard, WizardStep } from "../../wizard";
import statefulSetDialogStateInjectable from "./dialog-state.injectable";

export interface StatefulSetScaleDialogProps extends Partial<DialogProps> {}

interface Dependencies {
  statefulSetApi: StatefulSetApi;
  state: IObservableValue<StatefulSet | undefined>;
  showCheckedErrorNotification: ShowCheckedErrorNotification;
}

@observer
class NonInjectedStatefulSetScaleDialog extends Component<StatefulSetScaleDialogProps & Dependencies> {
  @observable ready = false;
  @observable currentReplicas = 0;
  @observable desiredReplicas = 0;

  constructor(props: StatefulSetScaleDialogProps & Dependencies) {
    super(props);
    makeObservable(this);
  }

  close = () => {
    this.props.state.set(undefined);
  };

  onOpen = async (statefulSet: StatefulSet) => {
    this.currentReplicas = await this.props.statefulSetApi.getReplicas({
      namespace: statefulSet.getNs(),
      name: statefulSet.getName(),
    });
    this.desiredReplicas = this.currentReplicas;
    this.ready = true;
  };

  onClose = () => {
    this.ready = false;
  };

  onChange = (evt: Event, value: number) => {
    this.desiredReplicas = value;
  };

  @computed get scaleMax() {
    const { currentReplicas } = this;
    const defaultMax = 50;

    return currentReplicas <= defaultMax ? defaultMax * 2 : currentReplicas * 2;
  }

  scale = async (statefulSet: StatefulSet) => {
    const { currentReplicas, desiredReplicas, close } = this;

    try {
      if (currentReplicas !== desiredReplicas) {
        await this.props.statefulSetApi.scale(
          {
            name: statefulSet.getName(),
            namespace: statefulSet.getNs(),
          },
          desiredReplicas,
        );
      }
      close();
    } catch (error) {
      this.props.showCheckedErrorNotification(error, "Unknown error occurred while scaling StatefulSet");
    }
  };

  private readonly scaleMin = 0;

  desiredReplicasUp = () => {
    this.desiredReplicas = Math.min(this.scaleMax, this.desiredReplicas + 1);
  };

  desiredReplicasDown = () => {
    this.desiredReplicas = Math.max(this.scaleMin, this.desiredReplicas - 1);
  };

  renderContents(statefulSet: StatefulSet) {
    const { currentReplicas, desiredReplicas, onChange, scaleMax } = this;
    const warning = currentReplicas < 10 && desiredReplicas > 90;

    return (
      <Wizard
        header={
          <h5>
            {"Scale Stateful Set "}
            <span>{statefulSet.getName()}</span>
          </h5>
        }
        done={this.close}
      >
        <WizardStep
          contentClass="flex gaps column"
          next={() => this.scale(statefulSet)}
          nextLabel="Scale"
          disabledNext={!this.ready}
        >
          <div className="current-scale" data-testid="current-scale">
            {`Current replica scale: ${currentReplicas}`}
          </div>
          <div className="flex gaps align-center">
            <div className="desired-scale" data-testid="desired-scale">
              {`Desired number of replicas: ${desiredReplicas}`}
            </div>
            <div className="slider-container flex align-center" data-testid="slider">
              <Slider value={desiredReplicas} max={scaleMax} onChange={onChange} />
            </div>
            <div className="plus-minus-container flex gaps">
              <Icon
                material="remove_circle_outline"
                onClick={this.desiredReplicasDown}
                data-testid="desired-replicas-down"
              />
              <Icon material="add_circle_outline" onClick={this.desiredReplicasUp} data-testid="desired-replicas-up" />
            </div>
          </div>
          {warning && (
            <div className="warning" data-testid="warning">
              <Icon material="warning" />
              High number of replicas may cause cluster performance issues
            </div>
          )}
        </WizardStep>
      </Wizard>
    );
  }

  render() {
    const { className, state, ...dialogProps } = this.props;
    const statefulSet = state.get();

    return (
      <Dialog
        {...dialogProps}
        isOpen={Boolean(statefulSet)}
        className={cssNames("StatefulSetScaleDialog", className)}
        onOpen={statefulSet && (() => this.onOpen(statefulSet))}
        onClose={this.onClose}
        close={this.close}
      >
        {statefulSet && this.renderContents(statefulSet)}
      </Dialog>
    );
  }
}

export const StatefulSetScaleDialog = withInjectables<Dependencies, StatefulSetScaleDialogProps>(
  NonInjectedStatefulSetScaleDialog,
  {
    getProps: (di, props) => ({
      ...props,
      statefulSetApi: di.inject(statefulSetApiInjectable),
      state: di.inject(statefulSetDialogStateInjectable),
      showCheckedErrorNotification: di.inject(showCheckedErrorNotificationInjectable),
    }),
  },
);
