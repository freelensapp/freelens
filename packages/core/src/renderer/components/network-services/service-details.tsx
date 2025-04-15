/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./service-details.scss";

import { Service } from "@freelensapp/kube-object";
import type { Logger } from "@freelensapp/logger";
import { loggerInjectionToken } from "@freelensapp/logger";
import { withInjectables } from "@ogre-tools/injectable-react";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import type { SubscribeStores } from "../../kube-watch-api/kube-watch-api";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import type { PortForwardStore } from "../../port-forward";
import portForwardStoreInjectable from "../../port-forward/port-forward-store/port-forward-store.injectable";
import { Badge } from "../badge";
import { DrawerItem, DrawerTitle } from "../drawer";
import type { KubeObjectDetailsProps } from "../kube-object-details";
import type { EndpointsStore } from "../network-endpoints/store";
import endpointsStoreInjectable from "../network-endpoints/store.injectable";
import { ServiceDetailsEndpoint } from "./service-details-endpoint";
import { ServicePortComponent } from "./service-port-component";

export interface ServiceDetailsProps extends KubeObjectDetailsProps<Service> {}

interface Dependencies {
  subscribeStores: SubscribeStores;
  portForwardStore: PortForwardStore;
  endpointsStore: EndpointsStore;
  logger: Logger;
}

@observer
class NonInjectedServiceDetails extends React.Component<ServiceDetailsProps & Dependencies> {
  componentDidMount() {
    const { object: service, subscribeStores, endpointsStore, portForwardStore } = this.props;

    disposeOnUnmount(this, [
      subscribeStores([endpointsStore], {
        namespaces: [service.getNs()],
      }),
      portForwardStore.watch(),
    ]);
  }

  render() {
    const { object: service, endpointsStore } = this.props;

    if (!service) {
      return null;
    }

    if (!(service instanceof Service)) {
      this.props.logger.error("[ServiceDetails]: passed object that is not an instanceof Service", service);

      return null;
    }

    const { spec } = service;
    const endpoints = endpointsStore.getByName(service.getName(), service.getNs());
    const externalIps = service.getExternalIps();

    if (externalIps.length === 0 && spec?.externalName) {
      externalIps.push(spec.externalName);
    }

    return (
      <div className="ServicesDetails">
        <DrawerItem name="Selector" labelsOnly>
          {service.getSelector().map((selector) => (
            <Badge key={selector} label={selector} />
          ))}
        </DrawerItem>

        <DrawerItem name="Type">{spec.type}</DrawerItem>

        <DrawerItem name="Session Affinity">{spec.sessionAffinity}</DrawerItem>

        <DrawerTitle>Connection</DrawerTitle>

        <DrawerItem name="Cluster IP">{spec.clusterIP}</DrawerItem>

        <DrawerItem name="Cluster IPs" hidden={!service.getClusterIps().length} labelsOnly>
          {service.getClusterIps().map((label) => (
            <Badge key={label} label={label} />
          ))}
        </DrawerItem>

        <DrawerItem name="IP families" hidden={!service.getIpFamilies().length}>
          {service.getIpFamilies().join(", ")}
        </DrawerItem>

        <DrawerItem name="IP family policy" hidden={!service.getIpFamilyPolicy()}>
          {service.getIpFamilyPolicy()}
        </DrawerItem>

        {externalIps.length > 0 && (
          <DrawerItem name="External IPs">
            {externalIps.map((ip) => (
              <div key={ip}>{ip}</div>
            ))}
          </DrawerItem>
        )}

        <DrawerItem name="Ports">
          <div>
            {service.getPorts().map((port) => (
              <ServicePortComponent service={service} port={port} key={port.toString()} />
            ))}
          </div>
        </DrawerItem>

        {spec.type === "LoadBalancer" && spec.loadBalancerIP && (
          <DrawerItem name="Load Balancer IP">{spec.loadBalancerIP}</DrawerItem>
        )}

        {endpoints && (
          <>
            <DrawerTitle>Endpoint</DrawerTitle>
            <ServiceDetailsEndpoint endpoints={endpoints} />
          </>
        )}
      </div>
    );
  }
}

export const ServiceDetails = withInjectables<Dependencies, ServiceDetailsProps>(NonInjectedServiceDetails, {
  getProps: (di, props) => ({
    ...props,
    subscribeStores: di.inject(subscribeStoresInjectable),
    portForwardStore: di.inject(portForwardStoreInjectable),
    endpointsStore: di.inject(endpointsStoreInjectable),
    logger: di.inject(loggerInjectionToken),
  }),
});
