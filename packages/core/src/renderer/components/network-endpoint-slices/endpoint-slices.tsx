/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./endpoint-slices.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { KubeObjectAge } from "../kube-object/age";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import type { EndpointSliceStore } from "./store";
import endpointSliceStoreInjectable from "./store.injectable";

enum columnId {
  name = "name",
  namespace = "namespace",
  addressType = "addressType",
  ports = "ports",
  endpoints = "endpoints",
  age = "age",
}

interface Dependencies {
  endpointSliceStore: EndpointSliceStore;
}

@observer
class NonInjectedEndpointSlices extends React.Component<Dependencies> {
  render() {
    return (
      <SiblingsInTabLayout>
        <KubeObjectListLayout
          isConfigurable
          tableId="network_endpoint_slices"
          className="EndpointSlices"
          store={this.props.endpointSliceStore}
          sortingCallbacks={{
            [columnId.name]: (endpointSlice) => endpointSlice.getName(),
            [columnId.namespace]: (endpointSlice) => endpointSlice.getNs(),
            [columnId.addressType]: (endpointSlice) => endpointSlice.addressType,
            [columnId.ports]: (endpointSlice) => endpointSlice.getPortsString(),
            [columnId.endpoints]: (endpointSlice) => endpointSlice.getEndpointsString(),
            [columnId.age]: (endpointSlice) => -endpointSlice.getCreationTimestamp(),
          }}
          searchFilters={[(endpointSlice) => endpointSlice.getSearchFields()]}
          renderHeaderTitle="Endpoint Slices"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Address Type", className: "addressType", sortBy: columnId.addressType, id: columnId.addressType },
            { title: "Ports", className: "ports", sortBy: columnId.ports, id: columnId.ports },
            { title: "Endpoints", className: "endpoints", sortBy: columnId.endpoints, id: columnId.endpoints },
            { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          ]}
          renderTableContents={(endpointSlice) => [
            endpointSlice.getName(),
            <NamespaceSelectBadge key="namespace" namespace={endpointSlice.getNs()} />,
            endpointSlice.addressType,
            endpointSlice.getPortsString(),
            endpointSlice.getEndpointsString(),
            <KubeObjectAge key="age" object={endpointSlice} />,
          ]}
        />
      </SiblingsInTabLayout>
    );
  }
}

export const EndpointSlices = withInjectables<Dependencies>(NonInjectedEndpointSlices, {
  getProps: (di, props) => ({
    ...props,
    endpointSliceStore: di.inject(endpointSliceStoreInjectable),
  }),
});
