/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./ingress-classes.scss";

import { Icon } from "@freelensapp/icon";
import { withInjectables } from "@ogre-tools/injectable-react";
import { observer } from "mobx-react";
import React from "react";
import { WithTooltip } from "../badge";
import { KubeObjectAge } from "../kube-object";
import { KubeObjectListLayout } from "../kube-object-list-layout";
import { SiblingsInTabLayout } from "../layout/siblings-in-tab-layout";
import ingressClassStoreInjectable from "./ingress-class-store.injectable";

import type { IngressClass } from "@freelensapp/kube-object";

import type { IngressClassStore } from "./ingress-class-store";

enum columnId {
  name = "name",
  namespace = "namespace",
  controller = "controller",
  apiGroup = "apiGroup",
  scope = "scope", // "Namespace" | "Cluster"
  kind = "kind", // "ClusterIngressParameter" | "IngressParameter"
  age = "age",
}

interface Dependencies {
  store: IngressClassStore;
}

const NonInjectedIngressClasses = observer((props: Dependencies) => {
  const { store } = props;

  return (
    <SiblingsInTabLayout>
      <KubeObjectListLayout
        isConfigurable
        tableId="network_ingress_classess"
        className="IngressClasses"
        store={store}
        sortingCallbacks={{
          [columnId.name]: (resource: IngressClass) => resource.getCtrlName(),
          [columnId.namespace]: (resource: IngressClass) => resource.getCtrlNs(),
          [columnId.controller]: (resource: IngressClass) => resource.getController(),
          [columnId.apiGroup]: (resource: IngressClass) => resource.getCtrlApiGroup(),
          [columnId.scope]: (resource: IngressClass) => resource.getCtrlScope(),
          [columnId.kind]: (resource: IngressClass) => resource.getCtrlKind(),
          [columnId.age]: (ingress) => -ingress.getCreationTimestamp(),
        }}
        searchFilters={[
          (resource: IngressClass) => resource.getSearchFields(),
          (resource: IngressClass) => resource.getController(),
          (resource: IngressClass) => resource.getCtrlApiGroup(),
          (resource: IngressClass) => resource.getCtrlScope(),
          (resource: IngressClass) => resource.getCtrlKind(),
        ]}
        renderHeaderTitle="Ingress Classes"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          {
            title: "Namespace",
            className: "namespace",
            sortBy: columnId.namespace,
            id: columnId.namespace,
          },
          {
            title: "Controller",
            className: "controller",
            sortBy: columnId.controller,
            id: columnId.controller,
          },
          {
            title: "API Group",
            className: "apiGroup",
            sortBy: columnId.apiGroup,
            id: columnId.apiGroup,
          },
          { title: "Scope", className: "scope", sortBy: columnId.scope, id: columnId.scope },
          { title: "Kind", className: "kind", sortBy: columnId.kind, id: columnId.kind },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
        ]}
        renderTableContents={(ingressClass: IngressClass) => [
          <div key={ingressClass.getId()} className="name">
            <WithTooltip>{ingressClass.getName()}</WithTooltip>{" "}
            {ingressClass.isDefault && (
              <Icon
                small
                material="star"
                tooltip="Is default class for ingresses (when not specified)"
                className="set_default_icon"
              />
            )}
          </div>,
          ingressClass.getCtrlNs(),
          <WithTooltip>{ingressClass.getController()}</WithTooltip>,
          <WithTooltip>{ingressClass.getCtrlApiGroup()}</WithTooltip>,
          <WithTooltip>{ingressClass.getCtrlScope()}</WithTooltip>,
          <WithTooltip>{ingressClass.getCtrlKind()}</WithTooltip>,
          <KubeObjectAge key="age" object={ingressClass} />,
        ]}
      />
    </SiblingsInTabLayout>
  );
});

export const IngressClasses = withInjectables<Dependencies>(NonInjectedIngressClasses, {
  getProps: (di, props) => ({
    ...props,
    store: di.inject(ingressClassStoreInjectable),
  }),
});
