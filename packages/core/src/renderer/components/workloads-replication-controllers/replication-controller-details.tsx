/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { ReplicationControllerApi } from "@freelensapp/kube-api";
import { replicationControllerApiInjectable } from "@freelensapp/kube-api-specifics";
import type { ReplicationController } from "@freelensapp/kube-object";
import { showErrorNotificationInjectable } from "@freelensapp/notifications";
import type { ShowNotification } from "@freelensapp/notifications";
import { withInjectables } from "@ogre-tools/injectable-react";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../badge";
import { DrawerItem, DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import { Slider } from "../slider";
import styles from "./replication-controller-details.module.scss";

export interface ReplicationControllerDetailsProps extends KubeObjectDetailsProps<ReplicationController> {}

interface Dependencies {
  api: ReplicationControllerApi;
  showNotificationError: ShowNotification;
}

@observer
class NonInjectedReplicationControllerDetails<
  Props extends ReplicationControllerDetailsProps & Dependencies,
> extends React.Component<Props> {
  @observable sliderReplicasValue = this.props.object.getDesiredReplicas();
  @observable sliderReplicasDisabled = false;

  constructor(props: Props) {
    super(props);
    makeObservable(this);
  }

  @action
  async scale(replicas: number) {
    const { object: resource, api, showNotificationError } = this.props;

    try {
      await api.scale(
        {
          name: resource.getName(),
          namespace: resource.getNs(),
        },
        replicas,
      );
    } catch (error) {
      this.sliderReplicasValue = resource.getDesiredReplicas(); // rollback to last valid value
      showNotificationError(error as Error);
    }
  }

  @action
  async onScaleSliderChangeCommitted(evt: React.SyntheticEvent | Event, replicas: number) {
    this.sliderReplicasDisabled = true;
    await this.scale(replicas);
    this.sliderReplicasDisabled = false;
  }

  render() {
    const { object: resource } = this.props;

    return (
      <div className={styles.ReplicationControllerDetails}>
        <DrawerTitle>Spec</DrawerTitle>
        <DrawerItem name="Replicas">
          <div className={styles.replicas}>
            <div>{resource.getDesiredReplicas()}</div>
            <div>Scale</div>
            <Slider
              min={0}
              max={100}
              valueLabelDisplay="auto"
              disabled={this.sliderReplicasDisabled}
              value={this.sliderReplicasValue}
              onChange={(evt, value) => (this.sliderReplicasValue = value)}
              onChangeCommitted={(event, value) => this.onScaleSliderChangeCommitted(event, value as number)}
            />
          </div>
        </DrawerItem>
        <DrawerItem name="Selectors" labelsOnly>
          {resource.getSelectorLabels().map((label) => (
            <Badge key={label} label={label} />
          ))}
        </DrawerItem>

        <DrawerTitle>Status</DrawerTitle>
        <DrawerItem name="Replicas">{resource.getReplicas()}</DrawerItem>
        <DrawerItem name="Available Replicas">{resource.getAvailableReplicas()}</DrawerItem>
        <DrawerItem name="Labeled Replicas">{resource.getLabeledReplicas()}</DrawerItem>
        <DrawerItem name="Controller Generation">{resource.getGeneration()}</DrawerItem>
        <DrawerItem name="Minimum Pod Readiness">{`${resource.getMinReadySeconds()} seconds`}</DrawerItem>
      </div>
    );
  }
}

export const ReplicationControllerDetails = withInjectables<Dependencies, ReplicationControllerDetailsProps>(
  NonInjectedReplicationControllerDetails,
  {
    getProps: (di, props) => ({
      ...props,
      api: di.inject(replicationControllerApiInjectable),
      showNotificationError: di.inject(showErrorNotificationInjectable),
    }),
  },
);
