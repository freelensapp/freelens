/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./gateway-classes.scss";

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../kube-object";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import { WithTooltip } from "../with-tooltip";
import { GatewayClassColumnId, gatewayClassTableHeaders } from "./gateway-api-list-helpers";
import gatewayClassStoreInjectable from "./gateway-class-store.injectable";

import type { GatewayClass } from "@freelensapp/kube-object";

import type { GatewayClassStore } from "./gateway-class-store";

interface Dependencies {
  store: GatewayClassStore;
}

const NonInjectedGatewayClasses = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_gateway_classes"
        className="GatewayClasses"
        store={store}
        sortingCallbacks={{
          [GatewayClassColumnId.name]: (gatewayClass: GatewayClass) => gatewayClass.getName(),
          [GatewayClassColumnId.controller]: (gatewayClass: GatewayClass) => gatewayClass.getControllerName(),
          [GatewayClassColumnId.age]: (gatewayClass) => -gatewayClass.getCreationTimestamp(),
        }}
        searchFilters={[
          (gatewayClass: GatewayClass) => gatewayClass.getSearchFields(),
          (gatewayClass: GatewayClass) => gatewayClass.getControllerName(),
        ]}
        renderHeaderTitle="Gateway Classes"
        renderTableHeader={gatewayClassTableHeaders}
        renderTableContents={(gatewayClass) => [
          <div key={gatewayClass.getId()} className="name">
            <WithTooltip>{gatewayClass.getName()}</WithTooltip>{" "}
            {gatewayClass.isDefault && (
              <Icon
                small
                material="star"
                tooltip="Is default class for gateways (when not specified)"
                className="set_default_icon"
              />
            )}
          </div>,
          <WithTooltip>{gatewayClass.getControllerName()}</WithTooltip>,
          <KubeObjectStatusIcon key="accepted" object={gatewayClass} />,
          <KubeObjectAge key="age" object={gatewayClass} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const GatewayClasses = withInjectables<Dependencies>(NonInjectedGatewayClasses, {
  getProps: (di, props) => ({
    ...props,
    store: di.inject(gatewayClassStoreInjectable),
  }),
});
