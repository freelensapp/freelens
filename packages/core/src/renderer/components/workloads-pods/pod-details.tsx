/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-details.scss";

import { Pod } from "@freelensapp/kube-object";
import { loggerInjectionToken } from "@freelensapp/logger";
import { cssNames, formatDuration } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import kebabCase from "lodash/kebabCase";
import { observer } from "mobx-react";
import React from "react";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import { KubeObjectConditionsDrawer } from "../kube-object-conditions";
import { LinkToNode, LinkToPriorityClass, LinkToRuntimeClass, LinkToServiceAccount } from "../kube-object-link";
import { PodDetailsContainers } from "./details/containers/pod-details-containers";
import { PodDetailsEphemeralContainers } from "./details/containers/pod-details-ephemeral-containers";
import { PodDetailsInitContainers } from "./details/containers/pod-details-init-containers";
import { PodVolumes } from "./details/volumes/view";
import { PodDetailsAffinities } from "./pod-details-affinities";
import { PodDetailsSecrets } from "./pod-details-secrets";
import { PodDetailsTolerations } from "./pod-details-tolerations";

import type { Logger } from "@freelensapp/logger";

import type { KubeObjectDetailsProps } from "../kube-object-details";

export interface PodDetailsProps extends KubeObjectDetailsProps<Pod> {}

interface Dependencies {
  logger: Logger;
}

@observer
class NonInjectedPodDetails extends React.Component<PodDetailsProps & Dependencies> {
  render() {
    const { object: pod, logger } = this.props;

    if (!pod) {
      return null;
    }

    if (!(pod instanceof Pod)) {
      logger.error("[PodDetails]: passed object that is not an instanceof Pod", pod);

      return null;
    }

    const { status, spec } = pod;
    const { podIP } = status ?? {};
    const podIPs = pod.getIPs();
    const { nodeName } = spec ?? {};
    const nodeSelector = pod.getNodeSelectors();

    const namespace = pod.getNs();
    const priorityClassName = pod.getPriorityClassName();
    const runtimeClassName = pod.getRuntimeClassName();
    const serviceAccountName = pod.getServiceAccountName();

    return (
      <div className="PodDetails">
        <DrawerItem name="Status">
          <span className={cssNames("status", kebabCase(pod.getStatusMessage()))}>{pod.getStatusMessage()}</span>
        </DrawerItem>
        <DrawerItem name="Node" hidden={!nodeName}>
          <LinkToNode name={nodeName} />
        </DrawerItem>
        <DrawerItem name="Pod IP">{podIP}</DrawerItem>
        <DrawerItem name="Pod IPs" hidden={podIPs.length === 0} labelsOnly>
          {podIPs.map((label) => (
            <Badge key={label} label={label} />
          ))}
        </DrawerItem>
        <DrawerItem name="Service Account">
          <LinkToServiceAccount name={serviceAccountName} namespace={namespace} />
        </DrawerItem>
        <DrawerItem name="Priority Class" hidden={priorityClassName === ""}>
          <LinkToPriorityClass name={priorityClassName} />
        </DrawerItem>
        <DrawerItem name="QoS Class">{pod.getQosClass()}</DrawerItem>
        <DrawerItem name="Runtime Class" hidden={runtimeClassName === ""}>
          <LinkToRuntimeClass name={runtimeClassName} />
        </DrawerItem>
        <DrawerItem name="Termination Grace Period">
          {formatDuration((pod.spec.terminationGracePeriodSeconds ?? 30) * 1000, false)}
        </DrawerItem>

        <DrawerItem name="Node Selector" hidden={nodeSelector.length === 0}>
          {nodeSelector.map((label) => (
            <Badge key={label} label={label} />
          ))}
        </DrawerItem>

        <PodDetailsTolerations workload={pod} />
        <PodDetailsAffinities workload={pod} />

        <DrawerItem name="Secrets" hidden={pod.getSecrets().length === 0}>
          <PodDetailsSecrets pod={pod} />
        </DrawerItem>

        <KubeObjectConditionsDrawer object={pod} />

        <PodDetailsInitContainers pod={pod} />

        <PodDetailsContainers pod={pod} />

        <PodDetailsEphemeralContainers pod={pod} />

        <PodVolumes pod={pod} />
      </div>
    );
  }
}

export const PodDetails = withInjectables<Dependencies, PodDetailsProps>(NonInjectedPodDetails, {
  getProps: (di, props) => ({
    ...props,
    logger: di.inject(loggerInjectionToken),
  }),
});
