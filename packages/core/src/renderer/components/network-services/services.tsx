/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./services.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object/age";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { WithTooltip } from "../with-tooltip";
import serviceStoreInjectable from "./store.injectable";

import type { Service } from "@freelensapp/kube-object";

import type { ServiceStore } from "./store";

enum columnId {
  name = "name",
  namespace = "namespace",
  type = "type",
  clusterIp = "cluster-ip",
  externalIp = "external-ip",
  ports = "port",
  age = "age",
  status = "status",
}

const formatExternalIps = (service: Service) => {
  const externalIps = service.getExternalIps();

  if (externalIps.length > 0) {
    return externalIps.join(", ");
  }

  if (service.spec?.externalName) {
    return service.spec.externalName;
  }

  return "-";
};

interface Dependencies {
  serviceStore: ServiceStore;
}

@observer
class NonInjectedServices extends React.Component<Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="network_services"
          className="Services"
          store={this.props.serviceStore}
          sortingCallbacks={{
            [columnId.name]: (service) => service.getName(),
            [columnId.namespace]: (service) => service.getNs(),
            [columnId.ports]: (service) => (service.spec.ports || []).map(({ port }) => port)[0],
            [columnId.clusterIp]: (service) => service.getClusterIp(),
            [columnId.type]: (service) => service.getType(),
            [columnId.age]: (service) => -service.getCreationTimestamp(),
            [columnId.status]: (service) => service.getStatus(),
          }}
          searchFilters={[
            (service) => service.getSearchFields(),
            (service) => service.getSelector().join(" "),
            (service) => service.getPorts().join(" "),
          ]}
          renderHeaderTitle="Services"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { className: "warning", showWithColumn: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Type", className: "type", sortBy: columnId.type, id: columnId.type },
            { title: "Cluster IP", className: "clusterIp", sortBy: columnId.clusterIp, id: columnId.clusterIp },
            { title: "External IP", className: "externalIp", id: columnId.externalIp },
            { title: "Ports", className: "ports", sortBy: columnId.ports, id: columnId.ports },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
            { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
          ]}
          renderTableContents={(service) => [
            <WithTooltip>{service.getName()}</WithTooltip>,
            <KubeObjectStatusIcon key="icon" object={service} />,
            <NamespaceSelectBadge key="namespace" namespace={service.getNs()} />,
            service.getType(),
            <WithTooltip>{service.getClusterIp()}</WithTooltip>,
            <WithTooltip>{formatExternalIps(service)}</WithTooltip>,
            <WithTooltip>{service.getPorts().join(", ")}</WithTooltip>,
            <KubeObjectAge key="age" object={service} />,
            { title: service.getStatus(), className: service.getStatus().toLowerCase() },
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const Services = withInjectables<Dependencies>(NonInjectedServices, {
  getProps: (di, props) => ({
    ...props,
    serviceStore: di.inject(serviceStoreInjectable),
  }),
});
