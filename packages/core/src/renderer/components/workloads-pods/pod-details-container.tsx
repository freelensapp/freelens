/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./pod-details-container.scss";

import { podDetailsContainerMetricsInjectionToken } from "@freelensapp/metrics";
import { cssNames, isDefined } from "@freelensapp/utilities";
import { withInjectables } from "@ogre-tools/injectable-react";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import { ClusterMetricsResourceType } from "../../../common/cluster-types";
import enabledMetricsInjectable from "../../api/catalog/entity/metrics-enabled.injectable";
import portForwardStoreInjectable from "../../port-forward/port-forward-store/port-forward-store.injectable";
import { Badge } from "../badge";
import { DrawerItem } from "../drawer";
import { DurationAbsoluteTimestamp } from "../events";
import { StatusBrick } from "../status-brick";
import { containerStatusClassName } from "./container-status-class-name";
import { ContainerEnvironment } from "./pod-container-env";
import { PodContainerPort } from "./pod-container-port";

import type { ContainerWithType, EphemeralContainerWithType, Pod, PodContainerStatus } from "@freelensapp/kube-object";
import type { PodDetailsContainerMetricsComponent } from "@freelensapp/metrics";

import type { IComputedValue } from "mobx";

import type { PortForwardStore } from "../../port-forward";

export interface PodDetailsContainerProps {
  pod: Pod;
  container: ContainerWithType | EphemeralContainerWithType;
}

interface Dependencies {
  portForwardStore: PortForwardStore;
  containerMetricsVisible: IComputedValue<boolean>;
  containerMetrics: PodDetailsContainerMetricsComponent[];
}

@observer
class NonInjectedPodDetailsContainer extends React.Component<PodDetailsContainerProps & Dependencies> {
  componentDidMount() {
    disposeOnUnmount(this, [this.props.portForwardStore.watch()]);
  }

  renderStatus(container: ContainerWithType | EphemeralContainerWithType, status?: PodContainerStatus) {
    const state = status ? Object.keys(status?.state ?? {})[0] : "unknown";
    const terminated = status?.state ? (status?.state.terminated ?? "") : "";

    return (
      <span className={cssNames("status", containerStatusClassName(container, status))}>
        {state}
        {container.type === "initContainers" ? ", init" : ""}
        {container.type === "ephemeralContainers" ? ", ephemeral" : ""}
        {status?.restartCount ? ", restarted" : ""}
        {status?.ready ? ", ready" : ""}
        {terminated ? ` - ${terminated.reason} (exit code: ${terminated.exitCode})` : ""}
      </span>
    );
  }

  renderLastState(lastState: string, status: PodContainerStatus | null | undefined) {
    const { lastState: lastContainerState = {} } = status ?? {};
    const { terminated } = lastContainerState;

    if (terminated) {
      return (
        <span>
          {lastState}
          <br />
          {`Reason: ${terminated.reason} - exit code: ${terminated.exitCode}`}
          <br />
          {"Started: "}
          {<DurationAbsoluteTimestamp timestamp={terminated.startedAt} />}
          <br />
          {"Finished: "}
          {<DurationAbsoluteTimestamp timestamp={terminated.finishedAt} />}
          <br />
        </span>
      );
    }

    return null;
  }

  render() {
    const { pod, container, containerMetricsVisible, containerMetrics } = this.props;

    if (!pod || !container) return null;
    const { name, image, imagePullPolicy, ports, volumeMounts, command, args, resources } = container;
    const id = `pod-container-id-${pod}-${name}`;
    const targetContainerName = "targetContainerName" in container ? container.targetContainerName : undefined;
    const status = pod.getContainerStatuses().find((status) => status.name === container.name);
    const lastState = status ? Object.keys(status?.lastState ?? {})[0] : "";
    const imageId = status ? status.imageID : "";
    const liveness = pod.getLivenessProbe(container);
    const readiness = pod.getReadinessProbe(container);
    const startup = pod.getStartupProbe(container);
    const containersType = container.type;
    const isMetricVisible = containerMetricsVisible.get();
    const requests = Object.entries(resources?.requests ?? {});
    const limits = Object.entries(resources?.limits ?? {});

    return (
      <div className="PodDetailsContainer">
        <div className="pod-container-title" id={id}>
          <StatusBrick className={containerStatusClassName(container, status)} />
          {name}
        </div>
        {isMetricVisible && containersType === "containers" && (
          <>
            {containerMetrics.map((ContainerMetrics) => (
              <ContainerMetrics.Component key={ContainerMetrics.id} container={container} pod={pod} />
            ))}
          </>
        )}
        {targetContainerName && (
          <DrawerItem name="Target Container">
            <a href={`#pod-container-id-${pod.getName()}-${targetContainerName}`}>{targetContainerName}</a>
          </DrawerItem>
        )}
        {status && <DrawerItem name="Status">{this.renderStatus(container, status)}</DrawerItem>}
        {lastState && <DrawerItem name="Last Status">{this.renderLastState(lastState, status)}</DrawerItem>}
        <DrawerItem name="Image">
          <Badge label={image} tooltip={imageId} />
        </DrawerItem>
        {imagePullPolicy && imagePullPolicy !== "IfNotPresent" && (
          <DrawerItem name="ImagePullPolicy">{imagePullPolicy}</DrawerItem>
        )}
        {ports && ports.length > 0 && (
          <DrawerItem name="Ports">
            {ports.filter(isDefined).map((port) => (
              <PodContainerPort
                pod={pod}
                port={port}
                key={`${container.name}-port-${port.containerPort}-${port.protocol}`}
              />
            ))}
          </DrawerItem>
        )}
        {<ContainerEnvironment pod={pod} container={container} namespace={pod.getNs()} />}
        {volumeMounts && volumeMounts.length > 0 && (
          <DrawerItem name="Mounts">
            {volumeMounts.map((mount) => {
              const { name, mountPath, readOnly } = mount;

              return (
                <React.Fragment key={name + mountPath}>
                  <span className="mount-path">{mountPath}</span>
                  <span className="mount-from">{`from ${name} (${readOnly ? "ro" : "rw"})`}</span>
                </React.Fragment>
              );
            })}
          </DrawerItem>
        )}
        {liveness.length > 0 && (
          <DrawerItem name="Liveness" labelsOnly>
            {liveness.map((value, index) => (
              <Badge key={index} label={value} />
            ))}
          </DrawerItem>
        )}
        {readiness.length > 0 && (
          <DrawerItem name="Readiness" labelsOnly>
            {readiness.map((value, index) => (
              <Badge key={index} label={value} />
            ))}
          </DrawerItem>
        )}
        {startup.length > 0 && (
          <DrawerItem name="Startup" labelsOnly>
            {startup.map((value, index) => (
              <Badge key={index} label={value} />
            ))}
          </DrawerItem>
        )}
        {command && <DrawerItem name="Command">{command.join(" ")}</DrawerItem>}

        {args && <DrawerItem name="Arguments">{args.join(" ")}</DrawerItem>}

        {requests.length > 0 && (
          <DrawerItem name="Requests" labelsOnly>
            {requests.map(([key, value], index) => (
              <Badge key={index} label={`${key}=${value}`} />
            ))}
          </DrawerItem>
        )}

        {limits.length > 0 && (
          <DrawerItem name="Limits" labelsOnly>
            {limits.map(([key, value], index) => (
              <Badge key={index} label={`${key}=${value}`} />
            ))}
          </DrawerItem>
        )}
      </div>
    );
  }
}

export const PodDetailsContainer = withInjectables<Dependencies, PodDetailsContainerProps>(
  NonInjectedPodDetailsContainer,
  {
    getProps: (di, props) => ({
      ...props,
      portForwardStore: di.inject(portForwardStoreInjectable),
      containerMetricsVisible: di.inject(enabledMetricsInjectable, ClusterMetricsResourceType.Container),
      containerMetrics: di.injectMany(podDetailsContainerMetricsInjectionToken),
    }),
  },
);
