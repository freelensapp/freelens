/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./port-forwards.scss";

import { withInjectables } from "@ogre-tools/injectable-react";
import { computed, makeObservable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import React from "react";
import navigateToPortForwardsInjectable from "../../../common/front-end-routing/routes/cluster/network/port-forwards/navigate-to-port-forwards.injectable";
import portForwardStoreInjectable from "../../port-forward/port-forward-store/port-forward-store.injectable";
import { ItemListLayout } from "../item-object-list/list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { NamespaceSelectBadge } from "../namespaces/namespace-select-badge";
import { PortForwardDetails } from "./port-forward-details";
import { PortForwardMenu } from "./port-forward-menu";
import portForwardsRouteParametersInjectable from "./port-forwards-route-parameters.injectable";

import type { IComputedValue } from "mobx";

import type { NavigateToPortForwards } from "../../../common/front-end-routing/routes/cluster/network/port-forwards/navigate-to-port-forwards.injectable";
import type { PortForwardItem, PortForwardStore } from "../../port-forward";

enum columnId {
  name = "name",
  namespace = "namespace",
  kind = "kind",
  port = "port",
  forwardPort = "forwardPort",
  protocol = "protocol",
  status = "status",
  address = "address",
}

interface Dependencies {
  portForwardStore: PortForwardStore;
  forwardport: IComputedValue<string>;
  navigateToPortForwards: NavigateToPortForwards;
}

@observer
class NonInjectedPortForwards extends React.Component<Dependencies> {
  constructor(props: Dependencies) {
    super(props);

    makeObservable(this);
  }

  componentDidMount() {
    disposeOnUnmount(this, [this.props.portForwardStore.watch()]);
  }

  @computed
  get selectedPortForward() {
    const forwardport = this.props.forwardport.get();

    if (!forwardport) {
      return undefined;
    }

    return this.props.portForwardStore.getById(forwardport);
  }

  onDetails = (item: PortForwardItem) => {
    if (item === this.selectedPortForward) {
      this.hideDetails();
    } else {
      this.showDetails(item);
    }
  };

  showDetails = (item: PortForwardItem) => {
    this.props.navigateToPortForwards({
      forwardport: item.getId(),
    });
  };

  hideDetails = () => {
    this.props.navigateToPortForwards();
  };

  renderRemoveDialogMessage(selectedItems: PortForwardItem[]) {
    const forwardPorts = selectedItems.map((item) => item.getForwardPort()).join(", ");

    return (
      <div>
        <>
          {"Stop forwarding from "}
          <b>{forwardPorts}</b>?
        </>
      </div>
    );
  }

  render() {
    return (
      <SiblingsInTabLayout>
        <ItemListLayout
          isConfigurable
          tableId="port_forwards"
          className="PortForwards"
          store={this.props.portForwardStore}
          getItems={() => this.props.portForwardStore.items}
          sortingCallbacks={{
            [columnId.name]: (item) => item.getName(),
            [columnId.namespace]: (item) => item.getNs(),
            [columnId.kind]: (item) => item.getKind(),
            [columnId.port]: (item) => item.getPort(),
            [columnId.forwardPort]: (item) => item.getForwardPort(),
            [columnId.protocol]: (item) => item.getProtocol(),
            [columnId.status]: (item) => item.getStatus(),
          }}
          searchFilters={[(item) => item.getSearchFields()]}
          renderHeaderTitle="Port Forwarding"
          renderTableHeader={[
            { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
            { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
            { title: "Kind", className: "kind", sortBy: columnId.kind, id: columnId.kind },
            { title: "Pod Port", className: "port", sortBy: columnId.port, id: columnId.port },
            { title: "Local Port", className: "forwardPort", sortBy: columnId.forwardPort, id: columnId.forwardPort },
            { title: "Protocol", className: "protocol", sortBy: columnId.protocol, id: columnId.protocol },
            { title: "Address", className: "address", sortBy: columnId.address, id: columnId.address },
            { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
          ]}
          renderTableContents={(item) => [
            item.getName(),
            <NamespaceSelectBadge key="namespace" namespace={item.getNs()} />,
            item.getKind(),
            item.getPort(),
            item.getForwardPort(),
            item.getProtocol(),
            item.getAddress(),
            { title: item.getStatus(), className: item.getStatus().toLowerCase() },
          ]}
          renderItemMenu={(pf) => (
            <PortForwardMenu portForward={pf} removeConfirmationMessage={this.renderRemoveDialogMessage([pf])} />
          )}
          customizeRemoveDialog={(selectedItems) => ({
            message: this.renderRemoveDialogMessage(selectedItems),
          })}
          detailsItem={this.selectedPortForward}
          onDetails={this.onDetails}
        />
        {this.selectedPortForward && (
          <PortForwardDetails portForward={this.selectedPortForward} hideDetails={this.hideDetails} />
        )}
      </SiblingsInTabLayout>
    );
  }
}

export const PortForwards = withInjectables<Dependencies>(NonInjectedPortForwards, {
  getProps: (di) => ({
    portForwardStore: di.inject(portForwardStoreInjectable),
    ...di.inject(portForwardsRouteParametersInjectable),
    navigateToPortForwards: di.inject(navigateToPortForwardsInjectable),
  }),
});
