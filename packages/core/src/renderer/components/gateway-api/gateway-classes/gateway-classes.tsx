/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { KubeObjectAge } from "../../kube-object/age";
import { KubeObjectListLayout } from "../../kube-object-list-layout";
import { SiblingsInTabLayout } from "../../layout/siblings-in-tab-layout";
import { WithTooltip } from "../../with-tooltip";
import gatewayClassStoreInjectable from "./gateway-class-store.injectable";

import type { GatewayClass } from "@freelensapp/kube-object";

import type { GatewayClassStore } from "./gateway-class-store";

enum columnId {
  name = "name",
  controller = "controller",
  accepted = "accepted",
  age = "age",
}

interface Dependencies {
  store: GatewayClassStore;
}

const NonInjectedGatewayClasses = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="gateway_classes"
        className="GatewayClasses"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (item: GatewayClass) => item.getName(),
          [columnId.controller]: (item: GatewayClass) => item.getController(),
          [columnId.age]: (item: GatewayClass) => -item.getCreationTimestamp(),
        }}
        searchFilters={[(item: GatewayClass) => item.getSearchFields(), (item: GatewayClass) => item.getController()]}
        renderHeaderTitle="GatewayClasses"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { title: "Controller", className: "controller", sortBy: columnId.controller, id: columnId.controller },
          { title: "Accepted", className: "accepted", id: columnId.accepted },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(item: GatewayClass) => {
          const accepted = item.getAcceptedCondition();

          return [
            <WithTooltip key="name">{item.getName()}</WithTooltip>,
            <WithTooltip key="controller">{item.getController()}</WithTooltip>,
            accepted ? `${accepted.status} (${accepted.reason ?? ""})` : "-",
            <KubeObjectAge key="age" object={item} />,
          ];
        }}
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
